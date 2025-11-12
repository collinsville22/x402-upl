use crate::error::Result;
use crate::types::X402ServiceInfo;
use reqwest::Client;
use serde_json::Value;

#[derive(Debug, Clone)]
pub struct DiscoveryConfig {
    pub registry_url: String,
    pub timeout: u64,
}

impl Default for DiscoveryConfig {
    fn default() -> Self {
        Self {
            registry_url: "https://registry.x402.network".to_string(),
            timeout: 10,
        }
    }
}

pub use X402ServiceInfo as X402Service;

pub struct ServiceDiscovery {
    config: DiscoveryConfig,
    client: Client,
}

impl ServiceDiscovery {
    pub fn new(config: DiscoveryConfig) -> Result<Self> {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(config.timeout))
            .build()?;

        Ok(Self { config, client })
    }

    pub async fn discover(
        &self,
        query: Option<&str>,
        category: Option<&str>,
        max_price: Option<f64>,
        min_reputation: Option<f64>,
        min_uptime: Option<f64>,
        limit: usize,
    ) -> Result<Vec<X402Service>> {
        let mut url = format!("{}/services/discover", self.config.registry_url);
        let mut params = vec![("limit", limit.to_string())];

        if let Some(q) = query {
            params.push(("query", q.to_string()));
        }
        if let Some(c) = category {
            params.push(("category", c.to_string()));
        }
        if let Some(p) = max_price {
            params.push(("maxPrice", p.to_string()));
        }
        if let Some(r) = min_reputation {
            params.push(("minReputation", r.to_string()));
        }
        if let Some(u) = min_uptime {
            params.push(("minUptime", u.to_string()));
        }

        let response = self.client.get(&url).query(&params).send().await?;

        response.error_for_status_ref()?;

        let services: Vec<X402Service> = response.json().await?;

        Ok(services)
    }

    pub async fn get_service(&self, service_id: &str) -> Result<X402Service> {
        let url = format!("{}/services/{}", self.config.registry_url, service_id);

        let response = self.client.get(&url).send().await?;

        response.error_for_status_ref()?;

        let service: X402Service = response.json().await?;

        Ok(service)
    }
}
