package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/gagliardetto/solana-go"
	x402 "github.com/x402-upl/x402-upl-go"
)

func main() {
	fmt.Println("x402-upl Go SDK - Simple Agent Example\n")

	wallet := solana.NewWallet()
	fmt.Printf("Generated wallet: %s\n", wallet.PublicKey().String())

	config := x402.X402Config{
		Network: "devnet",
		RPCUrl:  "https://api.devnet.solana.com",
		Timeout: 30,
	}

	client, err := x402.NewSolanaX402Client(wallet.PrivateKey, config)
	if err != nil {
		log.Fatalf("Failed to create client: %v", err)
	}

	ctx := context.Background()

	balance, err := client.GetBalance(ctx, "SOL")
	if err != nil {
		log.Fatalf("Failed to get balance: %v", err)
	}
	fmt.Printf("Wallet balance: %.9f SOL\n\n", balance)

	if balance == 0.0 {
		fmt.Println("Wallet has no balance. Fund it to test payments:")
		fmt.Printf("  solana airdrop 1 %s --url devnet\n\n", client.GetWalletAddress())
	}

	fmt.Println("Discovering x402 services...")
	discoveryConfig := x402.DefaultDiscoveryConfig()
	discovery, err := x402.NewServiceDiscovery(discoveryConfig)
	if err != nil {
		log.Fatalf("Failed to create discovery client: %v", err)
	}

	query := "AI"
	maxPrice := 0.10
	services, err := discovery.Discover(ctx, &query, nil, &maxPrice, nil, nil, 5)
	if err != nil {
		log.Fatalf("Failed to discover services: %v", err)
	}

	fmt.Printf("Found %d services:\n\n", len(services))

	for i, service := range services {
		fmt.Printf("%d. %s\n", i+1, service.Name)
		fmt.Printf("   Description: %s\n", service.Description)
		fmt.Printf("   Endpoint: %s\n", service.Resource)
		if service.Pricing != nil {
			fmt.Printf("   Price: %s %s\n", service.Pricing.Amount, service.Pricing.Asset)
		}
		fmt.Println()
	}

	if len(services) > 0 {
		service := services[0]
		fmt.Printf("Testing service: %s\n", service.Name)

		response, err := client.Get(ctx, service.Resource, nil)
		if err != nil {
			fmt.Printf("Service call failed: %v\n", err)
		} else {
			fmt.Println("Service response:")
			jsonBytes, _ := json.MarshalIndent(response, "", "  ")
			fmt.Println(string(jsonBytes))
		}
	}
}
