# X402-UPL Setup Guide

Complete setup instructions for the X402-UPL unified payment layer platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
  - [1. Clone and Install](#1-clone-and-install)
  - [2. Database Setup](#2-database-setup)
  - [3. Environment Configuration](#3-environment-configuration)
  - [4. Smart Contract Deployment](#4-smart-contract-deployment)
  - [5. Start Services](#5-start-services)
- [Component-Specific Setup](#component-specific-setup)
  - [Facilitator API](#facilitator-api)
  - [Registry API](#registry-api)
  - [Dashboard](#dashboard)
  - [Consumer App](#consumer-app)
  - [MCP Bridge](#mcp-bridge)
  - [CLI Tool](#cli-tool)
- [Development Workflow](#development-workflow)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js:** v20.0.0 or higher
- **npm:** v10.0.0 or higher
- **PostgreSQL:** v14 or higher
- **Redis:** v7 or higher
- **Solana CLI:** v1.18.0 or higher (for contract deployment)
- **Anchor CLI:** v0.30.0 or higher (for contract development)
- **Rust:** v1.75.0 or higher (for Rust SDK and contracts)
- **Python:** v3.9 or higher (for Python SDK)
- **Go:** v1.21 or higher (for Go SDK)

### Solana Wallet

You'll need a Solana wallet with some SOL for transactions:

```bash
# Generate new wallet
solana-keygen new --outfile ~/.config/solana/id.json

# Get wallet address
solana address

# Airdrop SOL on devnet
solana airdrop 2

# Check balance
solana balance
```

### Cloud Services (Optional)

For production deployment:

- **Supabase** (PostgreSQL database)
- **Upstash** (Redis)
- **Vercel** (Frontend hosting)
- **Railway/Fly.io** (Backend hosting)

## Quick Start

Get up and running in 5 minutes:

```bash
# 1. Clone repository
git clone https://github.com/collinsville22/x402-upl.git
cd x402-upl

# 2. Install dependencies
npm install

# 3. Copy environment files
cp .env.example .env
cp packages/facilitator/.env.example packages/facilitator/.env
cp packages/dashboard/.env.local.example packages/dashboard/.env.local
cp packages/consumer-app/.env.local.example packages/consumer-app/.env.local

# 4. Start PostgreSQL and Redis (Docker)
docker-compose up -d postgres redis

# 5. Run database migrations
cd packages/facilitator
npx prisma generate
npx prisma db push
cd ../..

# 6. Start all services
npm run dev
```

Services will be available at:
- **Dashboard:** http://localhost:3000
- **Consumer App:** http://localhost:3002
- **Facilitator API:** http://localhost:4001
- **Registry API:** http://localhost:4002

## Detailed Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/collinsville22/x402-upl.git
cd x402-upl

# Install all dependencies (this will take a few minutes)
npm install

# Verify installation
npm run build
```

**Workspace Structure:**
```
x402-upl/
├── packages/
│   ├── X042 Core/          # Core middleware
│   ├── facilitator/        # Payment facilitation API
│   ├── registry/api/       # Service registry API
│   ├── dashboard/          # Provider dashboard
│   ├── consumer-app/       # Consumer application
│   ├── cli/                # CLI tool
│   ├── mcp-bridge/         # MCP server
│   ├── service-provider/   # Example service
│   ├── contracts/          # Solana smart contracts
│   ├── sdk/                # Multi-language SDKs
│   ├── integrations/       # Platform integrations
│   └── plugins/            # Platform plugins
├── package.json
├── turbo.json
└── docker-compose.yml
```

### 2. Database Setup

#### Option A: Local PostgreSQL (Docker)

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Verify services are running
docker-compose ps

# View logs
docker-compose logs postgres
docker-compose logs redis
```

**Docker Compose Configuration:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: x402
      POSTGRES_PASSWORD: x402_dev_password
      POSTGRES_DB: x402_facilitator
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  redis_data:
```

#### Option B: Cloud PostgreSQL (Supabase)

1. Sign up at [Supabase](https://supabase.com)
2. Create new project
3. Get connection string from Settings → Database
4. Update `DATABASE_URL` in `.env` files

```bash
# Format:
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
```

#### Option C: Local PostgreSQL Installation

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb x402_facilitator
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql-16
sudo systemctl start postgresql
sudo -u postgres createdb x402_facilitator
```

**Windows:**
Download installer from [PostgreSQL.org](https://www.postgresql.org/download/windows/)

#### Run Migrations

```bash
# Navigate to facilitator package
cd packages/facilitator

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Optional: View database in Prisma Studio
npx prisma studio

# Return to root
cd ../..
```

### 3. Environment Configuration

#### Root Environment Variables

Create `.env` in project root:

```bash
# .env
NODE_ENV=development
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
```

#### Facilitator API Configuration

Create `packages/facilitator/.env`:

```bash
# Server
NODE_ENV=development
PORT=4001
HOST=0.0.0.0

# Database
DATABASE_URL="postgresql://x402:x402_dev_password@localhost:5432/x402_facilitator"

# Redis
REDIS_URL="redis://localhost:6379"

# Solana
SOLANA_RPC_URL="https://api.devnet.solana.com"
SOLANA_NETWORK=devnet

# Authentication
# Generate: openssl rand -hex 32
JWT_SECRET="your-64-character-jwt-secret-here-generate-with-openssl-rand-hex-32"
API_KEY_SALT="your-64-character-api-key-salt-here-generate-with-openssl-rand"

# Webhooks
# Generate: openssl rand -hex 32
WEBHOOK_SIGNING_SECRET="your-64-character-webhook-secret-here-generate-with-openssl"

# CORS
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3002"

# Platform Fee (2%)
PLATFORM_FEE_PERCENTAGE=0.02

# Wallet (for platform operations)
# Generate with: solana-keygen new
PLATFORM_WALLET_PRIVATE_KEY="[base58-encoded-private-key]"
```

**Generate Secrets:**
```bash
# JWT Secret
openssl rand -hex 32

# API Key Salt
openssl rand -hex 32

# Webhook Signing Secret
openssl rand -hex 32

# Platform wallet (Solana keypair)
solana-keygen new --outfile ~/.config/solana/platform.json
```

#### Dashboard Configuration

Create `packages/dashboard/.env.local`:

```bash
# API Endpoints
NEXT_PUBLIC_FACILITATOR_URL=http://localhost:4001
NEXT_PUBLIC_REGISTRY_URL=http://localhost:4002
NEXT_PUBLIC_REASONING_URL=http://localhost:5000

# Solana
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=85GHuKTjE4RXR2d4tCMKLXSbdwr2wkELVvUhNeyrwEfj

# Token Mints
NEXT_PUBLIC_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
NEXT_PUBLIC_CASH_MINT=[your-cash-token-mint]

# Feature Flags
NEXT_PUBLIC_ENABLE_WORKFLOWS=true
NEXT_PUBLIC_ENABLE_ESCROW=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

#### Consumer App Configuration

Create `packages/consumer-app/.env.local`:

```bash
# API Endpoints
NEXT_PUBLIC_FACILITATOR_URL=http://localhost:4001
NEXT_PUBLIC_REGISTRY_URL=http://localhost:4002
NEXT_PUBLIC_REASONING_URL=http://localhost:5000

# Solana
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=85GHuKTjE4RXR2d4tCMKLXSbdwr2wkELVvUhNeyrwEfj

# Token Mints
NEXT_PUBLIC_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
NEXT_PUBLIC_CASH_MINT=[your-cash-token-mint]

# Wallet
NEXT_PUBLIC_WALLET_ADAPTER=phantom

# Feature Flags
NEXT_PUBLIC_ENABLE_WORKFLOWS=true
NEXT_PUBLIC_ENABLE_NATURAL_LANGUAGE=true
```

### 4. Smart Contract Deployment

The smart contracts are already deployed to devnet. If you need to redeploy or deploy to a different network:

#### Prerequisites

```bash
# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Configure Solana CLI
solana config set --url devnet
solana config set --keypair ~/.config/solana/id.json

# Airdrop SOL for deployment
solana airdrop 2
```

#### Deploy Contracts

```bash
# Navigate to contracts directory
cd packages/contracts

# Build contracts
anchor build

# Get program ID
solana address -k target/deploy/x402_registry-keypair.json

# Update Anchor.toml and lib.rs with new program ID
# Then rebuild
anchor build

# Deploy to devnet
anchor deploy

# Run tests
anchor test

# Return to root
cd ../..
```

**Contract Program ID (Devnet):** `85GHuKTjE4RXR2d4tCMKLXSbdwr2wkELVvUhNeyrwEfj`

### 5. Start Services

#### Start All Services (Recommended)

```bash
# Start all services in parallel with Turbo
npm run dev
```

This starts:
- Dashboard (http://localhost:3000)
- Consumer App (http://localhost:3002)
- Facilitator API (http://localhost:4001)
- Registry API (http://localhost:4002)
- MCP Bridge
- Service Provider (example)
- All integrations with dev scripts

#### Start Individual Services

```bash
# Facilitator API
cd packages/facilitator
npm run dev

# Dashboard
cd packages/dashboard
npm run dev

# Consumer App
cd packages/consumer-app
npm run dev

# Registry API
cd packages/registry/api
npm run dev

# MCP Bridge
cd packages/mcp-bridge
PRIVATE_KEY=[your-key] npm run dev

# Example Service Provider
cd packages/service-provider
npm run dev
```

#### Verify Services

```bash
# Check Facilitator API
curl http://localhost:4001/health

# Check Registry API
curl http://localhost:4002/health

# Check Dashboard
curl http://localhost:3000

# Check Consumer App
curl http://localhost:3002
```

## Component-Specific Setup

### Facilitator API

**Port:** 4001

**Setup:**
```bash
cd packages/facilitator

# Install dependencies (if not done)
npm install

# Environment configuration
cp .env.example .env
# Edit .env with your configuration

# Database setup
npx prisma generate
npx prisma db push

# Start development server
npm run dev

# Production build
npm run build
npm start
```

**Endpoints:**
- Health: `GET /health`
- Payments: `POST /api/payments/*`
- Services: `GET /api/services/*`
- Settlements: `POST /api/settlement/*`
- Escrow: `POST /api/escrow/*`

### Registry API

**Port:** 4002

**Setup:**
```bash
cd packages/registry/api

# Install dependencies
npm install

# Environment configuration
cp .env.example .env

# Database setup
npx prisma generate
npx prisma db push

# Start server
npm run dev
```

### Dashboard

**Port:** 3000

**Setup:**
```bash
cd packages/dashboard

# Install dependencies
npm install

# Environment configuration
cp .env.local.example .env.local

# Start development server
npm run dev

# Production build
npm run build
npm start
```

**Features:**
- Service management
- Analytics dashboard
- Settlement management
- Workflow orchestration
- Integration showcase

### Consumer App

**Port:** 3002

**Setup:**
```bash
cd packages/consumer-app

# Install dependencies
npm install

# Environment configuration
cp .env.local.example .env.local

# Start development server
npm run dev

# Production build
npm run build
npm start
```

**Features:**
- Service discovery
- Natural language workflows
- Escrow management
- Real-time monitoring
- Provider mode

### MCP Bridge

**Setup for Claude Desktop:**

1. **Install MCP Server:**
```bash
cd packages/mcp-bridge
npm install
npm run build
```

2. **Configure Claude Desktop:**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or equivalent:

```json
{
  "mcpServers": {
    "x402-solana": {
      "command": "node",
      "args": [
        "/absolute/path/to/x402-upl/packages/mcp-bridge/dist/solana-mcp-server.js"
      ],
      "env": {
        "PRIVATE_KEY": "[your-base58-encoded-solana-private-key]",
        "RPC_URL": "https://api.devnet.solana.com",
        "BAZAAR_URL": "http://localhost:4002"
      }
    }
  }
}
```

3. **Get Private Key:**
```bash
# Convert Solana keypair to base58
solana-keygen pubkey ~/.config/solana/id.json
# Use a tool to convert the keypair array to base58
```

4. **Restart Claude Desktop**

5. **Test in Claude:**
```
List all available x402 services
```

### CLI Tool

**Installation:**

**Option A: Global Install (Recommended)**
```bash
cd packages/cli
npm install -g .

# Verify installation
x402 --version
```

**Option B: Use with npx**
```bash
cd packages/cli
npx . --help
```

**Configuration:**
```bash
# Initialize configuration
x402 init

# This creates ~/.x402/config.json
```

**Usage Examples:**
```bash
# Discover services
x402 discover --category ai-inference

# Register service
x402 register \
  --name "My AI Service" \
  --endpoint "https://api.myservice.com" \
  --price 0.001 \
  --category ai-inference

# Check wallet balance
x402 wallet balance

# View earnings
x402 earnings

# Test service
x402 test --endpoint https://api.example.com/analyze

# Setup TAP authentication
x402 tap setup
```

## Development Workflow

### Development Commands

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Start development mode (all services)
npm run dev

# Run linting
npm run lint

# Run tests
npm run test

# Clean build artifacts
npm run clean

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:migrate     # Run migrations
npm run db:studio      # Open Prisma Studio
```

### Working with Individual Packages

```bash
# Run command in specific package
npm run dev --workspace=@x402-upl/dashboard

# Or navigate to package
cd packages/dashboard
npm run dev
```

### Database Management

```bash
# View database in browser
cd packages/facilitator
npx prisma studio

# Create migration
npx prisma migrate dev --name add_new_field

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Generate types
npx prisma generate
```

### Testing

**Unit Tests:**
```bash
# Run all tests
npm run test

# Run tests for specific package
cd packages/X042\ Core
npm run test

# Watch mode
npm run test -- --watch

# Coverage
npm run test -- --coverage
```

**E2E Tests:**
```bash
# Run Playwright tests
cd packages/dashboard
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

**Integration Tests:**
```bash
# Test full payment flow
cd packages/X042\ Core
npm run test:integration
```

### Contract Development

```bash
cd packages/contracts

# Build contracts
anchor build

# Test contracts
anchor test

# Deploy locally
anchor localnet

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet (⚠️ production)
anchor deploy --provider.cluster mainnet-beta
```

## Production Deployment

### Frontend Deployment (Vercel)

**Dashboard:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy dashboard
cd packages/dashboard
vercel

# Set environment variables in Vercel dashboard
# - NEXT_PUBLIC_FACILITATOR_URL
# - NEXT_PUBLIC_REGISTRY_URL
# - NEXT_PUBLIC_RPC_URL
# - NEXT_PUBLIC_NETWORK

# Deploy to production
vercel --prod
```

**Consumer App:**
```bash
cd packages/consumer-app
vercel
# Set same environment variables
vercel --prod
```

### Backend Deployment (Railway)

**Facilitator API:**

1. **Create Railway Project:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
cd packages/facilitator
railway init

# Link to project
railway link
```

2. **Configure Environment Variables:**
```bash
railway variables set DATABASE_URL="postgresql://..."
railway variables set REDIS_URL="redis://..."
railway variables set JWT_SECRET="..."
railway variables set API_KEY_SALT="..."
railway variables set WEBHOOK_SIGNING_SECRET="..."
railway variables set ALLOWED_ORIGINS="https://dashboard.yourdomain.com"
railway variables set SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
```

3. **Deploy:**
```bash
railway up
```

### Database (Supabase)

1. Create project at [Supabase](https://supabase.com)
2. Get connection string from Settings → Database
3. Update `DATABASE_URL` in production environment
4. Run migrations:
```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### Redis (Upstash)

1. Create database at [Upstash](https://upstash.com)
2. Get connection string
3. Update `REDIS_URL` in production environment

### Smart Contracts (Mainnet)

**⚠️ Warning:** Deploying to mainnet requires real SOL and thorough testing.

```bash
cd packages/contracts

# Switch to mainnet
solana config set --url mainnet-beta

# Build contracts
anchor build

# Deploy (costs ~5-10 SOL)
anchor deploy --provider.cluster mainnet-beta

# Update program IDs in all configs
# - packages/dashboard/.env.local
# - packages/consumer-app/.env.local
# - packages/facilitator/.env
```

### Monitoring Setup

**Datadog:**
```bash
# Install Datadog agent
# Add DD_API_KEY to environment variables

# Configure APM
npm install dd-trace
```

**Axiom Logging:**
```bash
# Install axiom-js
npm install @axiomhq/js

# Add AXIOM_TOKEN and AXIOM_DATASET to env
```

### Health Checks

Configure health check endpoints:

- Facilitator: `https://api.yourdomain.com/health`
- Registry: `https://registry.yourdomain.com/health`
- Dashboard: `https://dashboard.yourdomain.com/api/health`
- Consumer: `https://app.yourdomain.com/api/health`

### SSL/TLS

All production services should use HTTPS:

- Vercel: Automatic SSL
- Railway: Automatic SSL
- Custom domain: Use Cloudflare or Let's Encrypt

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL

# Reset database
cd packages/facilitator
npx prisma migrate reset
```

#### Redis Connection Failed

```bash
# Check Redis is running
docker-compose ps redis

# Test connection
redis-cli ping

# Check connection string
echo $REDIS_URL
```

#### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 [PID]

# Or change port in package.json
"dev": "next dev -p 3001"
```

#### Solana RPC Rate Limiting

```bash
# Use a dedicated RPC provider
# Options:
# - QuickNode: https://www.quicknode.com
# - Alchemy: https://www.alchemy.com
# - Helius: https://helius.xyz
# - Triton: https://triton.one

# Update RPC_URL in .env
SOLANA_RPC_URL="https://your-dedicated-rpc-url"
```

#### Build Failures

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Turbo cache
npm run clean
rm -rf .turbo

# Clear Next.js cache
rm -rf packages/dashboard/.next
rm -rf packages/consumer-app/.next

# Rebuild
npm run build
```

#### TypeScript Errors

```bash
# Regenerate types
cd packages/facilitator
npx prisma generate

# Check TypeScript version
npx tsc --version

# Clear TypeScript cache
rm -rf packages/*/tsconfig.tsbuildinfo
```

#### Anchor Build Failures

```bash
# Update Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked --force

# Clean and rebuild
cd packages/contracts
anchor clean
anchor build
```

### Getting Help

- **GitHub Issues:** [github.com/collinsville22/x402-upl/issues](https://github.com/collinsville22/x402-upl/issues)
- **Documentation:** See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Email:** chiagoziemc7@gmail.com

### Useful Commands

```bash
# Check all service ports
lsof -i -P -n | grep LISTEN

# View logs for all services
docker-compose logs -f

# Monitor PostgreSQL queries
docker-compose exec postgres psql -U x402 -d x402_facilitator -c "SELECT * FROM pg_stat_activity;"

# Monitor Redis
docker-compose exec redis redis-cli monitor

# Check disk space
df -h

# Check memory usage
free -h

# View system resources
htop
```

## Next Steps

After completing setup:

1. **Explore the Dashboard**
   - Navigate to http://localhost:3000
   - Connect wallet
   - Register a test service

2. **Test the Consumer App**
   - Navigate to http://localhost:3002
   - Browse services
   - Create a test workflow

3. **Try the CLI**
   - Run `x402 discover`
   - Test service registration
   - Check wallet balance

4. **Integrate the SDK**
   - Follow examples in `packages/sdk/javascript/examples/`
   - Build a test agent
   - Make a payment

5. **Read the Architecture**
   - Study [ARCHITECTURE.md](./ARCHITECTURE.md)
   - Understand data flows
   - Learn about security features

## Production Checklist

Before deploying to production:

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] SSL/TLS certificates installed
- [ ] Health checks configured
- [ ] Monitoring and logging set up
- [ ] Backup strategy implemented
- [ ] Security audit completed
- [ ] Rate limiting configured
- [ ] CORS origins updated
- [ ] Smart contracts deployed and verified
- [ ] Load testing performed
- [ ] Error handling tested
- [ ] Documentation updated
- [ ] Team trained on operations

## Conclusion

You should now have a fully functional X402-UPL development environment. The platform is ready for:

- Local development
- Integration testing
- Production deployment
- Custom service development

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md).

For support, open an issue on GitHub or contact the development team.
