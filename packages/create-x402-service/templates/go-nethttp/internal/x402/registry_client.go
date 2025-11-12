package x402

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type ServiceRegistration struct {
	Name            string   `json:"name"`
	Description     string   `json:"description"`
	URL             string   `json:"url"`
	Category        string   `json:"category"`
	Pricing         Pricing  `json:"pricing"`
	WalletAddress   string   `json:"walletAddress"`
	Network         string   `json:"network"`
	AcceptedTokens  []string `json:"acceptedTokens"`
	Capabilities    []string `json:"capabilities"`
	Tags            []string `json:"tags"`
}

type Pricing struct {
	Amount   float64 `json:"amount"`
	Currency string  `json:"currency"`
}

type RegistrationResponse struct {
	ServiceID string `json:"serviceId"`
}

type RegistryClient struct {
	registryURL string
	client      *http.Client
	serviceID   string
}

func NewRegistryClient(registryURL string) *RegistryClient {
	return &RegistryClient{
		registryURL: registryURL,
		client:      &http.Client{},
	}
}

func (rc *RegistryClient) RegisterService(registration ServiceRegistration) (string, error) {
	body, err := json.Marshal(registration)
	if err != nil {
		return "", err
	}

	resp, err := rc.client.Post(
		fmt.Sprintf("%s/services/register", rc.registryURL),
		"application/json",
		bytes.NewBuffer(body),
	)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result RegistrationResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	rc.serviceID = result.ServiceID
	log.Printf("Service registered with x402 registry: %s", rc.serviceID)

	return rc.serviceID, nil
}

func (rc *RegistryClient) SetServiceStatus(status string) error {
	if rc.serviceID == "" {
		return fmt.Errorf("service not registered")
	}

	body, err := json.Marshal(map[string]string{"status": status})
	if err != nil {
		return err
	}

	req, err := http.NewRequest(
		"PATCH",
		fmt.Sprintf("%s/services/%s/status", rc.registryURL, rc.serviceID),
		bytes.NewBuffer(body),
	)
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := rc.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	log.Printf("Service status updated: %s -> %s", rc.serviceID, status)
	return nil
}

func (rc *RegistryClient) Heartbeat() error {
	if rc.serviceID == "" {
		return fmt.Errorf("service not registered")
	}

	resp, err := rc.client.Post(
		fmt.Sprintf("%s/services/%s/heartbeat", rc.registryURL, rc.serviceID),
		"application/json",
		nil,
	)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	log.Printf("Heartbeat sent to registry: %s", rc.serviceID)
	return nil
}

func (rc *RegistryClient) GetServiceID() string {
	return rc.serviceID
}
