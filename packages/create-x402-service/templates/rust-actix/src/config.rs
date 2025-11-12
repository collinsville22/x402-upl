use std::env;

#[derive(Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,

    pub network: String,
    pub treasury_wallet: String,
    pub redis_url: String,

    pub enable_tap: bool,
    pub registry_url: String,

    pub auto_register_service: bool,
    pub service_url: Option<String>,
    pub service_name: Option<String>,
    pub service_description: Option<String>,
    pub service_category: Option<String>,
    pub service_price: f64,
    pub accepted_tokens: Vec<String>,
    pub service_capabilities: Vec<String>,
    pub service_tags: Vec<String>,
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        dotenv::dotenv().ok();

        let accepted_tokens = env::var("ACCEPTED_TOKENS")
            .unwrap_or_else(|_| "CASH,USDC,SOL".to_string())
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();

        let service_capabilities = env::var("SERVICE_CAPABILITIES")
            .unwrap_or_default()
            .split(',')
            .filter(|s| !s.is_empty())
            .map(|s| s.trim().to_string())
            .collect();

        let service_tags = env::var("SERVICE_TAGS")
            .unwrap_or_default()
            .split(',')
            .filter(|s| !s.is_empty())
            .map(|s| s.trim().to_string())
            .collect();

        Ok(Self {
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()?,

            network: env::var("NETWORK").unwrap_or_else(|_| "devnet".to_string()),
            treasury_wallet: env::var("TREASURY_WALLET")?,
            redis_url: env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string()),

            enable_tap: env::var("ENABLE_TAP").unwrap_or_else(|_| "false".to_string()) == "true",
            registry_url: env::var("REGISTRY_URL")
                .unwrap_or_else(|_| "https://registry.x402.network".to_string()),

            auto_register_service: env::var("AUTO_REGISTER_SERVICE")
                .unwrap_or_else(|_| "false".to_string())
                == "true",
            service_url: env::var("SERVICE_URL").ok(),
            service_name: env::var("SERVICE_NAME").ok(),
            service_description: env::var("SERVICE_DESCRIPTION").ok(),
            service_category: env::var("SERVICE_CATEGORY").ok(),
            service_price: env::var("SERVICE_PRICE")
                .unwrap_or_else(|_| "0.01".to_string())
                .parse()?,
            accepted_tokens,
            service_capabilities,
            service_tags,
        })
    }
}
