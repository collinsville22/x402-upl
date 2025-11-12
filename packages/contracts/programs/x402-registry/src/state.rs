use anchor_lang::prelude::*;

#[account]
pub struct ServiceRating {
    pub service: Pubkey,
    pub agent: Pubkey,
    pub rating: u16,
    pub timestamp: i64,
    pub last_update_time: i64,
}

impl ServiceRating {
    pub const SPACE: usize = 8 + 32 + 32 + 2 + 8 + 8;
}
