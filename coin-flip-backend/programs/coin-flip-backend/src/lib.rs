use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

declare_id!("CK9rjq6oyLK8uJBkzkg3CBPW4ydBdKM5khQQUigFuqng");

#[program]
pub mod coin_flip_backend {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, fee_percentage: u64) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;

        game_state.authority = ctx.accounts.authority.key(); 
        game_state.total_amount = 0;
        game_state.fee_percentage = fee_percentage;
        game_state.total_games = 0;
        game_state.bump = ctx.bumps.game_state;

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // Only authority can deposit
        if ctx.accounts.authority.key() != ctx.accounts.game_state.authority {
            return Err(ErrorCode::UnautharisedOwner.into());
        }

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.authority.to_account_info(), 
                    to: ctx.accounts.game_state.to_account_info(),
                },
            ),
            amount,
        )?;

        ctx.accounts.game_state.total_amount += amount;

        Ok(())
    }

    pub fn place_bet(ctx: Context<PlaceBet>, amount: u64, choice: u8) -> Result<()> {
        if choice > 1 {
            return Err(ErrorCode::InvalidChoice.into());
        }

        let bet_account = &mut ctx.accounts.bet_account;
        bet_account.user = ctx.accounts.user.key();
        bet_account.amount = amount;
        bet_account.choice = choice;
        bet_account.won = false;
        bet_account.settled = false;

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.game_state.to_account_info(),
                },
            ),
            bet_account.amount,
        )?;

        ctx.accounts.game_state.total_amount += amount;
        ctx.accounts.game_state.total_games += 1;

        let clock = Clock::get()?;
        let user_key_byte = bet_account.user.to_bytes()[0] as u64;
        let seed = clock.slot + user_key_byte;
        let result = seed % 2;

        let payout_amount = bet_account.amount * 2;
        let fee = (payout_amount * ctx.accounts.game_state.fee_percentage) / 100;
        let user_winnings = payout_amount - fee;

        if result as u8 == bet_account.choice {
            let game_state_account = &ctx.accounts.game_state.to_account_info();
            let user_account = &ctx.accounts.user.to_account_info();

            **game_state_account.try_borrow_mut_lamports()? -= user_winnings;
            **user_account.try_borrow_mut_lamports()? += user_winnings;

            msg!("You've won");

            bet_account.won = true;
            ctx.accounts.game_state.total_amount -= user_winnings;
        } else {
            msg!("You've lost");
        }

        bet_account.settled = true;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        // Only authority can withdraw
        if ctx.accounts.authority.key() != ctx.accounts.game_state.authority {
            return Err(ErrorCode::UnautharisedOwner.into());
        }

        if amount > ctx.accounts.game_state.total_amount {
            return Err(ErrorCode::InvalidAmount.into());
        }

        let game_state_account = &mut ctx.accounts.game_state.to_account_info();
        let authority_account = &mut ctx.accounts.authority.to_account_info(); 

        **game_state_account.try_borrow_mut_lamports()? -= amount;
        **authority_account.try_borrow_mut_lamports()? += amount;

        ctx.accounts.game_state.total_amount -= amount;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, 

    #[account(
        init,
        payer = authority, 
        space = 8 + GameState::INIT_SPACE,
        seeds = [b"global_gamestate"], 
        bump
    )]
    pub game_state: Account<'info, GameState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, 

    #[account(
        mut,
        has_one = authority,
        seeds = [b"global_gamestate"], 
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    

    #[account(
        mut,
        seeds = [b"global_gamestate"],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    #[account(
        init,
        payer = user,
        space = 8 + BetAccount::INIT_SPACE,
        seeds = [b"bet_account", user.key().as_ref(), &game_state.total_games.to_le_bytes()],
        bump
    )]
    pub bet_account: Account<'info, BetAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, 

    #[account(
        mut,
        has_one = authority, 
        seeds = [b"global_gamestate"], 
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct GameState {
    pub authority: Pubkey, // Changed from owner to authority
    pub total_amount: u64,
    pub fee_percentage: u64,
    pub total_games: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BetAccount {
    pub user: Pubkey,
    pub amount: u64,
    pub choice: u8, // 0 = heads, 1 = tails
    pub won: bool,
    pub settled: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid authority")]
    UnautharisedOwner, 

    #[msg("Choice must be 0 or 1")]
    InvalidChoice,

    #[msg("Amount exceeds the total amount in the vault")]
    InvalidAmount
}