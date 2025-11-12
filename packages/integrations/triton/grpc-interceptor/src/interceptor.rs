use tonic::{Request, Response, Status};
use tonic::service::Interceptor;
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::tap::TAPVerifier;
use crate::payment::PaymentVerifier;
use crate::quota::QuotaManager;

pub struct X402Interceptor {
    tap_verifier: Arc<TAPVerifier>,
    payment_verifier: Arc<PaymentVerifier>,
    quota_manager: Arc<RwLock<QuotaManager>>,
    payment_recipient: String,
}

impl X402Interceptor {
    pub fn new(
        tap_registry_url: String,
        solana_rpc_url: String,
        payment_recipient: String,
    ) -> Self {
        Self {
            tap_verifier: Arc::new(TAPVerifier::new(tap_registry_url)),
            payment_verifier: Arc::new(PaymentVerifier::new(solana_rpc_url, payment_recipient.clone())),
            quota_manager: Arc::new(RwLock::new(QuotaManager::new())),
            payment_recipient,
        }
    }

    pub async fn verify_subscription(&self, metadata: &tonic::metadata::MetadataMap) -> Result<String, Status> {
        let signature = metadata
            .get("signature")
            .ok_or_else(|| Status::unauthenticated("Missing TAP signature"))?
            .to_str()
            .map_err(|_| Status::unauthenticated("Invalid signature format"))?;

        let tap_result = self.tap_verifier.verify_metadata(metadata, signature).await
            .map_err(|e| Status::unauthenticated(format!("TAP verification failed: {}", e)))?;

        let payment_proof = metadata
            .get("x-payment-proof")
            .ok_or_else(|| Status::permission_denied("Payment proof required"))?
            .to_str()
            .map_err(|_| Status::invalid_argument("Invalid payment proof format"))?;

        let proof: crate::payment::PaymentProof = serde_json::from_str(payment_proof)
            .map_err(|_| Status::invalid_argument("Invalid payment proof JSON"))?;

        let verified = self.payment_verifier.verify_payment(&proof).await
            .map_err(|e| Status::permission_denied(format!("Payment verification failed: {}", e)))?;

        if !verified {
            return Err(Status::permission_denied("Payment verification failed"));
        }

        let tier = self.determine_tier(&proof);
        let client_id = tap_result.key_id.clone();

        let mut quota_manager = self.quota_manager.write().await;
        quota_manager.initialize_quota(&client_id, tier, proof.amount);

        Ok(client_id)
    }

    pub async fn check_quota(&self, client_id: &str, data_size: usize) -> Result<(), Status> {
        let mut quota_manager = self.quota_manager.write().await;

        if !quota_manager.has_quota(client_id, data_size) {
            return Err(Status::resource_exhausted(format!(
                "Quota exhausted. Please top up your deposit. Remaining: {} bytes",
                quota_manager.get_remaining(client_id)
            )));
        }

        quota_manager.consume_quota(client_id, data_size);

        Ok(())
    }

    pub async fn get_quota_usage(&self, client_id: &str) -> Option<crate::quota::QuotaUsage> {
        let quota_manager = self.quota_manager.read().await;
        quota_manager.get_usage(client_id)
    }

    fn determine_tier(&self, proof: &crate::payment::PaymentProof) -> crate::quota::QuotaTier {
        if proof.amount >= 10.0 {
            crate::quota::QuotaTier::Enterprise
        } else if proof.amount >= 1.0 {
            crate::quota::QuotaTier::Professional
        } else if proof.amount >= 0.1 {
            crate::quota::QuotaTier::Developer
        } else {
            crate::quota::QuotaTier::Free
        }
    }
}

impl Interceptor for X402Interceptor {
    fn call(&mut self, request: Request<()>) -> Result<Request<()>, Status> {
        Ok(request)
    }
}
