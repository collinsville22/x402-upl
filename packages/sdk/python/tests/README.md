# x402-upl Python SDK - Test Suite

Production-grade testing for the x402-upl Python SDK with **real** Solana integration.

## Test Types

### 1. Integration Tests (`test_integration.py`)

Real tests against Solana devnet:
- ✅ Actual Solana RPC connection
- ✅ Real wallet balance checks
- ✅ Live service discovery
- ✅ Real x402 payment flow (if service available)

```bash
pytest tests/test_integration.py -m integration -v
```

### 2. Test Service (`test_service.py`)

A real FastAPI x402-compliant service for testing:
- Returns HTTP 402 when payment required
- Verifies X-Payment headers
- Validates on-chain transactions
- Provides test endpoints

```bash
# Run test service
python tests/test_service.py

# Service will run on http://localhost:8000
```

### 3. End-to-End Validation (`e2e_validation.py`)

Complete validation suite:
- Solana connectivity
- Wallet management
- Client initialization
- Balance checking
- Service discovery
- HTTP requests
- x402 payment simulation
- Resource cleanup

```bash
python tests/e2e_validation.py
```

## Setup

### Install Test Dependencies

```bash
pip install -r tests/requirements.txt
```

### Configure Test Wallet

#### Option 1: Generate New Wallet
```bash
python -c "from solders.keypair import Keypair; import json; k = Keypair(); print(json.dumps(list(bytes(k))))" > wallet.json
```

#### Option 2: Use Existing Wallet
```bash
export TEST_WALLET_PRIVATE_KEY='[1,2,3,...]'
```

### Fund Test Wallet (Devnet)

```bash
# Get wallet address
python -c "from solders.keypair import Keypair; import json; k = Keypair.from_bytes(bytes(json.load(open('wallet.json')))); print(k.pubkey())"

# Fund with SOL
solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet
```

## Running Tests

### Quick Validation

```bash
python tests/e2e_validation.py
```

**Expected Output:**
```
============================================================
 x402-upl Python SDK - End-to-End Validation
============================================================

============================================================
TEST 1: Solana RPC Connection
============================================================
✓ Connected to Solana devnet RPC

============================================================
TEST 2: Wallet Creation & Management
============================================================
ℹ Generated wallet: 8xWp...
✓ Wallet creation successful

...

============================================================
 VALIDATION SUMMARY
============================================================
  Solana Connection: PASS
  Wallet Creation: PASS
  Client Init: PASS
  Balance Check: PASS
  Service Discovery: PASS
  Http Request: PASS
  Payment Simulation: PASS
  Cleanup: PASS

============================================================
 Results: 8/8 tests passed
✓ All tests passed! SDK is production ready ✓
============================================================
```

### Integration Tests

```bash
# Run all integration tests
pytest tests/test_integration.py -m integration -v

# Run specific test
pytest tests/test_integration.py::test_real_solana_connection -v
```

### Test with Local x402 Service

#### Terminal 1: Start Test Service

```bash
# Edit test_service.py and set WALLET_ADDRESS to your wallet
python tests/test_service.py
```

#### Terminal 2: Run Tests

```bash
export TEST_X402_SERVICE_URL=http://localhost:8000/api/data
python tests/e2e_validation.py
```

## Test Scenarios

### Scenario 1: Fresh Wallet (No Balance)

```bash
python tests/e2e_validation.py
```

**Expected**:
- ✅ All connection tests pass
- ⚠️ Payment tests skipped (no balance)
- Shows funding instructions

### Scenario 2: Funded Wallet + Test Service

```bash
# Fund wallet
solana airdrop 1 <ADDRESS> --url devnet

# Start service
python tests/test_service.py &

# Run tests
export TEST_X402_SERVICE_URL=http://localhost:8000/api/data
python tests/e2e_validation.py
```

**Expected**:
- ✅ All tests pass
- ✅ Real payment made
- ✅ Balance decreased

### Scenario 3: Production Service Test

```bash
export TEST_X402_SERVICE_URL=https://production-x402-service.com/api
python tests/e2e_validation.py
```

**Tests against real production x402 service**

## Test Coverage

| Component | Integration Tests | E2E Validation |
|-----------|------------------|----------------|
| Solana Connection | ✅ | ✅ |
| Wallet Management | ✅ | ✅ |
| Balance Checking | ✅ | ✅ |
| HTTP Requests | ✅ | ✅ |
| x402 Protocol | ✅ | ✅ |
| Service Discovery | ✅ | ✅ |
| Payment Flow | ✅ | ✅ |
| Resource Cleanup | ✅ | ✅ |

## Troubleshooting

### "Wallet has 0 SOL"

```bash
# Fund wallet on devnet
solana airdrop 2 <YOUR_WALLET> --url devnet
```

### "Service discovery failed"

- Check internet connection
- Verify registry URL is accessible
- Registry may be empty (this is OK for testing)

### "Payment verification failed"

- Ensure test service is running
- Check TEST_X402_SERVICE_URL is correct
- Verify wallet is funded
- Confirm service wallet address matches

### "Transaction not found"

- Transaction may not be confirmed yet
- Wait a few seconds and retry
- Check Solana devnet status

## Continuous Integration

### GitHub Actions Example

```yaml
name: Python SDK Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: |
        cd packages/sdk/python
        pip install -e .
        pip install -r tests/requirements.txt

    - name: Run E2E validation
      run: |
        cd packages/sdk/python
        python tests/e2e_validation.py

    - name: Run integration tests
      run: |
        cd packages/sdk/python
        pytest tests/test_integration.py -m integration -v
```

## Performance Benchmarks

### Expected Latencies (Devnet)

- Wallet creation: <10ms
- Balance check: 200-500ms
- Service discovery: 100-300ms
- HTTP request: 50-200ms
- SOL payment: 400-800ms
- SPL token payment: 600-1000ms
- Full x402 flow: 1-2 seconds

## Security Testing

The test suite validates:
- ✅ Proper private key handling
- ✅ Secure transaction signing
- ✅ Payment verification
- ✅ Amount validation
- ✅ Recipient address validation
- ✅ Signature verification

## Next Steps

After all tests pass:

1. ✅ SDK is production ready
2. Deploy to PyPI: `python -m build && twine upload dist/*`
3. Update documentation
4. Create example applications
5. Monitor real-world usage

## Support

Issues with tests? Open a GitHub issue with:
- Test output
- Python version
- OS
- Network (devnet/mainnet)
