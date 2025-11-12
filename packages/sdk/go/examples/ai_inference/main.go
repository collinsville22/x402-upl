package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gagliardetto/solana-go"
	x402 "github.com/x402-upl/x402-upl-go"
)

func main() {
	fmt.Println("x402-upl Go SDK - AI Inference Example\n")

	wallet := solana.NewWallet()

	config := x402.X402Config{
		Network: "devnet",
		RPCUrl:  "https://api.devnet.solana.com",
		Timeout: 30,
	}

	client, err := x402.NewSolanaX402Client(wallet.PrivateKey, config)
	if err != nil {
		log.Fatalf("Failed to create client: %v", err)
	}

	fmt.Printf("Wallet: %s\n", client.GetWalletAddress())

	ctx := context.Background()

	balance, err := client.GetBalance(ctx, "SOL")
	if err != nil {
		log.Fatalf("Failed to get balance: %v", err)
	}
	fmt.Printf("Balance: %.9f SOL\n\n", balance)

	if balance < 0.01 {
		fmt.Println("Error: Insufficient balance for testing")
		fmt.Println("Fund your wallet:")
		fmt.Printf("  solana airdrop 1 %s --url devnet\n", client.GetWalletAddress())
		os.Exit(1)
	}

	fmt.Println("Finding AI inference service...")
	discoveryConfig := x402.DefaultDiscoveryConfig()
	discovery, err := x402.NewServiceDiscovery(discoveryConfig)
	if err != nil {
		log.Fatalf("Failed to create discovery client: %v", err)
	}

	query := "inference"
	category := "AI & ML"
	maxPrice := 0.05
	minReputation := 0.7
	services, err := discovery.Discover(ctx, &query, &category, &maxPrice, &minReputation, nil, 1)
	if err != nil {
		log.Fatalf("Failed to discover services: %v", err)
	}

	if len(services) == 0 {
		fmt.Println("No inference services found")
		os.Exit(1)
	}

	service := services[0]
	fmt.Printf("Using service: %s\n", service.Name)

	if service.Pricing != nil {
		fmt.Printf("Price: %s %s\n\n", service.Pricing.Amount, service.Pricing.Asset)
	}

	prompts := []string{
		"Explain quantum computing in simple terms",
		"What are the top 3 programming languages in 2024?",
		"How does blockchain work?",
	}

	for i, prompt := range prompts {
		fmt.Printf("%d. Query: %s\n", i+1, prompt)
		fmt.Println("============================================================")

		requestBody := map[string]interface{}{
			"messages": []map[string]string{
				{"role": "user", "content": prompt},
			},
			"model": "llama-3.1-8b",
		}

		result, err := client.Post(ctx, service.Resource, requestBody, nil)
		if err != nil {
			fmt.Printf("Inference failed: %v\n\n", err)
			continue
		}

		resultMap, ok := result.(map[string]interface{})
		if ok {
			if choices, hasChoices := resultMap["choices"].([]interface{}); hasChoices && len(choices) > 0 {
				if firstChoice, ok := choices[0].(map[string]interface{}); ok {
					if message, hasMessage := firstChoice["message"].(map[string]interface{}); hasMessage {
						if content, hasContent := message["content"].(string); hasContent {
							fmt.Printf("\nResponse:\n%s\n", content)
						}
					}
				}
			}

			if usage, hasUsage := resultMap["usage"].(map[string]interface{}); hasUsage {
				if tokens, hasTokens := usage["total_tokens"]; hasTokens {
					fmt.Printf("Tokens used: %v\n\n", tokens)
				}
			}
		}

		time.Sleep(1 * time.Second)
	}

	finalBalance, err := client.GetBalance(ctx, "SOL")
	if err != nil {
		log.Fatalf("Failed to get final balance: %v", err)
	}

	fmt.Println("============================================================")
	fmt.Printf("Final balance: %.9f SOL\n", finalBalance)
	fmt.Printf("Total spent: %.9f SOL\n", balance-finalBalance)
}
