use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum QuotaTier {
    Free,
    Developer,
    Professional,
    Enterprise,
}

impl QuotaTier {
    pub fn max_filters(&self) -> usize {
        match self {
            QuotaTier::Free => 1,
            QuotaTier::Developer => 5,
            QuotaTier::Professional => 20,
            QuotaTier::Enterprise => 100,
        }
    }

    pub fn max_accounts_per_filter(&self) -> usize {
        match self {
            QuotaTier::Free => 10,
            QuotaTier::Developer => 100,
            QuotaTier::Professional => 1000,
            QuotaTier::Enterprise => 10000,
        }
    }

    pub fn max_transactions_per_filter(&self) -> usize {
        match self {
            QuotaTier::Free => 10,
            QuotaTier::Developer => 100,
            QuotaTier::Professional => 1000,
            QuotaTier::Enterprise => 10000,
        }
    }

    pub fn bytes_per_cash(&self) -> usize {
        match self {
            QuotaTier::Free => 1_000_000,
            QuotaTier::Developer => 1_000_000,
            QuotaTier::Professional => 1_000_000,
            QuotaTier::Enterprise => 1_000_000,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuotaUsage {
    pub tier: QuotaTier,
    pub total_bytes: usize,
    pub used_bytes: usize,
    pub remaining_bytes: usize,
    pub deposit_amount: f64,
    pub started_at: i64,
    pub last_update: i64,
}

pub struct QuotaManager {
    quotas: HashMap<String, QuotaUsage>,
}

impl QuotaManager {
    pub fn new() -> Self {
        Self {
            quotas: HashMap::new(),
        }
    }

    pub fn initialize_quota(&mut self, client_id: &str, tier: QuotaTier, deposit: f64) {
        let total_bytes = (deposit * tier.bytes_per_cash() as f64) as usize;

        let usage = QuotaUsage {
            tier,
            total_bytes,
            used_bytes: 0,
            remaining_bytes: total_bytes,
            deposit_amount: deposit,
            started_at: chrono::Utc::now().timestamp(),
            last_update: chrono::Utc::now().timestamp(),
        };

        self.quotas.insert(client_id.to_string(), usage);
    }

    pub fn has_quota(&self, client_id: &str, data_size: usize) -> bool {
        if let Some(usage) = self.quotas.get(client_id) {
            usage.remaining_bytes >= data_size
        } else {
            false
        }
    }

    pub fn consume_quota(&mut self, client_id: &str, data_size: usize) {
        if let Some(usage) = self.quotas.get_mut(client_id) {
            usage.used_bytes += data_size;
            usage.remaining_bytes = usage.remaining_bytes.saturating_sub(data_size);
            usage.last_update = chrono::Utc::now().timestamp();
        }
    }

    pub fn get_remaining(&self, client_id: &str) -> usize {
        self.quotas.get(client_id)
            .map(|u| u.remaining_bytes)
            .unwrap_or(0)
    }

    pub fn get_usage(&self, client_id: &str) -> Option<QuotaUsage> {
        self.quotas.get(client_id).cloned()
    }

    pub fn top_up(&mut self, client_id: &str, additional_deposit: f64) {
        if let Some(usage) = self.quotas.get_mut(client_id) {
            let additional_bytes = (additional_deposit * usage.tier.bytes_per_cash() as f64) as usize;
            usage.total_bytes += additional_bytes;
            usage.remaining_bytes += additional_bytes;
            usage.deposit_amount += additional_deposit;
            usage.last_update = chrono::Utc::now().timestamp();
        }
    }

    pub fn refund(&mut self, client_id: &str) -> f64 {
        if let Some(usage) = self.quotas.remove(client_id) {
            let refund_bytes = usage.remaining_bytes;
            let refund_amount = refund_bytes as f64 / usage.tier.bytes_per_cash() as f64;
            refund_amount
        } else {
            0.0
        }
    }

    pub fn check_filter_limits(&self, client_id: &str, num_filters: usize) -> bool {
        if let Some(usage) = self.quotas.get(client_id) {
            num_filters <= usage.tier.max_filters()
        } else {
            false
        }
    }
}

impl Default for QuotaManager {
    fn default() -> Self {
        Self::new()
    }
}
