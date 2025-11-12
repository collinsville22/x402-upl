#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function testSDKInstallation() {
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    const sdk = require('./dist/index.js');

    const requiredExports = [
      'X402Client',
      'SolanaX402Client',
      'TAPClient',
      'RFC9421Signature',
      'CASH_MINT',
      'ServiceDiscovery'
    ];

    for (const exportName of requiredExports) {
      if (!sdk[exportName]) {
        results.failed++;
        results.errors.push(`Missing export: ${exportName}`);
      } else {
        results.passed++;
      }
    }

    const typeFiles = [
      'dist/index.d.ts',
      'dist/client.d.ts',
      'dist/service-discovery.d.ts',
      'dist/solana-x402-client.d.ts',
      'dist/tap/tap-client.d.ts'
    ];

    for (const typeFile of typeFiles) {
      if (!fs.existsSync(path.join(__dirname, typeFile))) {
        results.failed++;
        results.errors.push(`Missing type file: ${typeFile}`);
      } else {
        results.passed++;
      }
    }

    if (typeof sdk.X402Client !== 'function') {
      results.failed++;
      results.errors.push('X402Client is not a constructor');
    } else {
      results.passed++;
    }

    if (typeof sdk.SolanaX402Client !== 'function') {
      results.failed++;
      results.errors.push('SolanaX402Client is not a constructor');
    } else {
      results.passed++;
    }

    if (typeof sdk.TAPClient !== 'function') {
      results.failed++;
      results.errors.push('TAPClient is not a constructor');
    } else {
      results.passed++;
    }

    if (typeof sdk.RFC9421Signature.generateNonce !== 'function') {
      results.failed++;
      results.errors.push('RFC9421Signature.generateNonce is not a function');
    } else {
      results.passed++;
    }

    const nonce = sdk.RFC9421Signature.generateNonce();
    if (typeof nonce !== 'string' || nonce.length === 0) {
      results.failed++;
      results.errors.push('RFC9421Signature.generateNonce() returned invalid value');
    } else {
      results.passed++;
    }

    if (!sdk.CASH_MINT || !sdk.CASH_MINT.toBase58) {
      results.failed++;
      results.errors.push('CASH_MINT is not a valid PublicKey');
    } else {
      const mintAddress = sdk.CASH_MINT.toBase58();
      if (mintAddress !== 'CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH') {
        results.failed++;
        results.errors.push('CASH_MINT has incorrect address');
      } else {
        results.passed++;
      }
    }

    const packageJson = require('./package.json');

    if (packageJson.name !== '@x402-upl/sdk') {
      results.failed++;
      results.errors.push('Package name is incorrect');
    } else {
      results.passed++;
    }

    if (packageJson.main !== 'dist/index.js') {
      results.failed++;
      results.errors.push('Package main entry point is incorrect');
    } else {
      results.passed++;
    }

    if (packageJson.types !== 'dist/index.d.ts') {
      results.failed++;
      results.errors.push('Package types entry point is incorrect');
    } else {
      results.passed++;
    }

  } catch (error) {
    results.failed++;
    results.errors.push(`Fatal error: ${error.message}`);

    if (error.code === 'MODULE_NOT_FOUND') {
      results.errors.push('SDK not built. Run: npm run build');
    }
  }

  return results;
}

function main() {
  const results = testSDKInstallation();

  process.stdout.write('\nSDK Installation Test Results\n');
  process.stdout.write('=============================\n\n');
  process.stdout.write(`Passed: ${results.passed}\n`);
  process.stdout.write(`Failed: ${results.failed}\n\n`);

  if (results.errors.length > 0) {
    process.stdout.write('Errors:\n');
    results.errors.forEach((error, index) => {
      process.stdout.write(`  ${index + 1}. ${error}\n`);
    });
    process.stdout.write('\n');
    process.exit(1);
  }

  const packageJson = require('./package.json');
  process.stdout.write('Package Information:\n');
  process.stdout.write(`  Name:    ${packageJson.name}\n`);
  process.stdout.write(`  Version: ${packageJson.version}\n`);
  process.stdout.write(`  Main:    ${packageJson.main}\n`);
  process.stdout.write(`  Types:   ${packageJson.types}\n\n`);

  process.stdout.write('Status: Ready for publication\n\n');
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { testSDKInstallation };
