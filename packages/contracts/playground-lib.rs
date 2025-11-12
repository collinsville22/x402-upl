use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use solana_program::pubkey;

declare_id!("85GHuKTjE4RXR2d4tCMKLXSbdwr2wkELVvUhNeyrwEfj");

pub const ORACLE_AUTHORITY: Pubkey = pubkey!("oracLExRKSH9PQq5Yw2YDrXZWJ5b1yKqN3z8vXwZ7Yz");
pub const VERIFIER_AUTHORITY: Pubkey = pubkey!("veriF1ErX9WZ8kLFH7YqDxyzREGcKyJkqmE6N3zRvXy");
pub const TAP_AUTHORITY: Pubkey = pubkey!("tapAUT4orX9YnRPQsWZ8kLFH7YqDxyzREGcKyJkqmE6");
pub const DAO_AUTHORITY: Pubkey = pubkey!("daoAUT4orX9YnRPQsWZ8kLFH7YqDxyzREGcKyJkqmE6");
pub const DAO_TREASURY: Pubkey = pubkey!("treasURY4orX9YnRPQsWZ8kLFH7YqDxyzREGcKyJkqm");
pub const STAKE_TOKEN_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

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

#[program]
pub mod x402_registry {
    use super::*;

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        did: String,
        visa_tap_cert: String,
        stake_amount: u64,
        metadata_uri: String,
    ) -> Result<()> {
        let clock = Clock::get()?;

        require!(stake_amount >= 1_000_000_000, ErrorCode::InvalidStakeAmount);
        require!(did.len() <= 256, ErrorCode::StringTooLong);
        require!(visa_tap_cert.len() <= 512, ErrorCode::StringTooLong);
        require!(metadata_uri.len() <= 256, ErrorCode::StringTooLong);

        let expected_wallet = ctx.accounts.signer.key();
        let (derived_pda, _) = Pubkey::find_program_address(
            &[b"agent", expected_wallet.as_ref()],
            ctx.program_id
        );
        require!(
            ctx.accounts.agent.key() == derived_pda,
            ErrorCode::InvalidPDA
        );

        let agent = &mut ctx.accounts.agent;
        agent.wallet = expected_wallet;
        agent.did = did;
        agent.visa_tap_cert = visa_tap_cert;
        agent.reputation_score = calculate_initial_reputation(stake_amount);
        agent.total_spent = 0;
        agent.total_transactions = 0;
        agent.successful_transactions = 0;
        agent.disputes_won = 0;
        agent.disputes_lost = 0;
        agent.staked_amount = stake_amount;
        agent.slashed_amount = 0;
        agent.credit_limit = 0;
        agent.credit_used = 0;
        agent.created_at = clock.unix_timestamp;
        agent.last_active = clock.unix_timestamp;
        agent.last_transaction_time = 0;
        agent.last_slashed_time = 0;
        agent.last_slash_evidence = String::new();
        agent.metadata_uri = metadata_uri;
        agent.status = AgentStatus::Active;
        agent.historical_min_reputation = agent.reputation_score;
        agent.service_count = 0;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.staker_token_account.to_account_info(),
                    to: ctx.accounts.escrow_account.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            stake_amount,
        )?;

        emit!(AgentRegisteredEvent {
            wallet: agent.wallet,
            reputation_score: agent.reputation_score,
            stake_amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn register_service(
        ctx: Context<RegisterService>,
        url: String,
        name: String,
        description: String,
        category: String,
        price_per_call: u64,
        accepted_tokens: Vec<Pubkey>,
    ) -> Result<()> {
        let agent = &ctx.accounts.agent;
        let clock = Clock::get()?;

        require!(
            agent.wallet == ctx.accounts.owner.key(),
            ErrorCode::UnauthorizedAccess
        );
        require!(
            agent.status == AgentStatus::Active,
            ErrorCode::AgentSuspended
        );
        require!(
            agent.staked_amount >= 1_000_000_000,
            ErrorCode::InsufficientStake
        );

        require!(url.len() <= 512, ErrorCode::StringTooLong);
        require!(name.len() <= 128, ErrorCode::StringTooLong);
        require!(description.len() <= 1024, ErrorCode::StringTooLong);
        require!(category.len() <= 64, ErrorCode::StringTooLong);
        require!(price_per_call > 0, ErrorCode::InvalidPrice);
        require!(accepted_tokens.len() > 0 && accepted_tokens.len() <= 5, ErrorCode::InvalidTokenList);

        let service_key = ctx.accounts.service.key();

        let service = &mut ctx.accounts.service;
        service.url = url;
        service.name = name;
        service.description = description;
        service.category = category;
        service.owner = ctx.accounts.owner.key();
        service.price_per_call = price_per_call;
        service.accepted_tokens = accepted_tokens;
        service.total_calls = 0;
        service.successful_calls = 0;
        service.total_revenue = 0;
        service.total_response_time_sum = 0;
        service.average_response_time_ms = 0;
        service.uptime_percent = 100;
        service.reputation_score = 0;
        service.total_ratings = 0;
        service.total_rating_sum = 0;
        service.average_rating = 0;
        service.verified = false;
        service.visa_tap_verified = false;
        service.created_at = clock.unix_timestamp;
        service.last_updated = clock.unix_timestamp;
        service.status = ServiceStatus::Active;

        let agent_mut = &mut ctx.accounts.agent;
        agent_mut.service_count = agent_mut.service_count.checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(ServiceRegisteredEvent {
            service_key,
            owner: service.owner,
            price_per_call,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn record_transaction(
        ctx: Context<RecordTransaction>,
        amount: u64,
        success: bool,
        response_time_ms: u32,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ORACLE_AUTHORITY,
            ErrorCode::UnauthorizedAccess
        );

        let clock = Clock::get()?;

        let (expected_agent_pda, _) = Pubkey::find_program_address(
            &[b"agent", ctx.accounts.agent.wallet.as_ref()],
            ctx.program_id
        );
        require!(
            ctx.accounts.agent.key() == expected_agent_pda,
            ErrorCode::InvalidPDA
        );

        require!(
            ctx.accounts.service.status == ServiceStatus::Active,
            ErrorCode::ServiceNotActive
        );
        require!(
            ctx.accounts.agent.status == AgentStatus::Active,
            ErrorCode::AgentSuspended
        );

        let service_key = ctx.accounts.service.key();

        let agent = &mut ctx.accounts.agent;
        let service = &mut ctx.accounts.service;

        require!(
            clock.unix_timestamp >= agent.last_transaction_time + 10,
            ErrorCode::RateLimitExceeded
        );

        agent.total_transactions = agent.total_transactions.checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;
        agent.last_active = clock.unix_timestamp;
        agent.last_transaction_time = clock.unix_timestamp;

        service.total_calls = service.total_calls.checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;

        if success {
            agent.successful_transactions = agent.successful_transactions.checked_add(1)
                .ok_or(ErrorCode::MathOverflow)?;
            agent.total_spent = agent.total_spent.checked_add(amount)
                .ok_or(ErrorCode::MathOverflow)?;

            let new_reputation = calculate_new_reputation(
                agent.reputation_score,
                agent.total_transactions,
                agent.successful_transactions,
            )?;

            agent.reputation_score = new_reputation;

            if new_reputation > 9000 {
                agent.credit_limit = agent.total_spent.checked_div(10)
                    .ok_or(ErrorCode::MathOverflow)?;
            }

            service.successful_calls = service.successful_calls.checked_add(1)
                .ok_or(ErrorCode::MathOverflow)?;
            service.total_revenue = service.total_revenue.checked_add(amount)
                .ok_or(ErrorCode::MathOverflow)?;

            service.total_response_time_sum = service.total_response_time_sum
                .checked_add(response_time_ms as u64)
                .ok_or(ErrorCode::MathOverflow)?;

            service.average_response_time_ms = (service.total_response_time_sum
                .checked_div(service.total_calls as u64)
                .ok_or(ErrorCode::MathOverflow)?) as u32;
        } else {
            let penalty = if agent.reputation_score > 100 { 100 } else { agent.reputation_score };
            agent.reputation_score = agent.reputation_score.saturating_sub(penalty);
        }

        service.last_updated = clock.unix_timestamp;

        emit!(TransactionRecordedEvent {
            agent: agent.wallet,
            service: service_key,
            amount,
            success,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn rate_service(
        ctx: Context<RateService>,
        rating: u16,
    ) -> Result<()> {
        require!(
            ctx.accounts.agent.wallet == ctx.accounts.rater.key(),
            ErrorCode::UnauthorizedAccess
        );
        require!(
            ctx.accounts.agent.total_transactions > 0,
            ErrorCode::NoTransactionHistory
        );

        let (expected_agent_pda, _) = Pubkey::find_program_address(
            &[b"agent", ctx.accounts.agent.wallet.as_ref()],
            ctx.program_id
        );
        require!(
            ctx.accounts.agent.key() == expected_agent_pda,
            ErrorCode::InvalidPDA
        );

        require!(rating >= 1 && rating <= 500, ErrorCode::InvalidRating);
        require!(
            ctx.accounts.service.status == ServiceStatus::Active,
            ErrorCode::ServiceNotActive
        );
        require!(
            ctx.accounts.service.owner != ctx.accounts.agent.wallet,
            ErrorCode::SelfRatingNotAllowed
        );

        let service_key = ctx.accounts.service.key();
        let agent_wallet = ctx.accounts.agent.wallet;

        let service = &mut ctx.accounts.service;
        let service_rating = &mut ctx.accounts.service_rating;
        let clock = Clock::get()?;

        service_rating.service = service_key;
        service_rating.agent = agent_wallet;
        service_rating.rating = rating;
        service_rating.timestamp = clock.unix_timestamp;
        service_rating.last_update_time = clock.unix_timestamp;

        service.total_ratings = service.total_ratings.checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;
        service.total_rating_sum = service.total_rating_sum.checked_add(rating as u64)
            .ok_or(ErrorCode::MathOverflow)?;

        let avg_rating = service.total_rating_sum
            .checked_div(service.total_ratings as u64)
            .ok_or(ErrorCode::MathOverflow)?;
        require!(avg_rating <= 500, ErrorCode::InvalidRating);

        service.average_rating = avg_rating as u16;
        service.reputation_score = (service.average_rating as u64)
            .checked_mul(2)
            .ok_or(ErrorCode::MathOverflow)?;
        service.last_updated = clock.unix_timestamp;

        emit!(ServiceRatedEvent {
            service: service_key,
            rating,
            new_average: service.average_rating,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn slash_for_fraud(
        ctx: Context<SlashAgent>,
        fraud_amount: u64,
        evidence_uri: String,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == DAO_AUTHORITY,
            ErrorCode::UnauthorizedAccess
        );

        let agent = &mut ctx.accounts.agent;
        let clock = Clock::get()?;

        require!(evidence_uri.len() <= 256, ErrorCode::StringTooLong);
        require!(fraud_amount >= 1_000_000, ErrorCode::SlashAmountTooLow);
        require!(
            fraud_amount <= agent.staked_amount,
            ErrorCode::FraudAmountTooHigh
        );
        require!(
            agent.status == AgentStatus::Suspended,
            ErrorCode::AgentNotSuspended
        );

        let slash_cooldown = agent.last_slashed_time
            .checked_add(24 * 60 * 60)
            .ok_or(ErrorCode::TimestampOverflow)?;
        require!(
            clock.unix_timestamp >= slash_cooldown,
            ErrorCode::SlashRateLimitExceeded
        );

        let slash_amount = calculate_slash_amount(fraud_amount, agent.staked_amount)?;

        require!(slash_amount <= agent.staked_amount, ErrorCode::InsufficientStake);

        let seeds = &[b"escrow".as_ref(), &[ctx.bumps.escrow_account]];
        let signer_seeds = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_account.to_account_info(),
                    to: ctx.accounts.dao_treasury.to_account_info(),
                    authority: ctx.accounts.escrow_account.to_account_info(),
                },
                signer_seeds,
            ),
            slash_amount,
        )?;

        agent.staked_amount = agent.staked_amount.checked_sub(slash_amount)
            .ok_or(ErrorCode::MathOverflow)?;
        agent.slashed_amount = agent.slashed_amount.checked_add(slash_amount)
            .ok_or(ErrorCode::MathOverflow)?;
        agent.disputes_lost = agent.disputes_lost.checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;
        agent.last_slashed_time = clock.unix_timestamp;
        agent.last_slash_evidence = evidence_uri;

        let reputation_penalty = if agent.reputation_score > 1000 { 1000 } else { agent.reputation_score };
        agent.reputation_score = agent.reputation_score.saturating_sub(reputation_penalty);

        emit!(AgentSlashedEvent {
            wallet: agent.wallet,
            slash_amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn verify_service(ctx: Context<VerifyService>) -> Result<()> {
        require!(
            ctx.accounts.verifier.key() == VERIFIER_AUTHORITY,
            ErrorCode::UnauthorizedAccess
        );

        let service_key = ctx.accounts.service.key();
        let service = &mut ctx.accounts.service;
        let clock = Clock::get()?;

        service.verified = true;
        service.last_updated = clock.unix_timestamp;

        emit!(ServiceVerifiedEvent {
            service: service_key,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn set_visa_tap_verified(
        ctx: Context<SetVisaTapVerified>,
        verified: bool,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == TAP_AUTHORITY,
            ErrorCode::UnauthorizedAccess
        );

        let service = &mut ctx.accounts.service;
        let clock = Clock::get()?;

        service.visa_tap_verified = verified;
        service.last_updated = clock.unix_timestamp;

        Ok(())
    }

    pub fn update_rating(
        ctx: Context<UpdateRating>,
        new_rating: u16,
    ) -> Result<()> {
        require!(
            ctx.accounts.agent.wallet == ctx.accounts.rater.key(),
            ErrorCode::UnauthorizedAccess
        );
        require!(new_rating >= 1 && new_rating <= 500, ErrorCode::InvalidRating);

        let service = &mut ctx.accounts.service;
        let service_rating = &mut ctx.accounts.service_rating;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp >= service_rating.last_update_time + (7 * 24 * 60 * 60),
            ErrorCode::RatingUpdateCooldown
        );

        let old_rating = service_rating.rating;

        require!(service.total_ratings > 0, ErrorCode::InvalidState);

        service.total_rating_sum = service.total_rating_sum
            .checked_sub(old_rating as u64)
            .ok_or(ErrorCode::MathOverflow)?;
        service.total_rating_sum = service.total_rating_sum
            .checked_add(new_rating as u64)
            .ok_or(ErrorCode::MathOverflow)?;

        let avg_rating = service.total_rating_sum
            .checked_div(service.total_ratings as u64)
            .ok_or(ErrorCode::MathOverflow)?;
        require!(avg_rating <= 500, ErrorCode::InvalidRating);

        service.average_rating = avg_rating as u16;
        service.reputation_score = (service.average_rating as u64)
            .checked_mul(2)
            .ok_or(ErrorCode::MathOverflow)?;

        service_rating.rating = new_rating;
        service_rating.timestamp = clock.unix_timestamp;
        service_rating.last_update_time = clock.unix_timestamp;
        service.last_updated = clock.unix_timestamp;

        Ok(())
    }

    pub fn update_service(
        ctx: Context<UpdateService>,
        new_price_per_call: Option<u64>,
        new_url: Option<String>,
        new_description: Option<String>,
    ) -> Result<()> {
        let service = &mut ctx.accounts.service;
        let clock = Clock::get()?;

        require!(
            service.status != ServiceStatus::Suspended,
            ErrorCode::ServiceSuspended
        );

        if let Some(price) = new_price_per_call {
            require!(price > 0, ErrorCode::InvalidPrice);
            service.price_per_call = price;
        }

        if let Some(url) = new_url {
            require!(url.len() <= 512, ErrorCode::StringTooLong);
            service.url = url;
        }

        if let Some(description) = new_description {
            require!(description.len() <= 1024, ErrorCode::StringTooLong);
            service.description = description;
        }

        service.last_updated = clock.unix_timestamp;

        Ok(())
    }

    pub fn unstake_agent(
        ctx: Context<UnstakeAgent>,
    ) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        let clock = Clock::get()?;

        require!(
            agent.status != AgentStatus::Suspended && agent.status != AgentStatus::Banned,
            ErrorCode::AgentSuspended
        );

        let unlock_time = agent.created_at
            .checked_add(30 * 24 * 60 * 60)
            .ok_or(ErrorCode::TimestampOverflow)?;
        require!(
            clock.unix_timestamp >= unlock_time,
            ErrorCode::UnstakeLockPeriod
        );

        let unstake_amount = agent.staked_amount;
        require!(unstake_amount > 0, ErrorCode::NoStakeToWithdraw);

        let seeds = &[b"escrow".as_ref(), &[ctx.bumps.escrow_account]];
        let signer_seeds = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_account.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_account.to_account_info(),
                },
                signer_seeds,
            ),
            unstake_amount,
        )?;

        agent.staked_amount = 0;
        agent.historical_min_reputation = agent.reputation_score;
        agent.reputation_score = 0;
        agent.credit_limit = 0;
        agent.status = AgentStatus::Paused;

        Ok(())
    }

    pub fn restake_agent(
        ctx: Context<RestakeAgent>,
        stake_amount: u64,
    ) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        let clock = Clock::get()?;

        require!(stake_amount >= 1_000_000_000, ErrorCode::InvalidStakeAmount);
        require!(agent.staked_amount == 0, ErrorCode::AlreadyStaked);
        require!(agent.status == AgentStatus::Paused, ErrorCode::InvalidAgentStatus);

        let cooldown_end = agent.last_active
            .checked_add(7 * 24 * 60 * 60)
            .ok_or(ErrorCode::TimestampOverflow)?;
        require!(
            clock.unix_timestamp >= cooldown_end,
            ErrorCode::RestakeCooldownNotElapsed
        );

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.staker_token_account.to_account_info(),
                    to: ctx.accounts.escrow_account.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            stake_amount,
        )?;

        let calculated_reputation = calculate_initial_reputation(stake_amount);
        let historical_min = agent.historical_min_reputation;

        agent.staked_amount = stake_amount;
        agent.reputation_score = if calculated_reputation > historical_min {
            historical_min
        } else {
            calculated_reputation
        };
        agent.total_spent = 0;
        agent.credit_limit = 0;
        agent.credit_used = 0;
        agent.status = AgentStatus::Active;
        agent.last_active = clock.unix_timestamp;

        Ok(())
    }

    pub fn suspend_agent(ctx: Context<AdminAgentAction>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == DAO_AUTHORITY,
            ErrorCode::UnauthorizedAccess
        );

        let agent = &mut ctx.accounts.agent;
        require!(agent.status == AgentStatus::Active, ErrorCode::InvalidAgentStatus);

        let clock = Clock::get()?;
        agent.status = AgentStatus::Suspended;

        emit!(AgentStatusChangedEvent {
            wallet: agent.wallet,
            new_status: AgentStatus::Suspended,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn unsuspend_agent(ctx: Context<AdminAgentAction>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == DAO_AUTHORITY,
            ErrorCode::UnauthorizedAccess
        );

        let agent = &mut ctx.accounts.agent;
        require!(agent.status == AgentStatus::Suspended, ErrorCode::InvalidAgentStatus);

        let clock = Clock::get()?;
        agent.status = AgentStatus::Active;

        emit!(AgentStatusChangedEvent {
            wallet: agent.wallet,
            new_status: AgentStatus::Active,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn ban_agent(ctx: Context<AdminAgentAction>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == DAO_AUTHORITY,
            ErrorCode::UnauthorizedAccess
        );

        let agent = &mut ctx.accounts.agent;
        let clock = Clock::get()?;
        agent.status = AgentStatus::Banned;

        emit!(AgentStatusChangedEvent {
            wallet: agent.wallet,
            new_status: AgentStatus::Banned,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn pause_service(ctx: Context<UpdateService>) -> Result<()> {
        let service = &mut ctx.accounts.service;
        let clock = Clock::get()?;

        require!(service.status == ServiceStatus::Active, ErrorCode::InvalidServiceStatus);

        service.status = ServiceStatus::Paused;
        service.last_updated = clock.unix_timestamp;

        Ok(())
    }

    pub fn unpause_service(ctx: Context<UpdateService>) -> Result<()> {
        let service = &mut ctx.accounts.service;
        let clock = Clock::get()?;

        require!(service.status == ServiceStatus::Paused, ErrorCode::InvalidServiceStatus);

        service.status = ServiceStatus::Active;
        service.last_updated = clock.unix_timestamp;

        Ok(())
    }

    pub fn deprecate_service(ctx: Context<UpdateService>) -> Result<()> {
        let service = &mut ctx.accounts.service;
        let clock = Clock::get()?;

        require!(
            service.status != ServiceStatus::Suspended,
            ErrorCode::ServiceSuspended
        );

        service.status = ServiceStatus::Deprecated;
        service.last_updated = clock.unix_timestamp;

        Ok(())
    }

    pub fn suspend_service(ctx: Context<AdminServiceAction>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == DAO_AUTHORITY,
            ErrorCode::UnauthorizedAccess
        );

        let service_key = ctx.accounts.service.key();
        let service = &mut ctx.accounts.service;
        let clock = Clock::get()?;

        service.status = ServiceStatus::Suspended;
        service.last_updated = clock.unix_timestamp;

        emit!(ServiceStatusChangedEvent {
            service: service_key,
            new_status: ServiceStatus::Suspended,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn unsuspend_service(ctx: Context<AdminServiceAction>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == DAO_AUTHORITY,
            ErrorCode::UnauthorizedAccess
        );

        let service_key = ctx.accounts.service.key();
        let service = &mut ctx.accounts.service;
        let clock = Clock::get()?;

        require!(service.status == ServiceStatus::Suspended, ErrorCode::InvalidServiceStatus);

        service.status = ServiceStatus::Active;
        service.last_updated = clock.unix_timestamp;

        emit!(ServiceStatusChangedEvent {
            service: service_key,
            new_status: ServiceStatus::Active,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn close_agent(ctx: Context<CloseAgent>) -> Result<()> {
        let agent = &ctx.accounts.agent;

        require!(agent.staked_amount == 0, ErrorCode::CannotCloseWithStake);
        require!(
            agent.status == AgentStatus::Paused || agent.status == AgentStatus::Banned,
            ErrorCode::InvalidAgentStatus
        );
        require!(
            agent.service_count == 0,
            ErrorCode::CannotCloseWithServices
        );

        Ok(())
    }

    pub fn close_service(ctx: Context<CloseService>) -> Result<()> {
        let service = &ctx.accounts.service;
        let agent = &mut ctx.accounts.agent;

        require!(
            service.status == ServiceStatus::Deprecated,
            ErrorCode::InvalidServiceStatus
        );

        agent.service_count = agent.service_count.checked_sub(1)
            .ok_or(ErrorCode::MathOverflow)?;

        Ok(())
    }

    pub fn close_suspended_service(ctx: Context<CloseSuspendedService>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == DAO_AUTHORITY,
            ErrorCode::UnauthorizedAccess
        );

        let service = &ctx.accounts.service;
        let agent = &mut ctx.accounts.agent;

        require!(
            service.status == ServiceStatus::Suspended,
            ErrorCode::InvalidServiceStatus
        );

        agent.service_count = agent.service_count.checked_sub(1)
            .ok_or(ErrorCode::MathOverflow)?;

        Ok(())
    }


    pub fn initialize_escrow(ctx: Context<InitializeEscrow>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == DAO_AUTHORITY,
            ErrorCode::UnauthorizedAccess
        );
        Ok(())
    }
}

fn calculate_initial_reputation(stake_amount: u64) -> u64 {
    if stake_amount >= 10_000_000_000 {
        7000
    } else if stake_amount >= 5_000_000_000 {
        6000
    } else if stake_amount >= 1_000_000_000 {
        5000
    } else {
        4000
    }
}

fn calculate_new_reputation(
    current_reputation: u64,
    total_transactions: u64,
    successful_transactions: u64,
) -> Result<u64> {
    let success_rate_numerator = (successful_transactions as u128)
        .checked_mul(10000)
        .ok_or(ErrorCode::MathOverflow)?;
    let success_rate = success_rate_numerator
        .checked_div(total_transactions as u128)
        .ok_or(ErrorCode::MathOverflow)? as u64;

    let weighted_current = (current_reputation as u128)
        .checked_mul(95)
        .ok_or(ErrorCode::MathOverflow)?;
    let weighted_success = (success_rate as u128)
        .checked_mul(5)
        .ok_or(ErrorCode::MathOverflow)?;
    let weighted_sum = weighted_current
        .checked_add(weighted_success)
        .ok_or(ErrorCode::MathOverflow)?;
    let weighted = weighted_sum
        .checked_div(100)
        .ok_or(ErrorCode::MathOverflow)? as u64;

    Ok(if weighted > 10000 { 10000 } else { weighted })
}

fn calculate_slash_amount(fraud_amount: u64, staked_amount: u64) -> Result<u64> {
    let min_slash = fraud_amount.checked_mul(2)
        .ok_or(ErrorCode::MathOverflow)?;
    let slash_amount = if min_slash > staked_amount {
        staked_amount
    } else {
        min_slash
    };
    Ok(slash_amount)
}

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + Agent::SPACE,
        seeds = [b"agent", signer.key().as_ref()],
        bump
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        constraint = staker_token_account.owner == signer.key() @ ErrorCode::UnauthorizedAccess,
        constraint = staker_token_account.mint == STAKE_TOKEN_MINT @ ErrorCode::InvalidMint
    )]
    pub staker_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"escrow"],
        bump,
        constraint = escrow_account.mint == STAKE_TOKEN_MINT @ ErrorCode::InvalidMint
    )]
    pub escrow_account: Account<'info, TokenAccount>,
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterService<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Service::SPACE
    )]
    pub service: Account<'info, Service>,
    #[account(
        mut,
        constraint = agent.wallet == owner.key() @ ErrorCode::UnauthorizedAccess
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordTransaction<'info> {
    #[account(mut)]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub service: Account<'info, Service>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RateService<'info> {
    #[account(mut)]
    pub service: Account<'info, Service>,
    #[account(
        constraint = agent.wallet == rater.key()
    )]
    pub agent: Account<'info, Agent>,
    #[account(
        init,
        payer = rater,
        space = ServiceRating::SPACE,
        seeds = [b"rating", service.key().as_ref(), agent.wallet.as_ref()],
        bump
    )]
    pub service_rating: Account<'info, ServiceRating>,
    #[account(mut)]
    pub rater: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SlashAgent<'info> {
    #[account(mut)]
    pub agent: Account<'info, Agent>,
    #[account(
        mut,
        seeds = [b"escrow"],
        bump
    )]
    pub escrow_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        address = DAO_TREASURY
    )]
    pub dao_treasury: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateRating<'info> {
    #[account(mut)]
    pub service: Account<'info, Service>,
    #[account(constraint = agent.wallet == rater.key())]
    pub agent: Account<'info, Agent>,
    #[account(
        mut,
        seeds = [b"rating", service.key().as_ref(), agent.wallet.as_ref()],
        bump
    )]
    pub service_rating: Account<'info, ServiceRating>,
    pub rater: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateService<'info> {
    #[account(
        mut,
        constraint = service.owner == owner.key() @ ErrorCode::UnauthorizedAccess
    )]
    pub service: Account<'info, Service>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct UnstakeAgent<'info> {
    #[account(
        mut,
        constraint = agent.wallet == signer.key() @ ErrorCode::UnauthorizedAccess
    )]
    pub agent: Account<'info, Agent>,
    #[account(
        mut,
        seeds = [b"escrow"],
        bump,
        constraint = escrow_account.mint == STAKE_TOKEN_MINT @ ErrorCode::InvalidMint
    )]
    pub escrow_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = recipient_token_account.owner == signer.key() @ ErrorCode::UnauthorizedAccess,
        constraint = recipient_token_account.mint == STAKE_TOKEN_MINT @ ErrorCode::InvalidMint
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    pub signer: Signer<'info>,
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RestakeAgent<'info> {
    #[account(
        mut,
        constraint = agent.wallet == signer.key() @ ErrorCode::UnauthorizedAccess
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        constraint = staker_token_account.owner == signer.key() @ ErrorCode::UnauthorizedAccess,
        constraint = staker_token_account.mint == STAKE_TOKEN_MINT @ ErrorCode::InvalidMint
    )]
    pub staker_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"escrow"],
        bump,
        constraint = escrow_account.mint == STAKE_TOKEN_MINT @ ErrorCode::InvalidMint
    )]
    pub escrow_account: Account<'info, TokenAccount>,
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdminAgentAction<'info> {
    #[account(mut)]
    pub agent: Account<'info, Agent>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AdminServiceAction<'info> {
    #[account(mut)]
    pub service: Account<'info, Service>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseAgent<'info> {
    #[account(
        mut,
        close = recipient,
        constraint = agent.wallet == recipient.key() @ ErrorCode::UnauthorizedAccess
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub recipient: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseService<'info> {
    #[account(
        mut,
        close = recipient,
        constraint = service.owner == recipient.key() @ ErrorCode::UnauthorizedAccess
    )]
    pub service: Account<'info, Service>,
    #[account(
        mut,
        constraint = agent.wallet == service.owner @ ErrorCode::UnauthorizedAccess
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub recipient: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseSuspendedService<'info> {
    #[account(
        mut,
        close = recipient,
        constraint = service.status == ServiceStatus::Suspended @ ErrorCode::InvalidServiceStatus
    )]
    pub service: Account<'info, Service>,
    #[account(
        mut,
        constraint = agent.wallet == service.owner @ ErrorCode::UnauthorizedAccess
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub recipient: Signer<'info>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeEscrow<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"escrow"],
        bump,
        token::mint = stake_token_mint,
        token::authority = escrow_account
    )]
    pub escrow_account: Account<'info, TokenAccount>,
    #[account(
        constraint = stake_token_mint.key() == STAKE_TOKEN_MINT @ ErrorCode::InvalidMint
    )]
    pub stake_token_mint: Account<'info, token::Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct VerifyService<'info> {
    #[account(mut)]
    pub service: Account<'info, Service>,
    pub verifier: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetVisaTapVerified<'info> {
    #[account(mut)]
    pub service: Account<'info, Service>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Agent {
    pub wallet: Pubkey,
    pub did: String,
    pub visa_tap_cert: String,
    pub reputation_score: u64,
    pub total_spent: u64,
    pub total_transactions: u64,
    pub successful_transactions: u64,
    pub disputes_won: u32,
    pub disputes_lost: u32,
    pub staked_amount: u64,
    pub slashed_amount: u64,
    pub credit_limit: u64,
    pub credit_used: u64,
    pub created_at: i64,
    pub last_active: i64,
    pub last_transaction_time: i64,
    pub last_slashed_time: i64,
    pub last_slash_evidence: String,
    pub metadata_uri: String,
    pub status: AgentStatus,
    pub historical_min_reputation: u64,
    pub service_count: u32,
}

impl Agent {
    pub const SPACE: usize = 32 + (4 + 256) + (4 + 512) + 8 + 8 + 8 + 8 + 4 + 4 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + (4 + 256) + (4 + 256) + 1 + 8 + 4;
}

#[account]
pub struct Service {
    pub url: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub owner: Pubkey,
    pub price_per_call: u64,
    pub accepted_tokens: Vec<Pubkey>,
    pub total_calls: u64,
    pub successful_calls: u64,
    pub total_revenue: u64,
    pub total_response_time_sum: u64,
    pub average_response_time_ms: u32,
    pub uptime_percent: u8,
    pub reputation_score: u64,
    pub total_ratings: u32,
    pub total_rating_sum: u64,
    pub average_rating: u16,
    pub verified: bool,
    pub visa_tap_verified: bool,
    pub created_at: i64,
    pub last_updated: i64,
    pub status: ServiceStatus,
}

impl Service {
    pub const SPACE: usize = (4 + 512) + (4 + 128) + (4 + 1024) + (4 + 64) + 32 + 8 + (4 + 32 * 5) + 8 + 8 + 8 + 8 + 4 + 1 + 8 + 4 + 8 + 2 + 1 + 1 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum AgentStatus {
    Active,
    Paused,
    Suspended,
    Banned,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ServiceStatus {
    Active,
    Paused,
    Deprecated,
    Suspended,
}

#[event]
pub struct AgentRegisteredEvent {
    pub wallet: Pubkey,
    pub reputation_score: u64,
    pub stake_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct ServiceRegisteredEvent {
    pub service_key: Pubkey,
    pub owner: Pubkey,
    pub price_per_call: u64,
    pub timestamp: i64,
}

#[event]
pub struct TransactionRecordedEvent {
    pub agent: Pubkey,
    pub service: Pubkey,
    pub amount: u64,
    pub success: bool,
    pub timestamp: i64,
}

#[event]
pub struct ServiceRatedEvent {
    pub service: Pubkey,
    pub rating: u16,
    pub new_average: u16,
    pub timestamp: i64,
}

#[event]
pub struct AgentSlashedEvent {
    pub wallet: Pubkey,
    pub slash_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct ServiceVerifiedEvent {
    pub service: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AgentStatusChangedEvent {
    pub wallet: Pubkey,
    pub new_status: AgentStatus,
    pub timestamp: i64,
}

#[event]
pub struct ServiceStatusChangedEvent {
    pub service: Pubkey,
    pub new_status: ServiceStatus,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid stake amount")]
    InvalidStakeAmount,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Invalid rating")]
    InvalidRating,
    #[msg("String too long")]
    StringTooLong,
    #[msg("Invalid token list")]
    InvalidTokenList,
    #[msg("Insufficient stake")]
    InsufficientStake,
    #[msg("Unauthorized access")]
    UnauthorizedAccess,
    #[msg("No transaction history")]
    NoTransactionHistory,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Rate limit exceeded")]
    RateLimitExceeded,
    #[msg("Agent is suspended or banned")]
    AgentSuspended,
    #[msg("Unstake lock period not elapsed")]
    UnstakeLockPeriod,
    #[msg("No stake to withdraw")]
    NoStakeToWithdraw,
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Invalid agent status")]
    InvalidAgentStatus,
    #[msg("Invalid service status")]
    InvalidServiceStatus,
    #[msg("Service not active")]
    ServiceNotActive,
    #[msg("Service suspended")]
    ServiceSuspended,
    #[msg("Already staked")]
    AlreadyStaked,
    #[msg("Cannot close account with stake")]
    CannotCloseWithStake,
    #[msg("Slash rate limit exceeded")]
    SlashRateLimitExceeded,
    #[msg("Restake cooldown not elapsed")]
    RestakeCooldownNotElapsed,
    #[msg("Invalid PDA derivation")]
    InvalidPDA,
    #[msg("Self-rating not allowed")]
    SelfRatingNotAllowed,
    #[msg("Timestamp overflow")]
    TimestampOverflow,
    #[msg("Invalid state")]
    InvalidState,
    #[msg("Slash amount too low")]
    SlashAmountTooLow,
    #[msg("Agent not suspended")]
    AgentNotSuspended,
    #[msg("Cannot close agent with active services")]
    CannotCloseWithServices,
    #[msg("Rating update cooldown not elapsed")]
    RatingUpdateCooldown,
    #[msg("Fraud amount too high")]
    FraudAmountTooHigh,
}
