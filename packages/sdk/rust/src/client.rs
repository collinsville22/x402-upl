use crate::error::{Result, X402Error};
use crate::types::{PaymentPayload, PaymentRequirements, PaymentMetrics, PaymentRecord};
use base64::{engine::general_purpose, Engine as _};
use reqwest::{Client as HttpClient, Method, StatusCode};
use serde::de::DeserializeOwned;
use serde_json::Value;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_instruction,
    transaction::Transaction,
};
use spl_associated_token_account::{get_associated_token_address, get_associated_token_address_with_program_id};
use spl_token::instruction::transfer_checked;
use std::str::FromStr;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

lazy_static::lazy_static! {
    pub static ref CASH_MINT: Pubkey = Pubkey::from_str("CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH").unwrap();
    pub static ref TOKEN_2022_PROGRAM_ID: Pubkey = Pubkey::from_str("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb").unwrap();
}

pub const CASH_DECIMALS: u8 = 6;

#[derive(Debug, Clone)]
pub struct X402Config {
    pub network: String,
    pub rpc_url: Option<String>,
    pub facilitator_url: String,
    pub timeout: u64,
    pub spending_limit_per_hour: f64,
}

impl Default for X402Config {
    fn default() -> Self {
        Self {
            network: "devnet".to_string(),
            rpc_url: None,
            facilitator_url: "https://facilitator.payai.network".to_string(),
            timeout: 30,
            spending_limit_per_hour: f64::INFINITY,
        }
    }
}

pub struct SolanaX402Client {
    wallet: Arc<Keypair>,
    config: X402Config,
    rpc_client: Arc<RpcClient>,
    http_client: HttpClient,
    metrics: Arc<Mutex<PaymentMetrics>>,
    payment_history: Arc<Mutex<Vec<PaymentRecord>>>,
    hourly_spending: Arc<Mutex<HashMap<i64, f64>>>,
}

impl SolanaX402Client {
    pub fn new(wallet: Keypair, config: X402Config) -> Result<Self> {
        let rpc_url = config.rpc_url.clone().unwrap_or_else(|| {
            match config.network.as_str() {
                "mainnet-beta" => "https://api.mainnet-beta.solana.com",
                "devnet" => "https://api.devnet.solana.com",
                _ => "https://api.testnet.solana.com",
            }
            .to_string()
        });

        let rpc_client = Arc::new(RpcClient::new_with_commitment(
            rpc_url,
            CommitmentConfig::confirmed(),
        ));

        let http_client = HttpClient::builder()
            .timeout(std::time::Duration::from_secs(config.timeout))
            .build()
            .map_err(|e| X402Error::Network(e))?;

        Ok(Self {
            wallet: Arc::new(wallet),
            config,
            rpc_client,
            http_client,
            metrics: Arc::new(Mutex::new(PaymentMetrics::default())),
            payment_history: Arc::new(Mutex::new(Vec::new())),
            hourly_spending: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    pub async fn get<T: DeserializeOwned>(
        &self,
        url: &str,
        params: Option<Vec<(&str, &str)>>,
    ) -> Result<T> {
        self.request(Method::GET, url, None, params).await
    }

    pub async fn post<T: DeserializeOwned>(
        &self,
        url: &str,
        data: Option<Value>,
        params: Option<Vec<(&str, &str)>>,
    ) -> Result<T> {
        self.request(Method::POST, url, data, params).await
    }

    async fn request<T: DeserializeOwned>(
        &self,
        method: Method,
        url: &str,
        data: Option<Value>,
        params: Option<Vec<(&str, &str)>>,
    ) -> Result<T> {
        let mut request_builder = self.http_client.request(method.clone(), url);

        if let Some(p) = params {
            request_builder = request_builder.query(&p);
        }

        if let Some(d) = data.clone() {
            if method == Method::POST {
                request_builder = request_builder.json(&d);
            }
        }

        let response = request_builder.send().await?;

        if response.status() == StatusCode::PAYMENT_REQUIRED {
            let requirements: PaymentRequirements = response.json().await?;
            let payment_header = self.create_payment(&requirements).await?;

            let mut retry_request = self.http_client.request(method, url);

            if let Some(p) = params {
                retry_request = retry_request.query(&p);
            }

            if let Some(d) = data {
                if method == Method::POST {
                    retry_request = retry_request.json(&d);
                }
            }

            retry_request = retry_request.header("X-Payment", payment_header);

            let retry_response = retry_request.send().await?;
            retry_response.error_for_status_ref()?;

            return retry_response.json().await.map_err(|e| e.into());
        }

        response.error_for_status_ref()?;
        response.json().await.map_err(|e| e.into())
    }

    async fn create_payment(&self, requirements: &PaymentRequirements) -> Result<String> {
        let recipient = Pubkey::from_str(&requirements.pay_to)
            .map_err(|e| X402Error::InvalidConfig(e.to_string()))?;

        let amount: f64 = requirements
            .amount
            .parse()
            .map_err(|e: std::num::ParseFloatError| X402Error::InvalidConfig(e.to_string()))?;

        self.track_payment(amount, "sent", &requirements.pay_to);

        let signature = if requirements.asset == "SOL" || requirements.scheme == "solana" {
            self.send_sol_payment(&recipient, amount).await?
        } else {
            let mint = Pubkey::from_str(&requirements.asset)
                .map_err(|e| X402Error::InvalidConfig(e.to_string()))?;
            self.send_token_payment(&recipient, amount, &mint).await?
        };

        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let nonce = requirements
            .nonce
            .clone()
            .unwrap_or_else(|| self.generate_nonce());

        let payload = PaymentPayload {
            network: requirements.network.clone(),
            asset: requirements.asset.clone(),
            from: self.wallet.pubkey().to_string(),
            to: requirements.pay_to.clone(),
            amount: requirements.amount.clone(),
            signature: signature.clone(),
            timestamp,
            nonce,
            memo: None,
        };

        let json = serde_json::to_string(&payload)?;
        Ok(general_purpose::STANDARD.encode(json.as_bytes()))
    }

    async fn send_sol_payment(&self, recipient: &Pubkey, amount: f64) -> Result<String> {
        let lamports = (amount * 1_000_000_000.0) as u64;

        let balance = self.rpc_client.get_balance(&self.wallet.pubkey())?;

        if balance < lamports {
            return Err(X402Error::InsufficientBalance(format!(
                "Required: {} SOL, Available: {} SOL",
                amount,
                balance as f64 / 1_000_000_000.0
            )));
        }

        let recent_blockhash = self.rpc_client.get_latest_blockhash()?;

        let instruction =
            system_instruction::transfer(&self.wallet.pubkey(), recipient, lamports);

        let transaction = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&self.wallet.pubkey()),
            &[&*self.wallet],
            recent_blockhash,
        );

        let signature = self
            .rpc_client
            .send_and_confirm_transaction(&transaction)
            .map_err(|e| X402Error::Transaction(e.to_string()))?;

        Ok(signature.to_string())
    }

    async fn send_token_payment(
        &self,
        recipient: &Pubkey,
        amount: f64,
        mint: &Pubkey,
    ) -> Result<String> {
        let is_cash = mint == &*CASH_MINT;
        let program_id = if is_cash {
            *TOKEN_2022_PROGRAM_ID
        } else {
            spl_token::id()
        };

        let decimals = if is_cash {
            CASH_DECIMALS
        } else {
            6
        };

        let token_amount = (amount * 10_f64.powi(decimals as i32)) as u64;

        let from_ata = if is_cash {
            get_associated_token_address_with_program_id(&self.wallet.pubkey(), mint, &program_id)
        } else {
            get_associated_token_address(&self.wallet.pubkey(), mint)
        };

        let to_ata = if is_cash {
            get_associated_token_address_with_program_id(recipient, mint, &program_id)
        } else {
            get_associated_token_address(recipient, mint)
        };

        let recent_blockhash = self.rpc_client.get_latest_blockhash()?;

        let transfer_ix = transfer_checked(
            &program_id,
            &from_ata,
            mint,
            &to_ata,
            &self.wallet.pubkey(),
            &[],
            token_amount,
            decimals,
        )?;

        let transaction = Transaction::new_signed_with_payer(
            &[transfer_ix],
            Some(&self.wallet.pubkey()),
            &[&*self.wallet],
            recent_blockhash,
        );

        let signature = self
            .rpc_client
            .send_and_confirm_transaction(&transaction)
            .map_err(|e| X402Error::Transaction(e.to_string()))?;

        Ok(signature.to_string())
    }

    pub fn get_balance(&self, currency: &str) -> Result<f64> {
        if currency == "SOL" {
            let balance = self.rpc_client.get_balance(&self.wallet.pubkey())?;
            return Ok(balance as f64 / 1_000_000_000.0);
        }

        let mint = if currency == "CASH" {
            *CASH_MINT
        } else {
            Pubkey::from_str(currency)
                .map_err(|e| X402Error::InvalidConfig(e.to_string()))?
        };

        let is_cash = mint == *CASH_MINT;
        let program_id = if is_cash {
            *TOKEN_2022_PROGRAM_ID
        } else {
            spl_token::id()
        };

        let decimals = if is_cash { CASH_DECIMALS } else { 6 };

        let token_account = if is_cash {
            get_associated_token_address_with_program_id(&self.wallet.pubkey(), &mint, &program_id)
        } else {
            get_associated_token_address(&self.wallet.pubkey(), &mint)
        };

        match self.rpc_client.get_token_account_balance(&token_account) {
            Ok(balance) => {
                let amount: u64 = balance.amount.parse().unwrap_or(0);
                Ok(amount as f64 / 10_f64.powi(decimals as i32))
            }
            Err(_) => Ok(0.0),
        }
    }

    pub fn get_wallet_address(&self) -> String {
        self.wallet.pubkey().to_string()
    }

    pub fn get_metrics(&self) -> PaymentMetrics {
        self.metrics.lock().unwrap().clone()
    }

    pub fn get_payment_history(&self, limit: Option<usize>) -> Vec<PaymentRecord> {
        let history = self.payment_history.lock().unwrap();
        let mut reversed: Vec<PaymentRecord> = history.iter().rev().cloned().collect();

        if let Some(lim) = limit {
            reversed.truncate(lim);
        }

        reversed
    }

    pub fn fetch_payment_history(&self, limit: usize) -> Result<Vec<PaymentRecord>> {
        let signatures = self.rpc_client.get_signatures_for_address(&self.wallet.pubkey())?;

        let mut records = Vec::new();

        for (i, sig_info) in signatures.iter().enumerate() {
            if i >= limit {
                break;
            }

            if let Ok(Some(tx)) = self.rpc_client.get_transaction(&sig_info.signature, solana_client::rpc_config::RpcTransactionConfig {
                encoding: Some(solana_transaction_status::UiTransactionEncoding::Json),
                commitment: Some(CommitmentConfig::confirmed()),
                max_supported_transaction_version: Some(0),
            }) {
                if let Some(meta) = tx.transaction.meta {
                    let pre_balance = meta.pre_balances.get(0).copied().unwrap_or(0);
                    let post_balance = meta.post_balances.get(0).copied().unwrap_or(0);
                    let diff = (post_balance as i64 - pre_balance as i64) as f64 / 1_000_000_000.0;

                    if diff != 0.0 {
                        let (record_type, amount) = if diff < 0.0 {
                            ("sent".to_string(), -diff)
                        } else {
                            ("received".to_string(), diff)
                        };

                        let timestamp = sig_info.block_time.unwrap_or(0) as u64 * 1000;

                        records.push(PaymentRecord {
                            signature: sig_info.signature.to_string(),
                            timestamp,
                            amount,
                            asset: "SOL".to_string(),
                            record_type,
                            from_address: self.wallet.pubkey().to_string(),
                            to_address: String::new(),
                        });
                    }
                }
            }
        }

        Ok(records)
    }

    pub fn get_spent_this_hour(&self) -> f64 {
        let current_hour = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64 / 3600;

        *self.hourly_spending.lock().unwrap().get(&current_hour).unwrap_or(&0.0)
    }

    pub fn get_remaining_hourly_budget(&self) -> f64 {
        if self.config.spending_limit_per_hour.is_infinite() {
            return f64::INFINITY;
        }

        let spent = self.get_spent_this_hour();
        let remaining = self.config.spending_limit_per_hour - spent;
        if remaining < 0.0 { 0.0 } else { remaining }
    }

    fn track_payment(&self, amount: f64, payment_type: &str, counterparty: &str) {
        let current_hour = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64 / 3600;

        let mut metrics = self.metrics.lock().unwrap();
        let mut hourly = self.hourly_spending.lock().unwrap();
        let mut history = self.payment_history.lock().unwrap();

        if payment_type == "sent" {
            metrics.total_spent += amount;
            *hourly.entry(current_hour).or_insert(0.0) += amount;
        } else {
            metrics.total_earned += amount;
        }

        metrics.net_profit = metrics.total_earned - metrics.total_spent;
        metrics.transaction_count += 1;
        metrics.average_cost_per_inference = if metrics.transaction_count > 0 {
            metrics.total_spent / metrics.transaction_count as f64
        } else {
            0.0
        };

        let (from_address, to_address) = if payment_type == "sent" {
            (self.wallet.pubkey().to_string(), counterparty.to_string())
        } else {
            (counterparty.to_string(), self.wallet.pubkey().to_string())
        };

        history.push(PaymentRecord {
            signature: String::new(),
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            amount,
            asset: "SOL".to_string(),
            record_type: payment_type.to_string(),
            from_address,
            to_address,
        });

        drop(metrics);
        drop(hourly);
        drop(history);

        self.cleanup_old_hourly_data();
    }

    fn cleanup_old_hourly_data(&self) {
        let current_hour = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64 / 3600;
        let cutoff_hour = current_hour - 24;

        let mut hourly = self.hourly_spending.lock().unwrap();
        hourly.retain(|&hour, _| hour >= cutoff_hour);
    }

    pub fn record_earnings(&self, amount: f64, from_address: &str) {
        self.track_payment(amount, "received", from_address);
    }

    fn generate_nonce(&self) -> String {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let bytes: [u8; 16] = rng.gen();
        hex::encode(bytes)
    }
}
