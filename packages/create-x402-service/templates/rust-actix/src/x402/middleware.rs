use actix_web::{
    body::MessageBody,
    dev::{ServiceRequest, ServiceResponse},
    error::ErrorPaymentRequired,
    middleware::Next,
    Error, HttpMessage,
};
use serde::{Deserialize, Serialize};
use std::future::Future;
use std::pin::Pin;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentRequirements {
    pub scheme: String,
    pub network: String,
    pub asset: String,
    pub pay_to: String,
    pub amount: String,
    pub timeout: u64,
    pub nonce: String,
}

#[derive(Debug, Deserialize)]
pub struct PaymentPayload {
    pub signature: String,
    pub amount: String,
    pub from: String,
    pub to: String,
    pub asset: String,
    pub network: String,
    pub timestamp: u64,
}

pub async fn x402_middleware(
    req: ServiceRequest,
    next: Next<impl MessageBody>,
) -> Result<ServiceResponse<impl MessageBody>, Error> {
    if req.method() == "OPTIONS" {
        return next.call(req).await;
    }

    let path = req.path().to_string();
    if path == "/health" {
        return next.call(req).await;
    }

    let payment_header = req.headers().get("x-payment");

    if payment_header.is_none() {
        let requirements = PaymentRequirements {
            scheme: "exact".to_string(),
            network: "solana-devnet".to_string(),
            asset: "SOL".to_string(),
            pay_to: "".to_string(),
            amount: "0.01".to_string(),
            timeout: 120000,
            nonce: generate_nonce(),
        };

        return Err(ErrorPaymentRequired(serde_json::to_string(&requirements).unwrap()));
    }

    req.extensions_mut().insert(PaymentVerified(true));

    next.call(req).await
}

fn generate_nonce() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..24)
        .map(|_| {
            let idx = rng.gen_range(0..36);
            if idx < 10 {
                (b'0' + idx) as char
            } else {
                (b'a' + (idx - 10)) as char
            }
        })
        .collect()
}

#[derive(Clone)]
pub struct PaymentVerified(pub bool);
