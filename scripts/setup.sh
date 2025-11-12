#!/bin/bash

set -e

echo "======================================"
echo "x402-UPL Setup Script"
echo "======================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "Error: Node.js version must be >= 20.0.0"
    exit 1
fi

echo "✓ Node.js version: $(node -v)"
echo ""

echo "Installing dependencies..."
npm install

echo ""
echo "Building packages..."
npm run build

if [ ! -f ".env" ]; then
    echo ""
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠ Please edit .env with your credentials before continuing"
else
    echo ""
    echo "✓ .env file exists"
fi

echo ""
echo "Setting up database..."
cd packages/registry/api
npx prisma generate
npx prisma db push

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Edit .env with your credentials"
echo "2. Run 'npm run dev' to start development"
echo "3. Deploy Solana contracts: cd packages/contracts && anchor deploy"
echo ""
