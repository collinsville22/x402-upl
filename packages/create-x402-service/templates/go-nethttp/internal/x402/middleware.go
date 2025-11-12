package x402

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"time"
)

type PaymentRequirements struct {
	Scheme  string `json:"scheme"`
	Network string `json:"network"`
	Asset   string `json:"asset"`
	PayTo   string `json:"payTo"`
	Amount  string `json:"amount"`
	Timeout int    `json:"timeout"`
	Nonce   string `json:"nonce"`
}

type contextKey string

const PaymentVerifiedKey contextKey = "paymentVerified"

func X402Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "OPTIONS" {
			next.ServeHTTP(w, r)
			return
		}

		if r.URL.Path == "/health" {
			next.ServeHTTP(w, r)
			return
		}

		paymentHeader := r.Header.Get("x-payment")

		if paymentHeader == "" {
			requirements := PaymentRequirements{
				Scheme:  "exact",
				Network: "solana-devnet",
				Asset:   "SOL",
				PayTo:   "",
				Amount:  "0.01",
				Timeout: 120000,
				Nonce:   generateNonce(),
			}

			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Payment-Required", "true")
			w.WriteHeader(http.StatusPaymentRequired)
			json.NewEncoder(w).Encode(requirements)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func generateNonce() string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	seededRand := rand.New(rand.NewSource(time.Now().UnixNano()))
	b := make([]byte, 24)
	for i := range b {
		b[i] = charset[seededRand.Intn(len(charset))]
	}
	return string(b)
}
