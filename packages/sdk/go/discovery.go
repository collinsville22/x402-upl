package x402

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

type ServiceDiscovery struct {
	config     DiscoveryConfig
	httpClient *http.Client
}

func NewServiceDiscovery(config DiscoveryConfig) (*ServiceDiscovery, error) {
	if config.Timeout == 0 {
		config.Timeout = 10
	}

	httpClient := &http.Client{
		Timeout: time.Duration(config.Timeout) * time.Second,
	}

	return &ServiceDiscovery{
		config:     config,
		httpClient: httpClient,
	}, nil
}

func (s *ServiceDiscovery) Discover(
	ctx context.Context,
	query *string,
	category *string,
	maxPrice *float64,
	minReputation *float64,
	minUptime *float64,
	limit int,
) ([]X402ServiceInfo, error) {
	discoveryURL := fmt.Sprintf("%s/services/discover", s.config.RegistryURL)

	params := url.Values{}
	params.Add("limit", fmt.Sprintf("%d", limit))

	if query != nil {
		params.Add("query", *query)
	}
	if category != nil {
		params.Add("category", *category)
	}
	if maxPrice != nil {
		params.Add("maxPrice", fmt.Sprintf("%.9f", *maxPrice))
	}
	if minReputation != nil {
		params.Add("minReputation", fmt.Sprintf("%.2f", *minReputation))
	}
	if minUptime != nil {
		params.Add("minUptime", fmt.Sprintf("%.2f", *minUptime))
	}

	fullURL := fmt.Sprintf("%s?%s", discoveryURL, params.Encode())

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
	if err != nil {
		return nil, NewNetworkError("failed to create discovery request", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, NewNetworkError("discovery request failed", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, NewNetworkError(fmt.Sprintf("discovery failed with status %d", resp.StatusCode), nil)
	}

	var services []X402ServiceInfo
	if err := json.NewDecoder(resp.Body).Decode(&services); err != nil {
		return nil, NewInvalidResponseError("failed to decode discovery response", err)
	}

	return services, nil
}

func (s *ServiceDiscovery) GetService(ctx context.Context, serviceID string) (*X402ServiceInfo, error) {
	serviceURL := fmt.Sprintf("%s/services/%s", s.config.RegistryURL, serviceID)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, serviceURL, nil)
	if err != nil {
		return nil, NewNetworkError("failed to create service request", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, NewNetworkError("service request failed", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, NewNetworkError(fmt.Sprintf("service request failed with status %d", resp.StatusCode), nil)
	}

	var service X402ServiceInfo
	if err := json.NewDecoder(resp.Body).Decode(&service); err != nil {
		return nil, NewInvalidResponseError("failed to decode service response", err)
	}

	return &service, nil
}
