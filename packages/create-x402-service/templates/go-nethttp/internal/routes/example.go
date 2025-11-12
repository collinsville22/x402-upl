package routes

import (
	"encoding/json"
	"net/http"
)

type ExampleRequest struct {
	Data interface{} `json:"data"`
}

type ExampleResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

func HandlePost(w http.ResponseWriter, r *http.Request) {
	var req ExampleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := ExampleResponse{
		Success: true,
		Message: "Request processed successfully",
		Data: map[string]interface{}{
			"input":           req.Data,
			"paymentVerified": true,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func HandleGet(w http.ResponseWriter, r *http.Request) {
	response := ExampleResponse{
		Success: true,
		Message: "GET request processed",
		Data: map[string]interface{}{
			"paymentVerified": true,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
