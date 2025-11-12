package x402

import (
	"time"
	"github.com/x402-upl/sdk/go/tap"
)

type PaymentRequirements struct {
	Scheme   string  `json:"scheme"`
	Network  string  `json:"network"`
	Asset    string  `json:"asset"`
	PayTo    string  `json:"payTo"`
	Amount   string  `json:"amount"`
	Timeout  int     `json:"timeout"`
	Metadata *string `json:"metadata,omitempty"`
}

type PaymentPayload struct {
	Signature string    `json:"signature"`
	Amount    string    `json:"amount"`
	From      string    `json:"from"`
	To        string    `json:"to"`
	Asset     string    `json:"asset"`
	Network   string    `json:"network"`
	Timestamp time.Time `json:"timestamp"`
}

type X402Config struct {
	Network              string
	RPCUrl               string
	RegistryAPIURL       string
	FacilitatorURL       string
	Timeout              int
	SpendingLimitPerHour float64
	EnableTAP            bool
	TAPConfig            *tap.TAPConfig
	AgentIdentity        *tap.AgentIdentity
	PreferredTokens      []string
}

func DefaultConfig() X402Config {
	return X402Config{
		Network:              "devnet",
		RPCUrl:               "https://api.devnet.solana.com",
		RegistryAPIURL:       "https://registry.x402.network",
		FacilitatorURL:       "https://facilitator.payai.network",
		Timeout:              30,
		SpendingLimitPerHour: -1, // Unlimited
		EnableTAP:            false,
		PreferredTokens:      []string{"CASH", "USDC", "SOL"},
	}
}

type PaymentMetrics struct {
	TotalSpent              float64 `json:"totalSpent"`
	TotalEarned             float64 `json:"totalEarned"`
	NetProfit               float64 `json:"netProfit"`
	TransactionCount        int     `json:"transactionCount"`
	AverageCostPerInference float64 `json:"averageCostPerInference"`
}

type PaymentRecord struct {
	Signature   string    `json:"signature"`
	Timestamp   time.Time `json:"timestamp"`
	Amount      float64   `json:"amount"`
	Asset       string    `json:"asset"`
	Type        string    `json:"type"`
	FromAddress string    `json:"fromAddress"`
	ToAddress   string    `json:"toAddress"`
}

type X402ServiceInfo struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Resource    string          `json:"resource"`
	Category    string          `json:"category"`
	Pricing     *ServicePricing `json:"pricing,omitempty"`
	Reputation  *float64        `json:"reputation,omitempty"`
	Uptime      *float64        `json:"uptime,omitempty"`
}

type ServicePricing struct {
	Amount string `json:"amount"`
	Asset  string `json:"asset"`
}

type DiscoveryConfig struct {
	RegistryURL string
	Timeout     int
}

func DefaultDiscoveryConfig() DiscoveryConfig {
	return DiscoveryConfig{
		RegistryURL: "https://registry.x402.network",
		Timeout:     10,
	}
}
