use serde::{Deserialize, Serialize};
use reqwest::Client;
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceRegistration {
    pub name: String,
    pub description: String,
    pub category: String,
    pub url: String,
    pub price_per_call: f64,
    pub owner_wallet_address: String,
    pub accepted_tokens: Vec<String>,
    pub capabilities: Vec<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub url: String,
    pub price_per_call: f64,
    pub owner_wallet_address: String,
    pub accepted_tokens: Vec<String>,
    pub capabilities: Vec<String>,
    pub reputation: u32,
    pub total_calls: u64,
    pub created_at: String,
    pub updated_at: String,
}

pub struct X402RegistryClient {
    registry_url: String,
    http_client: Client,
}

impl X402RegistryClient {
    pub fn new(registry_url: String) -> Self {
        Self {
            registry_url,
            http_client: Client::new(),
        }
    }

    pub async fn register_service(&self, service: ServiceRegistration) -> Result<ServiceInfo> {
        let url = format!("{}/services/register", self.registry_url);

        let response = self.http_client
            .post(&url)
            .json(&service)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Failed to register service: {}", response.status()));
        }

        let service_info: ServiceInfo = response.json().await?;

        Ok(service_info)
    }

    pub async fn update_service(&self, service_id: &str, updates: serde_json::Value) -> Result<ServiceInfo> {
        let url = format!("{}/services/{}", self.registry_url, service_id);

        let response = self.http_client
            .patch(&url)
            .json(&updates)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Failed to update service: {}", response.status()));
        }

        let service_info: ServiceInfo = response.json().await?;

        Ok(service_info)
    }

    pub async fn get_service(&self, service_id: &str) -> Result<ServiceInfo> {
        let url = format!("{}/services/{}", self.registry_url, service_id);

        let response = self.http_client
            .get(&url)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Failed to get service: {}", response.status()));
        }

        let service_info: ServiceInfo = response.json().await?;

        Ok(service_info)
    }

    pub async fn discover_services(&self, category: Option<&str>, limit: Option<usize>) -> Result<Vec<ServiceInfo>> {
        let mut url = format!("{}/services/discover", self.registry_url);

        let mut params = vec![];
        if let Some(cat) = category {
            params.push(format!("category={}", cat));
        }
        if let Some(lim) = limit {
            params.push(format!("limit={}", lim));
        }

        if !params.is_empty() {
            url.push('?');
            url.push_str(&params.join("&"));
        }

        let response = self.http_client
            .get(&url)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Failed to discover services: {}", response.status()));
        }

        let services: Vec<ServiceInfo> = response.json().await?;

        Ok(services)
    }
}
