use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceRegistration {
    pub name: String,
    pub description: String,
    pub url: String,
    pub category: String,
    pub pricing: Pricing,
    pub wallet_address: String,
    pub network: String,
    pub accepted_tokens: Vec<String>,
    pub capabilities: Vec<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Pricing {
    pub amount: f64,
    pub currency: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistrationResponse {
    pub service_id: String,
}

pub struct RegistryClient {
    registry_url: String,
    client: Client,
    service_id: Option<String>,
}

impl RegistryClient {
    pub fn new(registry_url: String) -> Self {
        Self {
            registry_url,
            client: Client::new(),
            service_id: None,
        }
    }

    pub async fn register_service(&mut self, registration: ServiceRegistration) -> Result<String, Box<dyn std::error::Error>> {
        let response = self
            .client
            .post(format!("{}/services/register", self.registry_url))
            .json(&registration)
            .send()
            .await?
            .json::<RegistrationResponse>()
            .await?;

        self.service_id = Some(response.service_id.clone());
        log::info!("Service registered with x402 registry: {}", response.service_id);

        Ok(response.service_id)
    }

    pub async fn set_service_status(&self, status: &str) -> Result<(), Box<dyn std::error::Error>> {
        let service_id = self.service_id.as_ref().ok_or("Service not registered")?;

        let mut body = HashMap::new();
        body.insert("status", status);

        self.client
            .patch(format!("{}/services/{}/status", self.registry_url, service_id))
            .json(&body)
            .send()
            .await?;

        log::info!("Service status updated: {} -> {}", service_id, status);
        Ok(())
    }

    pub async fn heartbeat(&self) -> Result<(), Box<dyn std::error::Error>> {
        let service_id = self.service_id.as_ref().ok_or("Service not registered")?;

        self.client
            .post(format!("{}/services/{}/heartbeat", self.registry_url, service_id))
            .send()
            .await?;

        log::debug!("Heartbeat sent to registry: {}", service_id);
        Ok(())
    }

    pub fn get_service_id(&self) -> Option<&String> {
        self.service_id.as_ref()
    }
}
