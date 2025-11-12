package x402

import (
	"github.com/gagliardetto/solana-go"
	"github.com/x402-upl/sdk/go/tap"
)

type X402Client struct {
	wallet        solana.PrivateKey
	solanaClient  *SolanaX402Client
	discovery     *ServiceDiscovery
	tapClient     *tap.TAPClient
	config        X402Config
}

func NewX402Client(wallet solana.PrivateKey, config X402Config) (*X402Client, error) {
	solanaClient, err := NewSolanaX402Client(wallet, config)
	if err != nil {
		return nil, err
	}

	discovery := NewServiceDiscovery(config.RegistryAPIURL)

	var tapClient *tap.TAPClient
	if config.EnableTAP && config.TAPConfig != nil {
		tapClient = tap.NewTAPClient(config.TAPConfig, config.AgentIdentity)
	}

	return &X402Client{
		wallet:       wallet,
		solanaClient: solanaClient,
		discovery:    discovery,
		tapClient:    tapClient,
		config:       config,
	}, nil
}

func (c *X402Client) Discover(options map[string]interface{}) ([]X402Service, error) {
	return c.discovery.Discover(options)
}

func (c *X402Client) GetService(serviceID string) (*X402Service, error) {
	return c.discovery.GetService(serviceID)
}

func (c *X402Client) Get(url string, params map[string]string) (interface{}, error) {
	return c.solanaClient.Get(url, params)
}

func (c *X402Client) Post(url string, data interface{}, params map[string]string) (interface{}, error) {
	return c.solanaClient.Post(url, data, params)
}

func (c *X402Client) RegisterAgent(stake *float64) (*tap.AgentIdentity, error) {
	if c.tapClient == nil {
		return nil, NewValidationError("TAP must be enabled to register as an agent")
	}

	walletAddress := c.wallet.PublicKey().String()
	return c.tapClient.RegisterAgent(walletAddress, stake)
}

func (c *X402Client) DiscoverAgents(filters map[string]string) ([]*tap.AgentIdentity, error) {
	if c.tapClient == nil {
		return nil, NewValidationError("TAP must be enabled to discover agents")
	}

	return c.tapClient.DiscoverAgents(filters)
}

func (c *X402Client) GetAgentIdentity() *tap.AgentIdentity {
	if c.tapClient == nil {
		return nil
	}
	return c.tapClient.GetAgentIdentity()
}

func (c *X402Client) GetTAPClient() *tap.TAPClient {
	return c.tapClient
}

func (c *X402Client) GetWallet() solana.PrivateKey {
	return c.wallet
}

func (c *X402Client) GetWalletAddress() string {
	return c.wallet.PublicKey().String()
}

func (c *X402Client) GetNetwork() string {
	return c.config.Network
}

func (c *X402Client) GetMetrics() PaymentMetrics {
	return c.solanaClient.metrics
}

func (c *X402Client) GetPaymentHistory(limit int) []PaymentRecord {
	if limit <= 0 || limit > len(c.solanaClient.paymentHistory) {
		return c.solanaClient.paymentHistory
	}
	return c.solanaClient.paymentHistory[len(c.solanaClient.paymentHistory)-limit:]
}
