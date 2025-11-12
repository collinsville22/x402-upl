package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/x402-upl/service/internal/config"
	"github.com/x402-upl/service/internal/routes"
	"github.com/x402-upl/service/internal/x402"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	var registryClient *x402.RegistryClient
	var heartbeatDone chan struct{}

	if cfg.AutoRegisterService && cfg.ServiceURL != "" && cfg.ServiceName != "" {
		registryClient = x402.NewRegistryClient(cfg.RegistryURL)

		registration := x402.ServiceRegistration{
			Name:           cfg.ServiceName,
			Description:    cfg.ServiceDescription,
			URL:            cfg.ServiceURL,
			Category:       cfg.ServiceCategory,
			Pricing: x402.Pricing{
				Amount:   cfg.ServicePrice,
				Currency: "CASH",
			},
			WalletAddress:  cfg.TreasuryWallet,
			Network:        cfg.Network,
			AcceptedTokens: cfg.AcceptedTokens,
			Capabilities:   cfg.ServiceCapabilities,
			Tags:           cfg.ServiceTags,
		}

		if _, err := registryClient.RegisterService(registration); err != nil {
			log.Printf("Failed to register service: %v", err)
		} else {
			heartbeatDone = make(chan struct{})
			go func() {
				ticker := time.NewTicker(60 * time.Second)
				defer ticker.Stop()

				for {
					select {
					case <-ticker.C:
						if err := registryClient.Heartbeat(); err != nil {
							log.Printf("Heartbeat failed: %v", err)
						}
					case <-heartbeatDone:
						return
					}
				}
			}()
		}
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		serviceName := cfg.ServiceName
		if serviceName == "" {
			serviceName = "x402-go-service"
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "healthy",
			"service": serviceName,
		})
	})

	mux.HandleFunc("/api/example", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			routes.HandlePost(w, r)
		case http.MethodGet:
			routes.HandleGet(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	handler := x402.X402Middleware(mux)

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	server := &http.Server{
		Addr:    addr,
		Handler: handler,
	}

	go func() {
		log.Printf("Service running on http://%s", addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down gracefully...")

	if heartbeatDone != nil {
		close(heartbeatDone)
	}

	if registryClient != nil {
		if err := registryClient.SetServiceStatus("PAUSED"); err != nil {
			log.Printf("Failed to update service status: %v", err)
		} else {
			log.Println("Service status updated to PAUSED")
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}

	log.Println("Server stopped")
}
