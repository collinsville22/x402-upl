package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Host string
	Port int

	Network        string
	TreasuryWallet string
	RedisURL       string

	EnableTAP    bool
	RegistryURL  string

	AutoRegisterService bool
	ServiceURL          string
	ServiceName         string
	ServiceDescription  string
	ServiceCategory     string
	ServicePrice        float64
	AcceptedTokens      []string
	ServiceCapabilities []string
	ServiceTags         []string
}

func Load() (*Config, error) {
	godotenv.Load()

	port, _ := strconv.Atoi(getEnv("PORT", "8080"))
	servicePrice, _ := strconv.ParseFloat(getEnv("SERVICE_PRICE", "0.01"), 64)

	acceptedTokens := strings.Split(getEnv("ACCEPTED_TOKENS", "CASH,USDC,SOL"), ",")
	for i := range acceptedTokens {
		acceptedTokens[i] = strings.TrimSpace(acceptedTokens[i])
	}

	serviceCapabilities := []string{}
	if caps := getEnv("SERVICE_CAPABILITIES", ""); caps != "" {
		serviceCapabilities = strings.Split(caps, ",")
		for i := range serviceCapabilities {
			serviceCapabilities[i] = strings.TrimSpace(serviceCapabilities[i])
		}
	}

	serviceTags := []string{}
	if tags := getEnv("SERVICE_TAGS", ""); tags != "" {
		serviceTags = strings.Split(tags, ",")
		for i := range serviceTags {
			serviceTags[i] = strings.TrimSpace(serviceTags[i])
		}
	}

	return &Config{
		Host: getEnv("HOST", "0.0.0.0"),
		Port: port,

		Network:        getEnv("NETWORK", "devnet"),
		TreasuryWallet: os.Getenv("TREASURY_WALLET"),
		RedisURL:       getEnv("REDIS_URL", "redis://localhost:6379"),

		EnableTAP:   getEnv("ENABLE_TAP", "false") == "true",
		RegistryURL: getEnv("REGISTRY_URL", "https://registry.x402.network"),

		AutoRegisterService: getEnv("AUTO_REGISTER_SERVICE", "false") == "true",
		ServiceURL:          getEnv("SERVICE_URL", ""),
		ServiceName:         getEnv("SERVICE_NAME", ""),
		ServiceDescription:  getEnv("SERVICE_DESCRIPTION", ""),
		ServiceCategory:     getEnv("SERVICE_CATEGORY", "API"),
		ServicePrice:        servicePrice,
		AcceptedTokens:      acceptedTokens,
		ServiceCapabilities: serviceCapabilities,
		ServiceTags:         serviceTags,
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
