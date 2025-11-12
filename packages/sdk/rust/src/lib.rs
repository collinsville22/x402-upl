pub mod client;
pub mod discovery;
pub mod error;
pub mod types;
pub mod tap;

pub use client::{SolanaX402Client, X402Config, CASH_MINT, TOKEN_2022_PROGRAM_ID, CASH_DECIMALS};
pub use discovery::{ServiceDiscovery, DiscoveryConfig, X402Service};
pub use error::{X402Error, Result};
pub use types::{PaymentRequirements, PaymentPayload, PaymentMetrics, PaymentRecord};
pub use tap::{
    RFC9421Signature,
    SignatureAlgorithm,
    SignatureComponents,
    SignatureParams,
    SignatureResult,
    TAPClient,
    TAPConfig,
    AgentIdentity,
};
