use serde::{Deserialize, Serialize};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    pubkey::Pubkey,
    signature::Signature,
};
use std::str::FromStr;
use anyhow::{Result, anyhow};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentProof {
    pub signature: String,
    pub amount: f64,
    pub sender: String,
    pub recipient: String,
    pub mint: Option<String>,
    pub timestamp: i64,
    pub request_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentRequirement {
    pub amount: f64,
    pub recipient: String,
    pub currency: String,
    pub mint: Option<String>,
    pub expires_at: i64,
    pub request_id: String,
}

pub struct PaymentVerifier {
    rpc_client: RpcClient,
    payment_recipient: Pubkey,
}

impl PaymentVerifier {
    pub fn new(rpc_url: String, recipient: String) -> Self {
        let rpc_client = RpcClient::new(rpc_url);
        let payment_recipient = Pubkey::from_str(&recipient)
            .expect("Invalid payment recipient address");

        Self {
            rpc_client,
            payment_recipient,
        }
    }

    pub async fn verify_payment(&self, proof: &PaymentProof) -> Result<bool> {
        let signature = Signature::from_str(&proof.signature)
            .map_err(|e| anyhow!("Invalid signature: {}", e))?;

        let transaction = self.rpc_client
            .get_transaction(&signature, solana_client::rpc_config::RpcTransactionConfig {
                encoding: Some(solana_transaction_status::UiTransactionEncoding::JsonParsed),
                commitment: Some(solana_sdk::commitment_config::CommitmentConfig::confirmed()),
                max_supported_transaction_version: Some(0),
            })
            .map_err(|e| anyhow!("Failed to fetch transaction: {}", e))?;

        if transaction.transaction.meta.as_ref().map(|m| m.err.is_some()).unwrap_or(true) {
            return Ok(false);
        }

        let recipient_str = self.payment_recipient.to_string();

        if let Some(meta) = &transaction.transaction.meta {
            if let Some(post_balances) = &meta.post_token_balances {
                for (i, post_balance) in post_balances.iter().enumerate() {
                    if let Some(pre_balances) = &meta.pre_token_balances {
                        if let Some(pre_balance) = pre_balances.get(i) {
                            if post_balance.owner == Some(recipient_str.clone()) ||
                               post_balance.owner == Some(proof.recipient.clone()) {

                                let pre_amount = pre_balance.ui_token_amount.ui_amount.unwrap_or(0.0);
                                let post_amount = post_balance.ui_token_amount.ui_amount.unwrap_or(0.0);
                                let transferred = post_amount - pre_amount;

                                if transferred >= proof.amount {
                                    return Ok(true);
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(false)
    }

    pub async fn get_token_balance(&self, wallet: &str, mint: &str) -> Result<f64> {
        let wallet_pubkey = Pubkey::from_str(wallet)
            .map_err(|e| anyhow!("Invalid wallet address: {}", e))?;
        let mint_pubkey = Pubkey::from_str(mint)
            .map_err(|e| anyhow!("Invalid mint address: {}", e))?;

        let token_accounts = self.rpc_client
            .get_token_accounts_by_owner(&wallet_pubkey, spl_token::instruction::TokenAccountType::Mint(mint_pubkey))
            .map_err(|e| anyhow!("Failed to get token accounts: {}", e))?;

        if token_accounts.is_empty() {
            return Ok(0.0);
        }

        Ok(0.0)
    }
}
