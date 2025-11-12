package tap

import (
	"bytes"
	"crypto/ed25519"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type TAPConfig struct {
	KeyID        string
	PrivateKey   ed25519.PrivateKey
	Algorithm    SignatureAlgorithm
	RegistryURL  string
	DID          string
	VisaTAPCert  string
}

type AgentIdentity struct {
	DID             string  `json:"did"`
	VisaTAPCert     string  `json:"visaTapCert"`
	WalletAddress   string  `json:"walletAddress"`
	ReputationScore *uint32 `json:"reputationScore,omitempty"`
}

type TAPClient struct {
	config        *TAPConfig
	agentIdentity *AgentIdentity
	httpClient    *http.Client
}

func NewTAPClient(config *TAPConfig, agentIdentity *AgentIdentity) *TAPClient {
	return &TAPClient{
		config:        config,
		agentIdentity: agentIdentity,
		httpClient:    &http.Client{},
	}
}

func (c *TAPClient) SignRequest(urlStr string, method string) (map[string]string, error) {
	parsed, err := url.Parse(urlStr)
	if err != nil {
		return nil, err
	}

	components := &SignatureComponents{
		Authority: parsed.Host,
		Path:      parsed.Path,
	}

	if parsed.RawQuery != "" {
		components.Path += "?" + parsed.RawQuery
	}

	now := GetCurrentTimestamp()
	nonce, err := GenerateNonce()
	if err != nil {
		return nil, err
	}

	params := &SignatureParams{
		Created: now,
		Expires: now + 300,
		KeyID:   c.config.KeyID,
		Alg:     c.config.Algorithm,
		Nonce:   nonce,
		Tag:     "agent-payer-auth",
	}

	result, err := SignEd25519(components, params, c.config.PrivateKey)
	if err != nil {
		return nil, err
	}

	headers := map[string]string{
		"Signature-Input": result.SignatureInput,
		"Signature":       result.Signature,
	}

	if c.agentIdentity != nil {
		headers["X-Agent-DID"] = c.agentIdentity.DID
		headers["X-Agent-Cert"] = c.agentIdentity.VisaTAPCert
		headers["X-Agent-Wallet"] = c.agentIdentity.WalletAddress
	}

	return headers, nil
}

func (c *TAPClient) Request(method, urlStr string, data interface{}) (map[string]interface{}, error) {
	headers, err := c.SignRequest(urlStr, method)
	if err != nil {
		return nil, err
	}

	var body io.Reader
	if data != nil {
		jsonData, err := json.Marshal(data)
		if err != nil {
			return nil, err
		}
		body = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, urlStr, body)
	if err != nil {
		return nil, err
	}

	for key, value := range headers {
		req.Header.Set(key, value)
	}

	if data != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("request failed with status: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result, nil
}

func (c *TAPClient) RegisterAgent(walletAddress string, stake *float64) (*AgentIdentity, error) {
	if c.config.RegistryURL == "" {
		return nil, fmt.Errorf("registry URL required for agent registration")
	}

	publicKeyB64 := PublicKeyToBase64(c.config.PrivateKey.Public().(ed25519.PublicKey))

	stakeValue := 0.0
	if stake != nil {
		stakeValue = *stake
	}

	registrationData := map[string]interface{}{
		"did":           c.config.DID,
		"walletAddress": walletAddress,
		"visaTapCert":   c.config.VisaTAPCert,
		"publicKey":     publicKeyB64,
		"algorithm":     string(c.config.Algorithm),
		"stake":         stakeValue,
	}

	if c.config.DID == "" {
		registrationData["did"] = fmt.Sprintf("did:x402:%s", c.config.KeyID)
	}
	if c.config.VisaTAPCert == "" {
		registrationData["visaTapCert"] = c.config.KeyID
	}

	urlStr := fmt.Sprintf("%s/agents/register", c.config.RegistryURL)
	resp, err := c.Request("POST", urlStr, registrationData)
	if err != nil {
		return nil, err
	}

	agentData, ok := resp["agent"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid agent response")
	}

	agent := &AgentIdentity{
		DID:           agentData["did"].(string),
		VisaTAPCert:   agentData["visaTapCert"].(string),
		WalletAddress: agentData["walletAddress"].(string),
	}

	if score, ok := agentData["reputationScore"].(float64); ok {
		scoreUint := uint32(score)
		agent.ReputationScore = &scoreUint
	}

	c.agentIdentity = agent

	return agent, nil
}

func (c *TAPClient) DiscoverAgents(filters map[string]string) ([]*AgentIdentity, error) {
	if c.config.RegistryURL == "" {
		return nil, fmt.Errorf("registry URL required for agent discovery")
	}

	urlStr := fmt.Sprintf("%s/agents/discover", c.config.RegistryURL)

	if len(filters) > 0 {
		values := url.Values{}
		for key, value := range filters {
			values.Add(key, value)
		}
		urlStr += "?" + values.Encode()
	}

	resp, err := c.Request("GET", urlStr, nil)
	if err != nil {
		return nil, err
	}

	agentsData, ok := resp["agents"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid agents response")
	}

	var agents []*AgentIdentity
	for _, agentInterface := range agentsData {
		agentMap, ok := agentInterface.(map[string]interface{})
		if !ok {
			continue
		}

		agent := &AgentIdentity{
			DID:           agentMap["did"].(string),
			VisaTAPCert:   agentMap["visaTapCert"].(string),
			WalletAddress: agentMap["walletAddress"].(string),
		}

		if score, ok := agentMap["reputationScore"].(float64); ok {
			scoreUint := uint32(score)
			agent.ReputationScore = &scoreUint
		}

		agents = append(agents, agent)
	}

	return agents, nil
}

func (c *TAPClient) GetAgentIdentity() *AgentIdentity {
	return c.agentIdentity
}
