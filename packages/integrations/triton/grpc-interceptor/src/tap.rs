use serde::{Deserialize, Serialize};
use anyhow::{Result, anyhow};
use std::collections::HashMap;
use reqwest::Client;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TAPIdentity {
    pub key_id: String,
    pub algorithm: String,
    pub public_key: String,
    pub domain: String,
}

#[derive(Debug, Clone)]
pub struct TAPSignature {
    pub key_id: String,
    pub algorithm: String,
    pub signature: String,
    pub headers: Vec<String>,
    pub created: i64,
    pub expires: Option<i64>,
    pub nonce: Option<String>,
    pub tag: Option<String>,
}

pub struct TAPVerifier {
    registry_url: String,
    http_client: Client,
    identity_cache: std::sync::Arc<tokio::sync::RwLock<HashMap<String, TAPIdentity>>>,
}

impl TAPVerifier {
    pub fn new(registry_url: String) -> Self {
        Self {
            registry_url,
            http_client: Client::new(),
            identity_cache: std::sync::Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        }
    }

    pub async fn verify_metadata(
        &self,
        metadata: &tonic::metadata::MetadataMap,
        signature_header: &str,
    ) -> Result<TAPIdentity> {
        let signature = self.parse_signature(signature_header)?;

        if let Some(expires) = signature.expires {
            let now = chrono::Utc::now().timestamp();
            if now > expires {
                return Err(anyhow!("Signature expired"));
            }
        }

        let identity = self.get_identity(&signature.key_id).await?;

        if identity.algorithm != signature.algorithm {
            return Err(anyhow!("Algorithm mismatch"));
        }

        Ok(identity)
    }

    fn parse_signature(&self, header: &str) -> Result<TAPSignature> {
        let mut parts: HashMap<String, String> = HashMap::new();

        for part in header.split(',') {
            let kv: Vec<&str> = part.trim().splitn(2, '=').collect();
            if kv.len() == 2 {
                let key = kv[0].trim();
                let value = kv[1].trim().trim_matches('"');
                parts.insert(key.to_string(), value.to_string());
            }
        }

        let key_id = parts.get("keyid")
            .ok_or_else(|| anyhow!("Missing keyid"))?
            .clone();

        let algorithm = parts.get("algorithm")
            .ok_or_else(|| anyhow!("Missing algorithm"))?
            .clone();

        let signature = parts.get("signature")
            .ok_or_else(|| anyhow!("Missing signature"))?
            .clone();

        let headers_str = parts.get("headers")
            .ok_or_else(|| anyhow!("Missing headers"))?;
        let headers: Vec<String> = headers_str.split_whitespace()
            .map(|s| s.to_string())
            .collect();

        let created = parts.get("created")
            .ok_or_else(|| anyhow!("Missing created"))?
            .parse::<i64>()?;

        let expires = parts.get("expires")
            .map(|s| s.parse::<i64>())
            .transpose()?;

        Ok(TAPSignature {
            key_id,
            algorithm,
            signature,
            headers,
            created,
            expires,
            nonce: parts.get("nonce").cloned(),
            tag: parts.get("tag").cloned(),
        })
    }

    async fn get_identity(&self, key_id: &str) -> Result<TAPIdentity> {
        {
            let cache = self.identity_cache.read().await;
            if let Some(identity) = cache.get(key_id) {
                return Ok(identity.clone());
            }
        }

        let url = format!("{}/agents/key/{}", self.registry_url, key_id);
        let response = self.http_client.get(&url)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch identity: {}", response.status()));
        }

        let identity: TAPIdentity = response.json().await?;

        let mut cache = self.identity_cache.write().await;
        cache.insert(key_id.to_string(), identity.clone());

        Ok(identity)
    }
}
