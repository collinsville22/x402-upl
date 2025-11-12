# SDK Setup Guide for Developers

## Issues Fixed (Version 2.0.0)

This guide documents critical issues that were fixed to make the SDK production-ready for external developers.

---

## What Was Broken (Before v2.0.0)

### 1. **Missing Index File**
**Problem:** Package.json specified `"main": "dist/index.js"` but no `index.ts` existed in source.

**Impact:**
- Developers got `Cannot find module '@x402-upl/sdk'` errors
- Package was completely unusable

**Fix Applied:**
- Created `src/index.ts` that exports all modules
- Exports from: client, service-discovery, solana-x402-client, tap-client, rfc9421

### 2. **Incorrect TypeScript Exports**
**Problem:** `src/client.ts` tried to export types from wrong file

**Error:**
```
error TS2305: Module '"./solana-x402-client.js"' has no exported member 'ServiceDiscovery'.
```

**Fix Applied:**
- Split exports in client.ts
- ServiceDiscovery types now imported from `service-discovery.js`
- Payment types remain in `solana-x402-client.js`

### 3. **TypeScript Type Error in TAP Client**
**Problem:** Headers object typed too narrowly in `tap-client.ts`

**Error:**
```
error TS7053: Element implicitly has an 'any' type because expression of type '"X-Agent-DID"' can't be used to index type '{ 'Signature-Input': string; 'Signature': string; }'.
```

**Fix Applied:**
- Changed return type from specific object to `Record<string, string>`
- Allows dynamic header properties for agent identity

### 4. **Missing TypeScript Configuration**
**Problem:** No `tsconfig.json` in SDK package

**Impact:**
- TypeScript tried to compile entire monorepo
- Build took forever and failed with hundreds of errors

**Fix Applied:**
- Created isolated `tsconfig.json` for SDK
- Configured to only compile `src/**/*`
- Excludes node_modules, dist, tests

---

## Installation for Developers

### NPM Package (When Published)

```bash
npm install @x402-upl/sdk
```

### Local Development / Monorepo Usage

If using the SDK in a pnpm workspace:

#### 1. Create `pnpm-workspace.yaml` in project root

```yaml
packages:
  - 'packages/*'
```

#### 2. Add SDK to your package.json dependencies

```json
{
  "dependencies": {
    "@x402-upl/sdk": "workspace:*"
  }
}
```

#### 3. Build the SDK

```bash
cd packages/sdk/javascript
pnpm install
pnpm build
```

#### 4. Install your package

```bash
cd your-package
pnpm install
```

---

## Build Process

### Build Script

The SDK includes a `prepublishOnly` script that automatically builds before publishing:

```json
{
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  }
}
```

### What Gets Published

The `files` field in package.json ensures only necessary files are included:

```json
{
  "files": [
    "dist/**/*",
    "README.md",
    "LICENSE"
  ]
}
```

**Included:**
- `dist/` - All compiled JavaScript and TypeScript declarations
- `README.md` - Documentation
- `LICENSE` - License file

**Excluded (automatically):**
- `src/` - Source TypeScript files
- `node_modules/` - Dependencies (users install their own)
- `*.test.ts` - Test files
- `tsconfig.json` - Build configuration

---

## Verifying the Build

After building, verify these files exist in `dist/`:

```bash
ls dist/

# Should show:
# index.js
# index.d.ts
# client.js
# client.d.ts
# service-discovery.js
# service-discovery.d.ts
# solana-x402-client.js
# solana-x402-client.d.ts
# tap/
```

### Test the Package Locally

Before publishing, test the package:

```bash
# Pack the package
npm pack

# This creates: x402-upl-sdk-2.0.0.tgz

# Install in a test project
cd /path/to/test-project
npm install /path/to/x402-upl-sdk-2.0.0.tgz

# Test the import
node -e "const { X402Client } = require('@x402-upl/sdk'); console.log(X402Client);"
```

---

## Publishing to NPM

### Prerequisites

1. **NPM Account**: Create account at npmjs.com
2. **Organization Access**: Request access to `@x402-upl` organization
3. **Login**: `npm login`

### Publish Steps

```bash
cd packages/sdk/javascript

# Ensure tests pass
pnpm test

# Build (happens automatically via prepublishOnly)
pnpm build

# Dry run to see what will be published
npm publish --dry-run

# Publish (public package)
npm publish --access public
```

### Version Management

Follow semantic versioning:

```bash
# Patch release (bug fixes): 2.0.0 -> 2.0.1
npm version patch

# Minor release (new features): 2.0.0 -> 2.1.0
npm version minor

# Major release (breaking changes): 2.0.0 -> 3.0.0
npm version major
```

---

## Common Developer Issues

### Issue: "Cannot find module '@x402-upl/sdk'"

**Cause:** SDK not built or not linked properly

**Solutions:**

1. **If using from npm:**
   ```bash
   npm install @x402-upl/sdk
   ```

2. **If using in monorepo:**
   ```bash
   cd packages/sdk/javascript
   pnpm build
   cd ../..
   pnpm install
   ```

3. **If still failing in monorepo:**
   - Check `pnpm-workspace.yaml` exists
   - Verify SDK is in workspace packages
   - Try: `pnpm install --force`

### Issue: TypeScript errors on import

**Cause:** Type declarations not found

**Solution:**
```bash
# Ensure types are built
cd packages/sdk/javascript
pnpm build

# Verify .d.ts files exist
ls dist/*.d.ts
```

### Issue: "Module not found" for sub-modules

**Cause:** Trying to import from source instead of compiled

**Wrong:**
```typescript
import { X402Client } from '@x402-upl/sdk/src/client';  // ❌
```

**Correct:**
```typescript
import { X402Client } from '@x402-upl/sdk';  // ✅
```

---

## TypeScript Configuration

### For SDK Consumers

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true
  }
}
```

### For Monorepo Projects

If using SDK in a TypeScript monorepo:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@x402-upl/sdk": ["./packages/sdk/javascript/src"]
    }
  }
}
```

---

## Testing the SDK

### Unit Tests

```bash
cd packages/sdk/javascript
pnpm test
```

### Integration Test Example

```typescript
import { Keypair } from '@solana/web3.js';
import { X402Client } from '@x402-upl/sdk';

async function testSDK() {
  const wallet = Keypair.generate();

  const client = new X402Client({
    network: 'devnet',
    wallet,
    registryApiUrl: 'https://registry.x402.network',
  });

  console.log('SDK initialized successfully');
  console.log('Wallet:', client.getWalletAddress());

  // Test service discovery
  try {
    const services = await client.discover({ limit: 5 });
    console.log(`Found ${services.length} services`);
  } catch (error) {
    console.error('Service discovery failed:', error.message);
  }
}

testSDK();
```

---

## Changelog

### Version 2.0.0 (Current)

**Breaking Changes:**
- None (new major version for clarity)

**Bug Fixes:**
- ✅ Created missing `index.ts` file
- ✅ Fixed incorrect export paths in `client.ts`
- ✅ Fixed TypeScript type error in `tap-client.ts`
- ✅ Added `tsconfig.json` for proper compilation
- ✅ Added `files` field to package.json

**Improvements:**
- Added comprehensive setup documentation
- Improved package.json with proper metadata
- Ready for NPM publication

---

## Support

**Issues:** https://github.com/anthropics/x402-upl/issues
**Documentation:** https://docs.x402.network
**Discord:** https://discord.gg/x402

---

## License

MIT - See LICENSE file for details
