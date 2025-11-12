"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = __importStar(require("@coral-xyz/anchor"));
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const chai_1 = require("chai");
describe("x402-registry", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.X402Registry;
    let mint;
    let userTokenAccount;
    let escrowAccount;
    let daoTreasuryAccount;
    const user = web3_js_1.Keypair.generate();
    const oracleAuthority = web3_js_1.Keypair.fromSecretKey(new Uint8Array([ /* oracle private key matching ORACLE_AUTHORITY */]));
    const verifierAuthority = web3_js_1.Keypair.fromSecretKey(new Uint8Array([ /* verifier private key matching VERIFIER_AUTHORITY */]));
    const tapAuthority = web3_js_1.Keypair.fromSecretKey(new Uint8Array([ /* TAP private key matching TAP_AUTHORITY */]));
    const daoAuthority = web3_js_1.Keypair.fromSecretKey(new Uint8Array([ /* DAO private key matching DAO_AUTHORITY */]));
    before(async () => {
        const airdropSignature = await provider.connection.requestAirdrop(user.publicKey, 2 * web3_js_1.LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(airdropSignature);
        mint = await (0, spl_token_1.createMint)(provider.connection, user, user.publicKey, null, 6);
        userTokenAccount = await (0, spl_token_1.createAccount)(provider.connection, user, mint, user.publicKey);
        escrowAccount = await (0, spl_token_1.createAccount)(provider.connection, user, mint, program.programId);
        daoTreasuryAccount = await (0, spl_token_1.createAccount)(provider.connection, user, mint, daoAuthority.publicKey);
        await (0, spl_token_1.mintTo)(provider.connection, user, mint, userTokenAccount, user, 10_000_000_000);
    });
    describe("register_agent", () => {
        it("registers an agent with valid stake", async () => {
            const [agentPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent"), user.publicKey.toBuffer()], program.programId);
            await program.methods
                .registerAgent("did:x402:agent123", "visa_tap_cert_data", new anchor.BN(5_000_000_000), "https://metadata.example.com")
                .accounts({
                agent: agentPda,
                signer: user.publicKey,
                stakerTokenAccount: userTokenAccount,
                escrowAccount: escrowAccount,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([user])
                .rpc();
            const agentAccount = await program.account.agent.fetch(agentPda);
            chai_1.assert.equal(agentAccount.did, "did:x402:agent123");
            chai_1.assert.equal(agentAccount.reputationScore.toNumber(), 6000);
            chai_1.assert.equal(agentAccount.stakedAmount.toNumber(), 5_000_000_000);
            chai_1.assert.equal(agentAccount.totalTransactions.toNumber(), 0);
        });
        it("fails with zero stake amount", async () => {
            const tempUser = web3_js_1.Keypair.generate();
            const [agentPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent"), tempUser.publicKey.toBuffer()], program.programId);
            try {
                await program.methods
                    .registerAgent("did:x402:agent456", "cert", new anchor.BN(0), "https://metadata.example.com")
                    .accounts({
                    agent: agentPda,
                    signer: tempUser.publicKey,
                    stakerTokenAccount: userTokenAccount,
                    escrowAccount: escrowAccount,
                    tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                    systemProgram: web3_js_1.SystemProgram.programId,
                })
                    .signers([tempUser])
                    .rpc();
                chai_1.assert.fail("Should have failed with InvalidStakeAmount");
            }
            catch (error) {
                chai_1.assert.include(error.toString(), "InvalidStakeAmount");
            }
        });
    });
    describe("register_service", () => {
        it("registers a service with valid parameters", async () => {
            const service = web3_js_1.Keypair.generate();
            await program.methods
                .registerService("https://api.example.com", "Weather API", "Real-time weather data", "data", new anchor.BN(1_000_000), [mint])
                .accounts({
                service: service.publicKey,
                owner: user.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([user, service])
                .rpc();
            const serviceAccount = await program.account.service.fetch(service.publicKey);
            chai_1.assert.equal(serviceAccount.name, "Weather API");
            chai_1.assert.equal(serviceAccount.pricePerCall.toNumber(), 1_000_000);
            chai_1.assert.equal(serviceAccount.totalCalls.toNumber(), 0);
            chai_1.assert.equal(serviceAccount.verified, false);
        });
        it("fails with zero price", async () => {
            const service = web3_js_1.Keypair.generate();
            try {
                await program.methods
                    .registerService("https://api.example.com", "Free API", "Description", "data", new anchor.BN(0), [mint])
                    .accounts({
                    service: service.publicKey,
                    owner: user.publicKey,
                    systemProgram: web3_js_1.SystemProgram.programId,
                })
                    .signers([user, service])
                    .rpc();
                chai_1.assert.fail("Should have failed with InvalidPrice");
            }
            catch (error) {
                chai_1.assert.include(error.toString(), "InvalidPrice");
            }
        });
    });
    describe("record_transaction", () => {
        let agentPda;
        let servicePda;
        before(async () => {
            const [agentAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent"), user.publicKey.toBuffer()], program.programId);
            agentPda = agentAccount;
            const service = web3_js_1.Keypair.generate();
            await program.methods
                .registerService("https://api.example.com", "Test Service", "Description", "data", new anchor.BN(1_000_000), [mint])
                .accounts({
                service: service.publicKey,
                owner: user.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([user, service])
                .rpc();
            servicePda = service.publicKey;
        });
        it("records successful transaction with oracle authority", async () => {
            await program.methods
                .recordTransaction(new anchor.BN(1_000_000), true, 150)
                .accounts({
                agent: agentPda,
                service: servicePda,
                authority: oracleAuthority.publicKey,
            })
                .signers([oracleAuthority])
                .rpc();
            const agentAccount = await program.account.agent.fetch(agentPda);
            const serviceAccount = await program.account.service.fetch(servicePda);
            chai_1.assert.equal(agentAccount.totalTransactions.toNumber(), 1);
            chai_1.assert.equal(agentAccount.successfulTransactions.toNumber(), 1);
            chai_1.assert.equal(serviceAccount.totalCalls.toNumber(), 1);
            chai_1.assert.equal(serviceAccount.successfulCalls.toNumber(), 1);
        });
        it("fails without oracle authority", async () => {
            const unauthorized = web3_js_1.Keypair.generate();
            try {
                await program.methods
                    .recordTransaction(new anchor.BN(1_000_000), true, 150)
                    .accounts({
                    agent: agentPda,
                    service: servicePda,
                    authority: unauthorized.publicKey,
                })
                    .signers([unauthorized])
                    .rpc();
                chai_1.assert.fail("Should have failed with UnauthorizedAccess");
            }
            catch (error) {
                chai_1.assert.include(error.toString(), "UnauthorizedAccess");
            }
        });
        it("updates reputation on failed transaction", async () => {
            const agentBefore = await program.account.agent.fetch(agentPda);
            const reputationBefore = agentBefore.reputationScore.toNumber();
            await program.methods
                .recordTransaction(new anchor.BN(1_000_000), false, 0)
                .accounts({
                agent: agentPda,
                service: servicePda,
                authority: oracleAuthority.publicKey,
            })
                .signers([oracleAuthority])
                .rpc();
            const agentAfter = await program.account.agent.fetch(agentPda);
            const reputationAfter = agentAfter.reputationScore.toNumber();
            chai_1.assert.isBelow(reputationAfter, reputationBefore);
        });
    });
    describe("rate_service", () => {
        let agentPda;
        let servicePda;
        before(async () => {
            const [agentAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent"), user.publicKey.toBuffer()], program.programId);
            agentPda = agentAccount;
            const service = web3_js_1.Keypair.generate();
            await program.methods
                .registerService("https://api.example.com", "Rateable Service", "Description", "data", new anchor.BN(1_000_000), [mint])
                .accounts({
                service: service.publicKey,
                owner: user.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([user, service])
                .rpc();
            servicePda = service.publicKey;
            await program.methods
                .recordTransaction(new anchor.BN(1_000_000), true, 150)
                .accounts({
                agent: agentPda,
                service: servicePda,
                authority: oracleAuthority.publicKey,
            })
                .signers([oracleAuthority])
                .rpc();
        });
        it("rates service with valid agent", async () => {
            await program.methods
                .rateService(400)
                .accounts({
                service: servicePda,
                agent: agentPda,
                rater: user.publicKey,
            })
                .signers([user])
                .rpc();
            const serviceAccount = await program.account.service.fetch(servicePda);
            chai_1.assert.equal(serviceAccount.totalRatings, 1);
            chai_1.assert.equal(serviceAccount.averageRating, 400);
        });
        it("fails without transaction history", async () => {
            const newUser = web3_js_1.Keypair.generate();
            const [newAgentPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent"), newUser.publicKey.toBuffer()], program.programId);
            await program.methods
                .registerAgent("did:x402:newagent", "cert", new anchor.BN(1_000_000_000), "https://metadata.example.com")
                .accounts({
                agent: newAgentPda,
                signer: newUser.publicKey,
                stakerTokenAccount: userTokenAccount,
                escrowAccount: escrowAccount,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([newUser])
                .rpc();
            try {
                await program.methods
                    .rateService(300)
                    .accounts({
                    service: servicePda,
                    agent: newAgentPda,
                    rater: newUser.publicKey,
                })
                    .signers([newUser])
                    .rpc();
                chai_1.assert.fail("Should have failed with NoTransactionHistory");
            }
            catch (error) {
                chai_1.assert.include(error.toString(), "NoTransactionHistory");
            }
        });
    });
    describe("verify_service", () => {
        let servicePda;
        before(async () => {
            const service = web3_js_1.Keypair.generate();
            await program.methods
                .registerService("https://api.example.com", "Verifiable Service", "Description", "data", new anchor.BN(1_000_000), [mint])
                .accounts({
                service: service.publicKey,
                owner: user.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([user, service])
                .rpc();
            servicePda = service.publicKey;
        });
        it("verifies service with verifier authority", async () => {
            await program.methods
                .verifyService()
                .accounts({
                service: servicePda,
                verifier: verifierAuthority.publicKey,
            })
                .signers([verifierAuthority])
                .rpc();
            const serviceAccount = await program.account.service.fetch(servicePda);
            chai_1.assert.equal(serviceAccount.verified, true);
        });
        it("fails without verifier authority", async () => {
            const service = web3_js_1.Keypair.generate();
            await program.methods
                .registerService("https://api.example.com", "Unverified Service", "Description", "data", new anchor.BN(1_000_000), [mint])
                .accounts({
                service: service.publicKey,
                owner: user.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([user, service])
                .rpc();
            try {
                await program.methods
                    .verifyService()
                    .accounts({
                    service: service.publicKey,
                    verifier: user.publicKey,
                })
                    .signers([user])
                    .rpc();
                chai_1.assert.fail("Should have failed with UnauthorizedAccess");
            }
            catch (error) {
                chai_1.assert.include(error.toString(), "UnauthorizedAccess");
            }
        });
    });
    describe("set_visa_tap_verified", () => {
        let servicePda;
        before(async () => {
            const service = web3_js_1.Keypair.generate();
            await program.methods
                .registerService("https://api.example.com", "TAP Service", "Description", "data", new anchor.BN(1_000_000), [mint])
                .accounts({
                service: service.publicKey,
                owner: user.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([user, service])
                .rpc();
            servicePda = service.publicKey;
        });
        it("sets TAP verification with TAP authority", async () => {
            await program.methods
                .setVisaTapVerified(true)
                .accounts({
                service: servicePda,
                authority: tapAuthority.publicKey,
            })
                .signers([tapAuthority])
                .rpc();
            const serviceAccount = await program.account.service.fetch(servicePda);
            chai_1.assert.equal(serviceAccount.visaTapVerified, true);
        });
        it("fails without TAP authority", async () => {
            try {
                await program.methods
                    .setVisaTapVerified(true)
                    .accounts({
                    service: servicePda,
                    authority: user.publicKey,
                })
                    .signers([user])
                    .rpc();
                chai_1.assert.fail("Should have failed with UnauthorizedAccess");
            }
            catch (error) {
                chai_1.assert.include(error.toString(), "UnauthorizedAccess");
            }
        });
    });
    describe("slash_for_fraud", () => {
        let agentPda;
        before(async () => {
            const fraudAgent = web3_js_1.Keypair.generate();
            const [agentAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent"), fraudAgent.publicKey.toBuffer()], program.programId);
            agentPda = agentAccount;
            await program.methods
                .registerAgent("did:x402:fraudagent", "cert", new anchor.BN(5_000_000_000), "https://metadata.example.com")
                .accounts({
                agent: agentPda,
                signer: fraudAgent.publicKey,
                stakerTokenAccount: userTokenAccount,
                escrowAccount: escrowAccount,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([fraudAgent])
                .rpc();
        });
        it("slashes agent with DAO authority", async () => {
            const agentBefore = await program.account.agent.fetch(agentPda);
            const stakeBefore = agentBefore.stakedAmount.toNumber();
            await program.methods
                .slashForFraud(new anchor.BN(1_000_000_000), "https://evidence.example.com")
                .accounts({
                agent: agentPda,
                escrowAccount: escrowAccount,
                daoTreasury: daoTreasuryAccount,
                escrowAuthority: daoAuthority.publicKey,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            })
                .signers([daoAuthority])
                .rpc();
            const agentAfter = await program.account.agent.fetch(agentPda);
            const stakeAfter = agentAfter.stakedAmount.toNumber();
            chai_1.assert.isBelow(stakeAfter, stakeBefore);
            chai_1.assert.isAbove(agentAfter.slashedAmount.toNumber(), 0);
        });
        it("fails without DAO authority", async () => {
            try {
                await program.methods
                    .slashForFraud(new anchor.BN(1_000_000_000), "https://evidence.example.com")
                    .accounts({
                    agent: agentPda,
                    escrowAccount: escrowAccount,
                    daoTreasury: daoTreasuryAccount,
                    escrowAuthority: user.publicKey,
                    tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                })
                    .signers([user])
                    .rpc();
                chai_1.assert.fail("Should have failed with UnauthorizedAccess");
            }
            catch (error) {
                chai_1.assert.include(error.toString(), "UnauthorizedAccess");
            }
        });
    });
    describe("complete_service_lifecycle", () => {
        let testUser;
        let testUserTokenAccount;
        let agentPda;
        let servicePda;
        before(async () => {
            testUser = web3_js_1.Keypair.generate();
            const airdropSig = await provider.connection.requestAirdrop(testUser.publicKey, 2 * web3_js_1.LAMPORTS_PER_SOL);
            await provider.connection.confirmTransaction(airdropSig);
            testUserTokenAccount = await (0, spl_token_1.createAccount)(provider.connection, testUser, mint, testUser.publicKey);
            await (0, spl_token_1.mintTo)(provider.connection, user, mint, testUserTokenAccount, user, 5_000_000_000);
            const [agentAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent"), testUser.publicKey.toBuffer()], program.programId);
            agentPda = agentAccount;
        });
        it("completes full service lifecycle with service_count tracking", async () => {
            await program.methods
                .registerAgent("did:x402:lifecycle", "cert", new anchor.BN(1_000_000_000), "https://metadata.example.com")
                .accounts({
                agent: agentPda,
                signer: testUser.publicKey,
                stakerTokenAccount: testUserTokenAccount,
                escrowAccount: escrowAccount,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([testUser])
                .rpc();
            let agentData = await program.account.agent.fetch(agentPda);
            chai_1.assert.equal(agentData.serviceCount, 0);
            const service = web3_js_1.Keypair.generate();
            await program.methods
                .registerService("https://api.lifecycle.com", "Lifecycle Service", "Test service lifecycle", "data", new anchor.BN(1_000_000), [mint])
                .accounts({
                service: service.publicKey,
                agent: agentPda,
                owner: testUser.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([testUser, service])
                .rpc();
            servicePda = service.publicKey;
            agentData = await program.account.agent.fetch(agentPda);
            chai_1.assert.equal(agentData.serviceCount, 1);
            await program.methods
                .deprecateService()
                .accounts({
                service: servicePda,
                owner: testUser.publicKey,
            })
                .signers([testUser])
                .rpc();
            const serviceData = await program.account.service.fetch(servicePda);
            chai_1.assert.equal(serviceData.status.deprecated !== undefined, true);
            await program.methods
                .closeService()
                .accounts({
                service: servicePda,
                agent: agentPda,
                recipient: testUser.publicKey,
            })
                .signers([testUser])
                .rpc();
            agentData = await program.account.agent.fetch(agentPda);
            chai_1.assert.equal(agentData.serviceCount, 0);
            try {
                await program.account.service.fetch(servicePda);
                chai_1.assert.fail("Service account should be closed");
            }
            catch (error) {
                chai_1.assert.include(error.toString(), "Account does not exist");
            }
        });
    });
    describe("multiple_services_lifecycle", () => {
        let testUser;
        let testUserTokenAccount;
        let agentPda;
        let service1;
        let service2;
        let service3;
        before(async () => {
            testUser = web3_js_1.Keypair.generate();
            const airdropSig = await provider.connection.requestAirdrop(testUser.publicKey, 2 * web3_js_1.LAMPORTS_PER_SOL);
            await provider.connection.confirmTransaction(airdropSig);
            testUserTokenAccount = await (0, spl_token_1.createAccount)(provider.connection, testUser, mint, testUser.publicKey);
            await (0, spl_token_1.mintTo)(provider.connection, user, mint, testUserTokenAccount, user, 5_000_000_000);
            const [agentAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent"), testUser.publicKey.toBuffer()], program.programId);
            agentPda = agentAccount;
            await program.methods
                .registerAgent("did:x402:multiservice", "cert", new anchor.BN(1_000_000_000), "https://metadata.example.com")
                .accounts({
                agent: agentPda,
                signer: testUser.publicKey,
                stakerTokenAccount: testUserTokenAccount,
                escrowAccount: escrowAccount,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([testUser])
                .rpc();
        });
        it("tracks service_count correctly with multiple services", async () => {
            let agentData = await program.account.agent.fetch(agentPda);
            chai_1.assert.equal(agentData.serviceCount, 0);
            service1 = web3_js_1.Keypair.generate();
            await program.methods
                .registerService("https://api.service1.com", "Service 1", "First service", "data", new anchor.BN(1_000_000), [mint])
                .accounts({
                service: service1.publicKey,
                agent: agentPda,
                owner: testUser.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([testUser, service1])
                .rpc();
            agentData = await program.account.agent.fetch(agentPda);
            chai_1.assert.equal(agentData.serviceCount, 1);
            service2 = web3_js_1.Keypair.generate();
            await program.methods
                .registerService("https://api.service2.com", "Service 2", "Second service", "data", new anchor.BN(2_000_000), [mint])
                .accounts({
                service: service2.publicKey,
                agent: agentPda,
                owner: testUser.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([testUser, service2])
                .rpc();
            agentData = await program.account.agent.fetch(agentPda);
            chai_1.assert.equal(agentData.serviceCount, 2);
            service3 = web3_js_1.Keypair.generate();
            await program.methods
                .registerService("https://api.service3.com", "Service 3", "Third service", "data", new anchor.BN(3_000_000), [mint])
                .accounts({
                service: service3.publicKey,
                agent: agentPda,
                owner: testUser.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([testUser, service3])
                .rpc();
            agentData = await program.account.agent.fetch(agentPda);
            chai_1.assert.equal(agentData.serviceCount, 3);
            await program.methods
                .deprecateService()
                .accounts({
                service: service1.publicKey,
                owner: testUser.publicKey,
            })
                .signers([testUser])
                .rpc();
            await program.methods
                .closeService()
                .accounts({
                service: service1.publicKey,
                agent: agentPda,
                recipient: testUser.publicKey,
            })
                .signers([testUser])
                .rpc();
            agentData = await program.account.agent.fetch(agentPda);
            chai_1.assert.equal(agentData.serviceCount, 2);
            await program.methods
                .deprecateService()
                .accounts({
                service: service2.publicKey,
                owner: testUser.publicKey,
            })
                .signers([testUser])
                .rpc();
            await program.methods
                .closeService()
                .accounts({
                service: service2.publicKey,
                agent: agentPda,
                recipient: testUser.publicKey,
            })
                .signers([testUser])
                .rpc();
            agentData = await program.account.agent.fetch(agentPda);
            chai_1.assert.equal(agentData.serviceCount, 1);
            await program.methods
                .deprecateService()
                .accounts({
                service: service3.publicKey,
                owner: testUser.publicKey,
            })
                .signers([testUser])
                .rpc();
            await program.methods
                .closeService()
                .accounts({
                service: service3.publicKey,
                agent: agentPda,
                recipient: testUser.publicKey,
            })
                .signers([testUser])
                .rpc();
            agentData = await program.account.agent.fetch(agentPda);
            chai_1.assert.equal(agentData.serviceCount, 0);
        });
    });
    describe("suspended_service_closure", () => {
        let testUser;
        let testUserTokenAccount;
        let agentPda;
        let servicePda;
        before(async () => {
            testUser = web3_js_1.Keypair.generate();
            const airdropSig = await provider.connection.requestAirdrop(testUser.publicKey, 2 * web3_js_1.LAMPORTS_PER_SOL);
            await provider.connection.confirmTransaction(airdropSig);
            testUserTokenAccount = await (0, spl_token_1.createAccount)(provider.connection, testUser, mint, testUser.publicKey);
            await (0, spl_token_1.mintTo)(provider.connection, user, mint, testUserTokenAccount, user, 5_000_000_000);
            const [agentAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent"), testUser.publicKey.toBuffer()], program.programId);
            agentPda = agentAccount;
            await program.methods
                .registerAgent("did:x402:suspended", "cert", new anchor.BN(1_000_000_000), "https://metadata.example.com")
                .accounts({
                agent: agentPda,
                signer: testUser.publicKey,
                stakerTokenAccount: testUserTokenAccount,
                escrowAccount: escrowAccount,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([testUser])
                .rpc();
            const service = web3_js_1.Keypair.generate();
            await program.methods
                .registerService("https://api.suspended.com", "Suspended Service", "Will be suspended", "data", new anchor.BN(1_000_000), [mint])
                .accounts({
                service: service.publicKey,
                agent: agentPda,
                owner: testUser.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([testUser, service])
                .rpc();
            servicePda = service.publicKey;
        });
        it("closes suspended service and decrements service_count", async () => {
            let agentData = await program.account.agent.fetch(agentPda);
            chai_1.assert.equal(agentData.serviceCount, 1);
            await program.methods
                .suspendService()
                .accounts({
                service: servicePda,
                authority: daoAuthority.publicKey,
            })
                .signers([daoAuthority])
                .rpc();
            const serviceData = await program.account.service.fetch(servicePda);
            chai_1.assert.equal(serviceData.status.suspended !== undefined, true);
            await program.methods
                .closeSuspendedService()
                .accounts({
                service: servicePda,
                agent: agentPda,
                recipient: daoTreasuryAccount,
                authority: daoAuthority.publicKey,
            })
                .signers([daoAuthority])
                .rpc();
            agentData = await program.account.agent.fetch(agentPda);
            chai_1.assert.equal(agentData.serviceCount, 0);
            try {
                await program.account.service.fetch(servicePda);
                chai_1.assert.fail("Service account should be closed");
            }
            catch (error) {
                chai_1.assert.include(error.toString(), "Account does not exist");
            }
        });
    });
    describe("complete_agent_lifecycle", () => {
        let testUser;
        let testUserTokenAccount;
        let agentPda;
        before(async () => {
            testUser = web3_js_1.Keypair.generate();
            const airdropSig = await provider.connection.requestAirdrop(testUser.publicKey, 2 * web3_js_1.LAMPORTS_PER_SOL);
            await provider.connection.confirmTransaction(airdropSig);
            testUserTokenAccount = await (0, spl_token_1.createAccount)(provider.connection, testUser, mint, testUser.publicKey);
            await (0, spl_token_1.mintTo)(provider.connection, user, mint, testUserTokenAccount, user, 5_000_000_000);
            const [agentAccount] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent"), testUser.publicKey.toBuffer()], program.programId);
            agentPda = agentAccount;
        });
        it("prevents agent close with active services", async () => {
            await program.methods
                .registerAgent("did:x402:fullcycle", "cert", new anchor.BN(1_000_000_000), "https://metadata.example.com")
                .accounts({
                agent: agentPda,
                signer: testUser.publicKey,
                stakerTokenAccount: testUserTokenAccount,
                escrowAccount: escrowAccount,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([testUser])
                .rpc();
            const service = web3_js_1.Keypair.generate();
            await program.methods
                .registerService("https://api.fullcycle.com", "Full Cycle Service", "Test full agent lifecycle", "data", new anchor.BN(1_000_000), [mint])
                .accounts({
                service: service.publicKey,
                agent: agentPda,
                owner: testUser.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([testUser, service])
                .rpc();
            const agentData = await program.account.agent.fetch(agentPda);
            chai_1.assert.equal(agentData.serviceCount, 1);
            try {
                await program.methods
                    .closeAgent()
                    .accounts({
                    agent: agentPda,
                    recipient: testUser.publicKey,
                })
                    .signers([testUser])
                    .rpc();
                chai_1.assert.fail("Should have failed with CannotCloseWithServices");
            }
            catch (error) {
                chai_1.assert.include(error.toString(), "CannotCloseWithServices");
            }
            await program.methods
                .deprecateService()
                .accounts({
                service: service.publicKey,
                owner: testUser.publicKey,
            })
                .signers([testUser])
                .rpc();
            await program.methods
                .closeService()
                .accounts({
                service: service.publicKey,
                agent: agentPda,
                recipient: testUser.publicKey,
            })
                .signers([testUser])
                .rpc();
            const agentDataAfterClose = await program.account.agent.fetch(agentPda);
            chai_1.assert.equal(agentDataAfterClose.serviceCount, 0);
        });
    });
});
//# sourceMappingURL=x402-registry.js.map