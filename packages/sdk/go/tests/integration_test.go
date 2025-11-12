package x402_test

import (
	"context"
	"testing"
	"time"

	"github.com/gagliardetto/solana-go"
	x402 "github.com/x402-upl/x402-upl-go"
)

func TestClientCreation(t *testing.T) {
	wallet := solana.NewWallet()

	config := x402.X402Config{
		Network: "devnet",
		RPCUrl:  "https://api.devnet.solana.com",
		Timeout: 30,
	}

	client, err := x402.NewSolanaX402Client(wallet.PrivateKey, config)
	if err != nil {
		t.Fatalf("Failed to create client: %v", err)
	}

	if client == nil {
		t.Fatal("Client is nil")
	}

	walletAddress := client.GetWalletAddress()
	if walletAddress == "" {
		t.Fatal("Wallet address is empty")
	}

	if walletAddress != wallet.PublicKey().String() {
		t.Fatalf("Wallet address mismatch: got %s, want %s", walletAddress, wallet.PublicKey().String())
	}
}

func TestGetBalance(t *testing.T) {
	wallet := solana.NewWallet()

	config := x402.X402Config{
		Network: "devnet",
		RPCUrl:  "https://api.devnet.solana.com",
		Timeout: 30,
	}

	client, err := x402.NewSolanaX402Client(wallet.PrivateKey, config)
	if err != nil {
		t.Fatalf("Failed to create client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	balance, err := client.GetBalance(ctx, "SOL")
	if err != nil {
		t.Fatalf("Failed to get balance: %v", err)
	}

	if balance < 0 {
		t.Fatalf("Invalid balance: %f", balance)
	}
}

func TestServiceDiscovery(t *testing.T) {
	config := x402.DefaultDiscoveryConfig()

	discovery, err := x402.NewServiceDiscovery(config)
	if err != nil {
		t.Fatalf("Failed to create discovery client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	query := "AI"
	services, err := discovery.Discover(ctx, &query, nil, nil, nil, nil, 10)
	if err != nil {
		t.Fatalf("Failed to discover services: %v", err)
	}

	if len(services) == 0 {
		t.Skip("No services found (registry might be empty)")
	}

	service := services[0]
	if service.ID == "" {
		t.Error("Service ID is empty")
	}
	if service.Name == "" {
		t.Error("Service name is empty")
	}
	if service.Resource == "" {
		t.Error("Service resource is empty")
	}
}

func TestServiceDiscoveryWithFilters(t *testing.T) {
	config := x402.DefaultDiscoveryConfig()

	discovery, err := x402.NewServiceDiscovery(config)
	if err != nil {
		t.Fatalf("Failed to create discovery client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	query := "inference"
	category := "AI & ML"
	maxPrice := 0.1
	minReputation := 0.5

	services, err := discovery.Discover(ctx, &query, &category, &maxPrice, &minReputation, nil, 5)
	if err != nil {
		t.Fatalf("Failed to discover services: %v", err)
	}

	for _, service := range services {
		if service.Pricing != nil {
			if service.Pricing.Amount == "" {
				t.Error("Service pricing amount is empty")
			}
			if service.Pricing.Asset == "" {
				t.Error("Service pricing asset is empty")
			}
		}
	}
}

func TestGetService(t *testing.T) {
	config := x402.DefaultDiscoveryConfig()

	discovery, err := x402.NewServiceDiscovery(config)
	if err != nil {
		t.Fatalf("Failed to create discovery client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	services, err := discovery.Discover(ctx, nil, nil, nil, nil, nil, 1)
	if err != nil {
		t.Fatalf("Failed to discover services: %v", err)
	}

	if len(services) == 0 {
		t.Skip("No services available for testing")
	}

	serviceID := services[0].ID

	service, err := discovery.GetService(ctx, serviceID)
	if err != nil {
		t.Fatalf("Failed to get service: %v", err)
	}

	if service.ID != serviceID {
		t.Errorf("Service ID mismatch: got %s, want %s", service.ID, serviceID)
	}
}

func TestInvalidNetwork(t *testing.T) {
	wallet := solana.NewWallet()

	config := x402.X402Config{
		Network: "invalid",
		Timeout: 30,
	}

	_, err := x402.NewSolanaX402Client(wallet.PrivateKey, config)
	if err == nil {
		t.Fatal("Expected error for invalid network, got nil")
	}
}

func TestDefaultConfig(t *testing.T) {
	config := x402.DefaultConfig()

	if config.Network != "devnet" {
		t.Errorf("Expected default network to be devnet, got %s", config.Network)
	}

	if config.RPCUrl != "https://api.devnet.solana.com" {
		t.Errorf("Expected default RPC URL for devnet, got %s", config.RPCUrl)
	}

	if config.Timeout != 30 {
		t.Errorf("Expected default timeout to be 30, got %d", config.Timeout)
	}
}
