use ed25519_dalek::Keypair;
use reqwest::{Client, Method, Response};
use serde_json::Value;
use std::collections::HashMap;
use url::Url;

use super::rfc9421::{RFC9421Signature, SignatureAlgorithm, SignatureComponents, SignatureParams};
use crate::error::X402Error;

#[derive(Debug, Clone)]
pub struct TAPConfig {
    pub key_id: String,
    pub keypair: Keypair,
    pub algorithm: SignatureAlgorithm,
    pub registry_url: Option<String>,
    pub did: Option<String>,
    pub visa_tap_cert: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AgentIdentity {
    pub did: String,
    pub visa_tap_cert: String,
    pub wallet_address: String,
    pub reputation_score: Option<u32>,
}

pub struct TAPClient {
    config: TAPConfig,
    agent_identity: Option<AgentIdentity>,
    http_client: Client,
}

impl TAPClient {
    pub fn new(config: TAPConfig, agent_identity: Option<AgentIdentity>) -> Self {
        Self {
            config,
            agent_identity,
            http_client: Client::new(),
        }
    }

    pub fn sign_request(&self, url: &str, method: &str) -> Result<HashMap<String, String>, X402Error> {
        let parsed = Url::parse(url).map_err(|e| X402Error::Network(e.to_string()))?;

        let components = SignatureComponents {
            authority: parsed.host_str().unwrap_or("").to_string(),
            path: format!("{}{}", parsed.path(), parsed.query().map(|q| format!("?{}", q)).unwrap_or_default()),
        };

        let now = RFC9421Signature::get_current_timestamp();
        let params = SignatureParams {
            created: now,
            expires: now + 300,
            key_id: self.config.key_id.clone(),
            alg: self.config.algorithm.clone(),
            nonce: RFC9421Signature::generate_nonce(),
            tag: "agent-payer-auth".to_string(),
        };

        let result = RFC9421Signature::sign_ed25519(&components, &params, &self.config.keypair);

        let mut headers = HashMap::new();
        headers.insert("Signature-Input".to_string(), result.signature_input);
        headers.insert("Signature".to_string(), result.signature);

        if let Some(ref identity) = self.agent_identity {
            headers.insert("X-Agent-DID".to_string(), identity.did.clone());
            headers.insert("X-Agent-Cert".to_string(), identity.visa_tap_cert.clone());
            headers.insert("X-Agent-Wallet".to_string(), identity.wallet_address.clone());
        }

        Ok(headers)
    }

    pub async fn request(
        &self,
        method: Method,
        url: &str,
        data: Option<Value>,
    ) -> Result<Value, X402Error> {
        let headers = self.sign_request(url, method.as_str())?;

        let mut request = self.http_client.request(method, url);

        for (key, value) in headers {
            request = request.header(key, value);
        }

        if let Some(body) = data {
            request = request.json(&body);
        }

        let response = request
            .send()
            .await
            .map_err(|e| X402Error::Network(e.to_string()))?;

        if !response.status().is_success() {
            return Err(X402Error::Network(format!(
                "Request failed with status: {}",
                response.status()
            )));
        }

        response
            .json()
            .await
            .map_err(|e| X402Error::Network(e.to_string()))
    }

    pub async fn register_agent(
        &mut self,
        wallet_address: &str,
        stake: Option<f64>,
    ) -> Result<AgentIdentity, X402Error> {
        let registry_url = self
            .config
            .registry_url
            .as_ref()
            .ok_or_else(|| X402Error::Network("Registry URL required for agent registration".to_string()))?;

        let public_key_bytes = self.config.keypair.public.to_bytes();
        let public_key_b64 = base64::encode(public_key_bytes);

        let registration_data = serde_json::json!({
            "did": self.config.did.as_ref().unwrap_or(&format!("did:x402:{}", self.config.key_id)),
            "walletAddress": wallet_address,
            "visaTapCert": self.config.visa_tap_cert.as_ref().unwrap_or(&self.config.key_id),
            "publicKey": public_key_b64,
            "algorithm": self.config.algorithm.as_str(),
            "stake": stake.unwrap_or(0.0),
        });

        let url = format!("{}/agents/register", registry_url);
        let response = self.request(Method::POST, &url, Some(registration_data)).await?;

        let agent: AgentIdentity = serde_json::from_value(response["agent"].clone())
            .map_err(|e| X402Error::Network(e.to_string()))?;

        self.agent_identity = Some(agent.clone());

        Ok(agent)
    }

    pub async fn discover_agents(
        &self,
        filters: Option<HashMap<String, String>>,
    ) -> Result<Vec<AgentIdentity>, X402Error> {
        let registry_url = self
            .config
            .registry_url
            .as_ref()
            .ok_or_else(|| X402Error::Network("Registry URL required for agent discovery".to_string()))?;

        let mut url = format!("{}/agents/discover", registry_url);

        if let Some(params) = filters {
            let query: Vec<String> = params.iter().map(|(k, v)| format!("{}={}", k, v)).collect();
            if !query.is_empty() {
                url = format!("{}?{}", url, query.join("&"));
            }
        }

        let response = self.request(Method::GET, &url, None).await?;

        let agents: Vec<AgentIdentity> = serde_json::from_value(response["agents"].clone())
            .map_err(|e| X402Error::Network(e.to_string()))?;

        Ok(agents)
    }

    pub fn get_agent_identity(&self) -> Option<&AgentIdentity> {
        self.agent_identity.as_ref()
    }
}
