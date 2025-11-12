package x402

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/associated-token-account"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
)

var (
	CashMint         = solana.MustPublicKeyFromBase58("CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH")
	CashDecimals     = uint8(6)
	TokenProgramID   = solana.TokenProgramID
	Token2022Program = solana.MustPublicKeyFromBase58("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb")
)

type SolanaX402Client struct {
	wallet         solana.PrivateKey
	rpcClient      *rpc.Client
	httpClient     *http.Client
	config         X402Config
	metrics        PaymentMetrics
	paymentHistory []PaymentRecord
	hourlySpending map[int64]float64
}

func NewSolanaX402Client(wallet solana.PrivateKey, config X402Config) (*SolanaX402Client, error) {
	if config.RPCUrl == "" {
		if config.Network == "mainnet-beta" {
			config.RPCUrl = "https://api.mainnet-beta.solana.com"
		} else if config.Network == "devnet" {
			config.RPCUrl = "https://api.devnet.solana.com"
		} else if config.Network == "testnet" {
			config.RPCUrl = "https://api.testnet.solana.com"
		} else {
			return nil, NewValidationError("invalid network")
		}
	}

	if config.Timeout == 0 {
		config.Timeout = 30
	}

	rpcClient := rpc.New(config.RPCUrl)
	httpClient := &http.Client{
		Timeout: time.Duration(config.Timeout) * time.Second,
	}

	return &SolanaX402Client{
		wallet:         wallet,
		rpcClient:      rpcClient,
		httpClient:     httpClient,
		config:         config,
		metrics:        PaymentMetrics{},
		paymentHistory: make([]PaymentRecord, 0),
		hourlySpending: make(map[int64]float64),
	}, nil
}

func (c *SolanaX402Client) Get(ctx context.Context, url string, params map[string]string) (interface{}, error) {
	return c.request(ctx, http.MethodGet, url, nil, params)
}

func (c *SolanaX402Client) Post(ctx context.Context, url string, data interface{}, params map[string]string) (interface{}, error) {
	return c.request(ctx, http.MethodPost, url, data, params)
}

func (c *SolanaX402Client) request(ctx context.Context, method, url string, data interface{}, params map[string]string) (interface{}, error) {
	var body io.Reader
	if data != nil {
		jsonData, err := json.Marshal(data)
		if err != nil {
			return nil, NewValidationError(fmt.Sprintf("failed to marshal request data: %v", err))
		}
		body = bytes.NewReader(jsonData)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, NewNetworkError("failed to create request", err)
	}

	if data != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	if params != nil {
		q := req.URL.Query()
		for k, v := range params {
			q.Add(k, v)
		}
		req.URL.RawQuery = q.Encode()
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, NewNetworkError("request failed", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusPaymentRequired {
		if resp.StatusCode >= 400 {
			bodyBytes, _ := io.ReadAll(resp.Body)
			return nil, NewNetworkError(fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(bodyBytes)), nil)
		}

		var result interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return nil, NewInvalidResponseError("failed to decode response", err)
		}
		return result, nil
	}

	var requirements PaymentRequirements
	if err := json.NewDecoder(resp.Body).Decode(&requirements); err != nil {
		return nil, NewInvalidResponseError("failed to decode payment requirements", err)
	}

	if requirements.Scheme != "solana" {
		return nil, NewValidationError(fmt.Sprintf("unsupported payment scheme: %s", requirements.Scheme))
	}

	paymentHeader, err := c.createPayment(ctx, &requirements)
	if err != nil {
		return nil, err
	}

	if data != nil {
		jsonData, _ := json.Marshal(data)
		body = bytes.NewReader(jsonData)
	}

	retryReq, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, NewNetworkError("failed to create retry request", err)
	}

	if data != nil {
		retryReq.Header.Set("Content-Type", "application/json")
	}
	retryReq.Header.Set("X-Payment", paymentHeader)

	if params != nil {
		q := retryReq.URL.Query()
		for k, v := range params {
			q.Add(k, v)
		}
		retryReq.URL.RawQuery = q.Encode()
	}

	retryResp, err := c.httpClient.Do(retryReq)
	if err != nil {
		return nil, NewNetworkError("retry request failed", err)
	}
	defer retryResp.Body.Close()

	if retryResp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(retryResp.Body)
		return nil, NewNetworkError(fmt.Sprintf("HTTP %d: %s", retryResp.StatusCode, string(bodyBytes)), nil)
	}

	var result interface{}
	if err := json.NewDecoder(retryResp.Body).Decode(&result); err != nil {
		return nil, NewInvalidResponseError("failed to decode retry response", err)
	}

	return result, nil
}

func (c *SolanaX402Client) createPayment(ctx context.Context, requirements *PaymentRequirements) (string, error) {
	recipientPubkey, err := solana.PublicKeyFromBase58(requirements.PayTo)
	if err != nil {
		return "", NewValidationError(fmt.Sprintf("invalid recipient address: %v", err))
	}

	amount, err := strconv.ParseFloat(requirements.Amount, 64)
	if err != nil {
		return "", NewValidationError(fmt.Sprintf("invalid amount: %v", err))
	}

	c.trackPayment(amount, "sent", requirements.PayTo)

	balance, err := c.GetBalance(ctx, "SOL")
	if err != nil {
		return "", err
	}

	if balance < amount {
		return "", NewInsufficientBalanceError(fmt.Sprintf("insufficient balance: have %.9f, need %.9f", balance, amount))
	}

	var signature string
	if requirements.Asset == "SOL" {
		signature, err = c.sendSOLPayment(ctx, recipientPubkey, amount)
	} else {
		signature, err = c.sendSPLPayment(ctx, recipientPubkey, requirements.Asset, amount)
	}

	if err != nil {
		return "", NewPaymentFailedError("payment transaction failed", err)
	}

	payload := PaymentPayload{
		Signature: signature,
		Amount:    requirements.Amount,
		From:      c.wallet.PublicKey().String(),
		To:        requirements.PayTo,
		Asset:     requirements.Asset,
		Network:   requirements.Network,
		Timestamp: time.Now(),
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return "", NewValidationError(fmt.Sprintf("failed to marshal payment payload: %v", err))
	}

	return base64.StdEncoding.EncodeToString(payloadJSON), nil
}

func (c *SolanaX402Client) sendSOLPayment(ctx context.Context, recipient solana.PublicKey, amount float64) (string, error) {
	lamports := uint64(amount * 1_000_000_000)

	recent, err := c.rpcClient.GetRecentBlockhash(ctx, rpc.CommitmentFinalized)
	if err != nil {
		return "", NewSolanaError("failed to get recent blockhash", err)
	}

	instruction := system.NewTransferInstruction(
		lamports,
		c.wallet.PublicKey(),
		recipient,
	).Build()

	tx, err := solana.NewTransaction(
		[]solana.Instruction{instruction},
		recent.Value.Blockhash,
		solana.TransactionPayer(c.wallet.PublicKey()),
	)
	if err != nil {
		return "", NewSolanaError("failed to create transaction", err)
	}

	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(c.wallet.PublicKey()) {
			return &c.wallet
		}
		return nil
	})
	if err != nil {
		return "", NewSolanaError("failed to sign transaction", err)
	}

	sig, err := c.rpcClient.SendTransactionWithOpts(ctx, tx, rpc.TransactionOpts{
		SkipPreflight:       false,
		PreflightCommitment: rpc.CommitmentFinalized,
	})
	if err != nil {
		return "", NewSolanaError("failed to send transaction", err)
	}

	_, err = c.rpcClient.ConfirmTransaction(ctx, sig, rpc.CommitmentFinalized)
	if err != nil {
		return "", NewSolanaError("transaction confirmation failed", err)
	}

	return sig.String(), nil
}

func (c *SolanaX402Client) sendSPLPayment(ctx context.Context, recipient solana.PublicKey, tokenMint string, amount float64) (string, error) {
	mint, err := solana.PublicKeyFromBase58(tokenMint)
	if err != nil {
		return "", NewValidationError(fmt.Sprintf("invalid token mint: %v", err))
	}

	isCash := mint.Equals(CashMint)
	programID := TokenProgramID
	if isCash {
		programID = Token2022Program
	}

	decimals := CashDecimals
	mintInfo, err := c.rpcClient.GetAccountInfo(ctx, mint)
	if err == nil && mintInfo != nil && mintInfo.Value != nil {
		if len(mintInfo.Value.Data.GetBinary()) >= 44 {
			decimals = mintInfo.Value.Data.GetBinary()[44]
		}
	}

	tokenAmount := uint64(amount * float64(1<<decimals))

	fromATA, _, err := solana.FindAssociatedTokenAddress(
		c.wallet.PublicKey(),
		mint,
	)
	if err != nil {
		return "", NewValidationError(fmt.Sprintf("failed to derive source ATA: %v", err))
	}

	toATA, _, err := solana.FindAssociatedTokenAddress(
		recipient,
		mint,
	)
	if err != nil {
		return "", NewValidationError(fmt.Sprintf("failed to derive destination ATA: %v", err))
	}

	recent, err := c.rpcClient.GetRecentBlockhash(ctx, rpc.CommitmentFinalized)
	if err != nil {
		return "", NewSolanaError("failed to get recent blockhash", err)
	}

	instructions := []solana.Instruction{}

	toAccountInfo, err := c.rpcClient.GetAccountInfo(ctx, toATA)
	if err != nil || toAccountInfo == nil || toAccountInfo.Value == nil {
		createATAIx := associatedtokenaccount.NewCreateInstruction(
			c.wallet.PublicKey(),
			recipient,
			mint,
		).Build()
		instructions = append(instructions, createATAIx)
	}

	transferIx := token.NewTransferInstruction(
		tokenAmount,
		fromATA,
		toATA,
		c.wallet.PublicKey(),
		[]solana.PublicKey{},
	).Build()
	instructions = append(instructions, transferIx)

	tx, err := solana.NewTransaction(
		instructions,
		recent.Value.Blockhash,
		solana.TransactionPayer(c.wallet.PublicKey()),
	)
	if err != nil {
		return "", NewSolanaError("failed to create transaction", err)
	}

	_, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
		if key.Equals(c.wallet.PublicKey()) {
			return &c.wallet
		}
		return nil
	})
	if err != nil {
		return "", NewSolanaError("failed to sign transaction", err)
	}

	sig, err := c.rpcClient.SendTransactionWithOpts(ctx, tx, rpc.TransactionOpts{
		SkipPreflight:       false,
		PreflightCommitment: rpc.CommitmentFinalized,
	})
	if err != nil {
		return "", NewSolanaError("failed to send transaction", err)
	}

	_, err = c.rpcClient.ConfirmTransaction(ctx, sig, rpc.CommitmentFinalized)
	if err != nil {
		return "", NewSolanaError("transaction confirmation failed", err)
	}

	return sig.String(), nil
}

func (c *SolanaX402Client) GetBalance(ctx context.Context, currency string) (float64, error) {
	if currency == "SOL" {
		balance, err := c.rpcClient.GetBalance(ctx, c.wallet.PublicKey(), rpc.CommitmentFinalized)
		if err != nil {
			return 0, NewSolanaError("failed to get SOL balance", err)
		}
		return float64(balance.Value) / 1_000_000_000, nil
	}

	var mint solana.PublicKey
	if currency == "CASH" {
		mint = CashMint
	} else {
		var err error
		mint, err = solana.PublicKeyFromBase58(currency)
		if err != nil {
			return 0, NewValidationError(fmt.Sprintf("invalid token mint: %v", err))
		}
	}

	decimals := CashDecimals
	mintInfo, err := c.rpcClient.GetAccountInfo(ctx, mint)
	if err == nil && mintInfo != nil && mintInfo.Value != nil {
		if len(mintInfo.Value.Data.GetBinary()) >= 44 {
			decimals = mintInfo.Value.Data.GetBinary()[44]
		}
	}

	ata, _, err := solana.FindAssociatedTokenAddress(
		c.wallet.PublicKey(),
		mint,
	)
	if err != nil {
		return 0, NewValidationError(fmt.Sprintf("failed to derive ATA: %v", err))
	}

	accountInfo, err := c.rpcClient.GetAccountInfo(ctx, ata)
	if err != nil || accountInfo == nil || accountInfo.Value == nil {
		return 0, nil
	}

	data := accountInfo.Value.Data.GetBinary()
	if len(data) < 72 {
		return 0, nil
	}

	tokenAmount := uint64(data[64]) |
		uint64(data[65])<<8 |
		uint64(data[66])<<16 |
		uint64(data[67])<<24 |
		uint64(data[68])<<32 |
		uint64(data[69])<<40 |
		uint64(data[70])<<48 |
		uint64(data[71])<<56

	return float64(tokenAmount) / float64(1<<decimals), nil
}

func (c *SolanaX402Client) GetWalletAddress() string {
	return c.wallet.PublicKey().String()
}

func (c *SolanaX402Client) GetMetrics() PaymentMetrics {
	return c.metrics
}

func (c *SolanaX402Client) GetPaymentHistory(limit int) []PaymentRecord {
	history := make([]PaymentRecord, len(c.paymentHistory))
	copy(history, c.paymentHistory)

	// Reverse to get newest first
	for i, j := 0, len(history)-1; i < j; i, j = i+1, j-1 {
		history[i], history[j] = history[j], history[i]
	}

	if limit > 0 && limit < len(history) {
		return history[:limit]
	}
	return history
}

func (c *SolanaX402Client) FetchPaymentHistory(ctx context.Context, limit int) ([]PaymentRecord, error) {
	sigs, err := c.rpcClient.GetSignaturesForAddress(ctx, c.wallet.PublicKey())
	if err != nil {
		return nil, NewSolanaError("failed to fetch signatures", err)
	}

	records := make([]PaymentRecord, 0)
	count := 0

	for _, sigInfo := range sigs {
		if limit > 0 && count >= limit {
			break
		}

		tx, err := c.rpcClient.GetTransaction(ctx, sigInfo.Signature, &rpc.GetTransactionOpts{
			MaxSupportedTransactionVersion: new(uint64),
		})
		if err != nil || tx == nil || tx.Meta == nil {
			continue
		}

		preBalance := uint64(0)
		postBalance := uint64(0)
		if len(tx.Meta.PreBalances) > 0 {
			preBalance = tx.Meta.PreBalances[0]
		}
		if len(tx.Meta.PostBalances) > 0 {
			postBalance = tx.Meta.PostBalances[0]
		}

		diff := float64(int64(postBalance)-int64(preBalance)) / 1_000_000_000

		if diff != 0 {
			recordType := "received"
			if diff < 0 {
				recordType = "sent"
				diff = -diff
			}

			timestamp := time.Now()
			if sigInfo.BlockTime != nil {
				timestamp = sigInfo.BlockTime.Time()
			}

			records = append(records, PaymentRecord{
				Signature:   sigInfo.Signature.String(),
				Timestamp:   timestamp,
				Amount:      diff,
				Asset:       "SOL",
				Type:        recordType,
				FromAddress: c.wallet.PublicKey().String(),
				ToAddress:   "",
			})
			count++
		}
	}

	return records, nil
}

func (c *SolanaX402Client) GetSpentThisHour() float64 {
	currentHour := time.Now().Unix() / 3600
	return c.hourlySpending[currentHour]
}

func (c *SolanaX402Client) GetRemainingHourlyBudget() float64 {
	if c.config.SpendingLimitPerHour < 0 {
		return -1 // Unlimited
	}
	spent := c.GetSpentThisHour()
	remaining := c.config.SpendingLimitPerHour - spent
	if remaining < 0 {
		return 0
	}
	return remaining
}

func (c *SolanaX402Client) trackPayment(amount float64, paymentType string, counterparty string) {
	currentHour := time.Now().Unix() / 3600

	if paymentType == "sent" {
		c.metrics.TotalSpent += amount
		c.hourlySpending[currentHour] = c.hourlySpending[currentHour] + amount
	} else {
		c.metrics.TotalEarned += amount
	}

	c.metrics.NetProfit = c.metrics.TotalEarned - c.metrics.TotalSpent
	c.metrics.TransactionCount++
	if c.metrics.TransactionCount > 0 {
		c.metrics.AverageCostPerInference = c.metrics.TotalSpent / float64(c.metrics.TransactionCount)
	}

	fromAddr := c.wallet.PublicKey().String()
	toAddr := counterparty
	if paymentType == "received" {
		fromAddr = counterparty
		toAddr = c.wallet.PublicKey().String()
	}

	c.paymentHistory = append(c.paymentHistory, PaymentRecord{
		Signature:   "",
		Timestamp:   time.Now(),
		Amount:      amount,
		Asset:       "SOL",
		Type:        paymentType,
		FromAddress: fromAddr,
		ToAddress:   toAddr,
	})

	c.cleanupOldHourlyData()
}

func (c *SolanaX402Client) cleanupOldHourlyData() {
	currentHour := time.Now().Unix() / 3600
	cutoffHour := currentHour - 24

	for hour := range c.hourlySpending {
		if hour < cutoffHour {
			delete(c.hourlySpending, hour)
		}
	}
}

func (c *SolanaX402Client) RecordEarnings(amount float64, fromAddress string) {
	c.trackPayment(amount, "received", fromAddress)
}
