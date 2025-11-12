use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentRequirements {
    pub scheme: String,
    pub network: String,
    pub asset: String,
    #[serde(rename = "payTo")]
    pub pay_to: String,
    pub amount: String,
    pub timeout: Option<u64>,
    pub resource: Option<String>,
    pub description: Option<String>,
    pub nonce: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentPayload {
    pub network: String,
    pub asset: String,
    pub from: String,
    pub to: String,
    pub amount: String,
    pub signature: String,
    pub timestamp: u64,
    pub nonce: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServicePricing {
    pub amount: String,
    pub asset: String,
    pub network: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct X402ServiceInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub resource: String,
    pub method: String,
    pub pricing: Option<ServicePricing>,
    pub category: Option<String>,
    pub reputation: Option<f64>,
    pub uptime: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentMetrics {
    pub total_spent: f64,
    pub total_earned: f64,
    pub net_profit: f64,
    pub transaction_count: u64,
    pub average_cost_per_inference: f64,
}

impl Default for PaymentMetrics {
    fn default() -> Self {
        Self {
            total_spent: 0.0,
            total_earned: 0.0,
            net_profit: 0.0,
            transaction_count: 0,
            average_cost_per_inference: 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentRecord {
    pub signature: String,
    pub timestamp: u64,
    pub amount: f64,
    pub asset: String,
    #[serde(rename = "type")]
    pub record_type: String,
    pub from_address: String,
    pub to_address: String,
}
