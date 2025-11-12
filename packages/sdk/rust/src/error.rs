use thiserror::Error;

pub type Result<T> = std::result::Result<T, X402Error>;

#[derive(Error, Debug)]
pub enum X402Error {
    #[error("Payment required: {0}")]
    PaymentRequired(String),

    #[error("Payment failed: {0}")]
    PaymentFailed(String),

    #[error("Insufficient balance: {0}")]
    InsufficientBalance(String),

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("Solana error: {0}")]
    Solana(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Base64 decode error: {0}")]
    Base64(#[from] base64::DecodeError),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("Transaction error: {0}")]
    Transaction(String),
}

impl From<solana_client::client_error::ClientError> for X402Error {
    fn from(err: solana_client::client_error::ClientError) -> Self {
        X402Error::Solana(err.to_string())
    }
}

impl From<solana_sdk::signer::SignerError> for X402Error {
    fn from(err: solana_sdk::signer::SignerError) -> Self {
        X402Error::Solana(err.to_string())
    }
}
