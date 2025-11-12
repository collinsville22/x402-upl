import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { X402Registry } from "../target/types/x402_registry";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAccount } from "@solana/spl-token";
import { assert } from "chai";

describe("x402-registry", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.X402Registry as Program<X402Registry>;

  let mint: PublicKey;
  let userTokenAccount: PublicKey;
  let escrowAccount: PublicKey;
  let daoTreasuryAccount: PublicKey;

  const user = Keypair.generate();
  const oracleAuthority = Keypair.fromSecretKey(
    new Uint8Array([/* oracle private key matching ORACLE_AUTHORITY */])
  );
  const verifierAuthority = Keypair.fromSecretKey(
    new Uint8Array([/* verifier private key matching VERIFIER_AUTHORITY */])
  );
  const tapAuthority = Keypair.fromSecretKey(
    new Uint8Array([/* TAP private key matching TAP_AUTHORITY */])
  );
  const daoAuthority = Keypair.fromSecretKey(
    new Uint8Array([/* DAO private key matching DAO_AUTHORITY */])
  );

  before(async () => {
    const airdropSignature = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature);

    mint = await createMint(
      provider.connection,
      user,
      user.publicKey,
      null,
      6
    );

    userTokenAccount = await createAccount(
      provider.connection,
      user,
      mint,
      user.publicKey
    );

    escrowAccount = await createAccount(
      provider.connection,
      user,
      mint,
      program.programId
    );

    daoTreasuryAccount = await createAccount(
      provider.connection,
      user,
      mint,
      daoAuthority.publicKey
    );

    await mintTo(
      provider.connection,
      user,
      mint,
      userTokenAccount,
      user,
      10_000_000_000
    );
  });

  describe("register_agent", () => {
    it("registers an agent with valid stake", async () => {
      const [agentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), user.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .registerAgent(
          "did:x402:agent123",
          "visa_tap_cert_data",
          new anchor.BN(5_000_000_000),
          "https://metadata.example.com"
        )
        .accounts({
          agent: agentPda,
          signer: user.publicKey,
          stakerTokenAccount: userTokenAccount,
          escrowAccount: escrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const agentAccount = await program.account.agent.fetch(agentPda);

      assert.equal(agentAccount.did, "did:x402:agent123");
      assert.equal(agentAccount.reputationScore.toNumber(), 6000);
      assert.equal(agentAccount.stakedAmount.toNumber(), 5_000_000_000);
      assert.equal(agentAccount.totalTransactions.toNumber(), 0);
    });

    it("fails with zero stake amount", async () => {
      const tempUser = Keypair.generate();
      const [agentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), tempUser.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .registerAgent(
            "did:x402:agent456",
            "cert",
            new anchor.BN(0),
            "https://metadata.example.com"
          )
          .accounts({
            agent: agentPda,
            signer: tempUser.publicKey,
            stakerTokenAccount: userTokenAccount,
            escrowAccount: escrowAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([tempUser])
          .rpc();

        assert.fail("Should have failed with InvalidStakeAmount");
      } catch (error) {
        assert.include(error.toString(), "InvalidStakeAmount");
      }
    });
  });

  describe("register_service", () => {
    it("registers a service with valid parameters", async () => {
      const service = Keypair.generate();

      await program.methods
        .registerService(
          "https://api.example.com",
          "Weather API",
          "Real-time weather data",
          "data",
          new anchor.BN(1_000_000),
          [mint]
        )
        .accounts({
          service: service.publicKey,
          owner: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user, service])
        .rpc();

      const serviceAccount = await program.account.service.fetch(service.publicKey);

      assert.equal(serviceAccount.name, "Weather API");
      assert.equal(serviceAccount.pricePerCall.toNumber(), 1_000_000);
      assert.equal(serviceAccount.totalCalls.toNumber(), 0);
      assert.equal(serviceAccount.verified, false);
    });

    it("fails with zero price", async () => {
      const service = Keypair.generate();

      try {
        await program.methods
          .registerService(
            "https://api.example.com",
            "Free API",
            "Description",
            "data",
            new anchor.BN(0),
            [mint]
          )
          .accounts({
            service: service.publicKey,
            owner: user.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user, service])
          .rpc();

        assert.fail("Should have failed with InvalidPrice");
      } catch (error) {
        assert.include(error.toString(), "InvalidPrice");
      }
    });
  });

  describe("record_transaction", () => {
    let agentPda: PublicKey;
    let servicePda: PublicKey;

    before(async () => {
      const [agentAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), user.publicKey.toBuffer()],
        program.programId
      );
      agentPda = agentAccount;

      const service = Keypair.generate();
      await program.methods
        .registerService(
          "https://api.example.com",
          "Test Service",
          "Description",
          "data",
          new anchor.BN(1_000_000),
          [mint]
        )
        .accounts({
          service: service.publicKey,
          owner: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user, service])
        .rpc();

      servicePda = service.publicKey;
    });

    it("records successful transaction with oracle authority", async () => {
      await program.methods
        .recordTransaction(
          new anchor.BN(1_000_000),
          true,
          150
        )
        .accounts({
          agent: agentPda,
          service: servicePda,
          authority: oracleAuthority.publicKey,
        })
        .signers([oracleAuthority])
        .rpc();

      const agentAccount = await program.account.agent.fetch(agentPda);
      const serviceAccount = await program.account.service.fetch(servicePda);

      assert.equal(agentAccount.totalTransactions.toNumber(), 1);
      assert.equal(agentAccount.successfulTransactions.toNumber(), 1);
      assert.equal(serviceAccount.totalCalls.toNumber(), 1);
      assert.equal(serviceAccount.successfulCalls.toNumber(), 1);
    });

    it("fails without oracle authority", async () => {
      const unauthorized = Keypair.generate();

      try {
        await program.methods
          .recordTransaction(
            new anchor.BN(1_000_000),
            true,
            150
          )
          .accounts({
            agent: agentPda,
            service: servicePda,
            authority: unauthorized.publicKey,
          })
          .signers([unauthorized])
          .rpc();

        assert.fail("Should have failed with UnauthorizedAccess");
      } catch (error) {
        assert.include(error.toString(), "UnauthorizedAccess");
      }
    });

    it("updates reputation on failed transaction", async () => {
      const agentBefore = await program.account.agent.fetch(agentPda);
      const reputationBefore = agentBefore.reputationScore.toNumber();

      await program.methods
        .recordTransaction(
          new anchor.BN(1_000_000),
          false,
          0
        )
        .accounts({
          agent: agentPda,
          service: servicePda,
          authority: oracleAuthority.publicKey,
        })
        .signers([oracleAuthority])
        .rpc();

      const agentAfter = await program.account.agent.fetch(agentPda);
      const reputationAfter = agentAfter.reputationScore.toNumber();

      assert.isBelow(reputationAfter, reputationBefore);
    });
  });

  describe("rate_service", () => {
    let agentPda: PublicKey;
    let servicePda: PublicKey;

    before(async () => {
      const [agentAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), user.publicKey.toBuffer()],
        program.programId
      );
      agentPda = agentAccount;

      const service = Keypair.generate();
      await program.methods
        .registerService(
          "https://api.example.com",
          "Rateable Service",
          "Description",
          "data",
          new anchor.BN(1_000_000),
          [mint]
        )
        .accounts({
          service: service.publicKey,
          owner: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user, service])
        .rpc();

      servicePda = service.publicKey;

      await program.methods
        .recordTransaction(
          new anchor.BN(1_000_000),
          true,
          150
        )
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

      assert.equal(serviceAccount.totalRatings, 1);
      assert.equal(serviceAccount.averageRating, 400);
    });

    it("fails without transaction history", async () => {
      const newUser = Keypair.generate();
      const [newAgentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), newUser.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .registerAgent(
          "did:x402:newagent",
          "cert",
          new anchor.BN(1_000_000_000),
          "https://metadata.example.com"
        )
        .accounts({
          agent: newAgentPda,
          signer: newUser.publicKey,
          stakerTokenAccount: userTokenAccount,
          escrowAccount: escrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
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

        assert.fail("Should have failed with NoTransactionHistory");
      } catch (error) {
        assert.include(error.toString(), "NoTransactionHistory");
      }
    });
  });

  describe("verify_service", () => {
    let servicePda: PublicKey;

    before(async () => {
      const service = Keypair.generate();
      await program.methods
        .registerService(
          "https://api.example.com",
          "Verifiable Service",
          "Description",
          "data",
          new anchor.BN(1_000_000),
          [mint]
        )
        .accounts({
          service: service.publicKey,
          owner: user.publicKey,
          systemProgram: SystemProgram.programId,
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
      assert.equal(serviceAccount.verified, true);
    });

    it("fails without verifier authority", async () => {
      const service = Keypair.generate();
      await program.methods
        .registerService(
          "https://api.example.com",
          "Unverified Service",
          "Description",
          "data",
          new anchor.BN(1_000_000),
          [mint]
        )
        .accounts({
          service: service.publicKey,
          owner: user.publicKey,
          systemProgram: SystemProgram.programId,
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

        assert.fail("Should have failed with UnauthorizedAccess");
      } catch (error) {
        assert.include(error.toString(), "UnauthorizedAccess");
      }
    });
  });

  describe("set_visa_tap_verified", () => {
    let servicePda: PublicKey;

    before(async () => {
      const service = Keypair.generate();
      await program.methods
        .registerService(
          "https://api.example.com",
          "TAP Service",
          "Description",
          "data",
          new anchor.BN(1_000_000),
          [mint]
        )
        .accounts({
          service: service.publicKey,
          owner: user.publicKey,
          systemProgram: SystemProgram.programId,
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
      assert.equal(serviceAccount.visaTapVerified, true);
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

        assert.fail("Should have failed with UnauthorizedAccess");
      } catch (error) {
        assert.include(error.toString(), "UnauthorizedAccess");
      }
    });
  });

  describe("slash_for_fraud", () => {
    let agentPda: PublicKey;

    before(async () => {
      const fraudAgent = Keypair.generate();
      const [agentAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), fraudAgent.publicKey.toBuffer()],
        program.programId
      );
      agentPda = agentAccount;

      await program.methods
        .registerAgent(
          "did:x402:fraudagent",
          "cert",
          new anchor.BN(5_000_000_000),
          "https://metadata.example.com"
        )
        .accounts({
          agent: agentPda,
          signer: fraudAgent.publicKey,
          stakerTokenAccount: userTokenAccount,
          escrowAccount: escrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([fraudAgent])
        .rpc();
    });

    it("slashes agent with DAO authority", async () => {
      const agentBefore = await program.account.agent.fetch(agentPda);
      const stakeBefore = agentBefore.stakedAmount.toNumber();

      await program.methods
        .slashForFraud(
          new anchor.BN(1_000_000_000),
          "https://evidence.example.com"
        )
        .accounts({
          agent: agentPda,
          escrowAccount: escrowAccount,
          daoTreasury: daoTreasuryAccount,
          escrowAuthority: daoAuthority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([daoAuthority])
        .rpc();

      const agentAfter = await program.account.agent.fetch(agentPda);
      const stakeAfter = agentAfter.stakedAmount.toNumber();

      assert.isBelow(stakeAfter, stakeBefore);
      assert.isAbove(agentAfter.slashedAmount.toNumber(), 0);
    });

    it("fails without DAO authority", async () => {
      try {
        await program.methods
          .slashForFraud(
            new anchor.BN(1_000_000_000),
            "https://evidence.example.com"
          )
          .accounts({
            agent: agentPda,
            escrowAccount: escrowAccount,
            daoTreasury: daoTreasuryAccount,
            escrowAuthority: user.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([user])
          .rpc();

        assert.fail("Should have failed with UnauthorizedAccess");
      } catch (error) {
        assert.include(error.toString(), "UnauthorizedAccess");
      }
    });
  });

  describe("complete_service_lifecycle", () => {
    let testUser: Keypair;
    let testUserTokenAccount: PublicKey;
    let agentPda: PublicKey;
    let servicePda: PublicKey;

    before(async () => {
      testUser = Keypair.generate();

      const airdropSig = await provider.connection.requestAirdrop(
        testUser.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      testUserTokenAccount = await createAccount(
        provider.connection,
        testUser,
        mint,
        testUser.publicKey
      );

      await mintTo(
        provider.connection,
        user,
        mint,
        testUserTokenAccount,
        user,
        5_000_000_000
      );

      const [agentAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), testUser.publicKey.toBuffer()],
        program.programId
      );
      agentPda = agentAccount;
    });

    it("completes full service lifecycle with service_count tracking", async () => {
      await program.methods
        .registerAgent(
          "did:x402:lifecycle",
          "cert",
          new anchor.BN(1_000_000_000),
          "https://metadata.example.com"
        )
        .accounts({
          agent: agentPda,
          signer: testUser.publicKey,
          stakerTokenAccount: testUserTokenAccount,
          escrowAccount: escrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();

      let agentData = await program.account.agent.fetch(agentPda);
      assert.equal(agentData.serviceCount, 0);

      const service = Keypair.generate();
      await program.methods
        .registerService(
          "https://api.lifecycle.com",
          "Lifecycle Service",
          "Test service lifecycle",
          "data",
          new anchor.BN(1_000_000),
          [mint]
        )
        .accounts({
          service: service.publicKey,
          agent: agentPda,
          owner: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser, service])
        .rpc();

      servicePda = service.publicKey;

      agentData = await program.account.agent.fetch(agentPda);
      assert.equal(agentData.serviceCount, 1);

      await program.methods
        .deprecateService()
        .accounts({
          service: servicePda,
          owner: testUser.publicKey,
        })
        .signers([testUser])
        .rpc();

      const serviceData = await program.account.service.fetch(servicePda);
      assert.equal(serviceData.status.deprecated !== undefined, true);

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
      assert.equal(agentData.serviceCount, 0);

      try {
        await program.account.service.fetch(servicePda);
        assert.fail("Service account should be closed");
      } catch (error) {
        assert.include(error.toString(), "Account does not exist");
      }
    });
  });

  describe("multiple_services_lifecycle", () => {
    let testUser: Keypair;
    let testUserTokenAccount: PublicKey;
    let agentPda: PublicKey;
    let service1: Keypair;
    let service2: Keypair;
    let service3: Keypair;

    before(async () => {
      testUser = Keypair.generate();

      const airdropSig = await provider.connection.requestAirdrop(
        testUser.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      testUserTokenAccount = await createAccount(
        provider.connection,
        testUser,
        mint,
        testUser.publicKey
      );

      await mintTo(
        provider.connection,
        user,
        mint,
        testUserTokenAccount,
        user,
        5_000_000_000
      );

      const [agentAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), testUser.publicKey.toBuffer()],
        program.programId
      );
      agentPda = agentAccount;

      await program.methods
        .registerAgent(
          "did:x402:multiservice",
          "cert",
          new anchor.BN(1_000_000_000),
          "https://metadata.example.com"
        )
        .accounts({
          agent: agentPda,
          signer: testUser.publicKey,
          stakerTokenAccount: testUserTokenAccount,
          escrowAccount: escrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();
    });

    it("tracks service_count correctly with multiple services", async () => {
      let agentData = await program.account.agent.fetch(agentPda);
      assert.equal(agentData.serviceCount, 0);

      service1 = Keypair.generate();
      await program.methods
        .registerService(
          "https://api.service1.com",
          "Service 1",
          "First service",
          "data",
          new anchor.BN(1_000_000),
          [mint]
        )
        .accounts({
          service: service1.publicKey,
          agent: agentPda,
          owner: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser, service1])
        .rpc();

      agentData = await program.account.agent.fetch(agentPda);
      assert.equal(agentData.serviceCount, 1);

      service2 = Keypair.generate();
      await program.methods
        .registerService(
          "https://api.service2.com",
          "Service 2",
          "Second service",
          "data",
          new anchor.BN(2_000_000),
          [mint]
        )
        .accounts({
          service: service2.publicKey,
          agent: agentPda,
          owner: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser, service2])
        .rpc();

      agentData = await program.account.agent.fetch(agentPda);
      assert.equal(agentData.serviceCount, 2);

      service3 = Keypair.generate();
      await program.methods
        .registerService(
          "https://api.service3.com",
          "Service 3",
          "Third service",
          "data",
          new anchor.BN(3_000_000),
          [mint]
        )
        .accounts({
          service: service3.publicKey,
          agent: agentPda,
          owner: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser, service3])
        .rpc();

      agentData = await program.account.agent.fetch(agentPda);
      assert.equal(agentData.serviceCount, 3);

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
      assert.equal(agentData.serviceCount, 2);

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
      assert.equal(agentData.serviceCount, 1);

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
      assert.equal(agentData.serviceCount, 0);
    });
  });

  describe("suspended_service_closure", () => {
    let testUser: Keypair;
    let testUserTokenAccount: PublicKey;
    let agentPda: PublicKey;
    let servicePda: PublicKey;

    before(async () => {
      testUser = Keypair.generate();

      const airdropSig = await provider.connection.requestAirdrop(
        testUser.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      testUserTokenAccount = await createAccount(
        provider.connection,
        testUser,
        mint,
        testUser.publicKey
      );

      await mintTo(
        provider.connection,
        user,
        mint,
        testUserTokenAccount,
        user,
        5_000_000_000
      );

      const [agentAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), testUser.publicKey.toBuffer()],
        program.programId
      );
      agentPda = agentAccount;

      await program.methods
        .registerAgent(
          "did:x402:suspended",
          "cert",
          new anchor.BN(1_000_000_000),
          "https://metadata.example.com"
        )
        .accounts({
          agent: agentPda,
          signer: testUser.publicKey,
          stakerTokenAccount: testUserTokenAccount,
          escrowAccount: escrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();

      const service = Keypair.generate();
      await program.methods
        .registerService(
          "https://api.suspended.com",
          "Suspended Service",
          "Will be suspended",
          "data",
          new anchor.BN(1_000_000),
          [mint]
        )
        .accounts({
          service: service.publicKey,
          agent: agentPda,
          owner: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser, service])
        .rpc();

      servicePda = service.publicKey;
    });

    it("closes suspended service and decrements service_count", async () => {
      let agentData = await program.account.agent.fetch(agentPda);
      assert.equal(agentData.serviceCount, 1);

      await program.methods
        .suspendService()
        .accounts({
          service: servicePda,
          authority: daoAuthority.publicKey,
        })
        .signers([daoAuthority])
        .rpc();

      const serviceData = await program.account.service.fetch(servicePda);
      assert.equal(serviceData.status.suspended !== undefined, true);

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
      assert.equal(agentData.serviceCount, 0);

      try {
        await program.account.service.fetch(servicePda);
        assert.fail("Service account should be closed");
      } catch (error) {
        assert.include(error.toString(), "Account does not exist");
      }
    });
  });

  describe("complete_agent_lifecycle", () => {
    let testUser: Keypair;
    let testUserTokenAccount: PublicKey;
    let agentPda: PublicKey;

    before(async () => {
      testUser = Keypair.generate();

      const airdropSig = await provider.connection.requestAirdrop(
        testUser.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      testUserTokenAccount = await createAccount(
        provider.connection,
        testUser,
        mint,
        testUser.publicKey
      );

      await mintTo(
        provider.connection,
        user,
        mint,
        testUserTokenAccount,
        user,
        5_000_000_000
      );

      const [agentAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), testUser.publicKey.toBuffer()],
        program.programId
      );
      agentPda = agentAccount;
    });

    it("prevents agent close with active services", async () => {
      await program.methods
        .registerAgent(
          "did:x402:fullcycle",
          "cert",
          new anchor.BN(1_000_000_000),
          "https://metadata.example.com"
        )
        .accounts({
          agent: agentPda,
          signer: testUser.publicKey,
          stakerTokenAccount: testUserTokenAccount,
          escrowAccount: escrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();

      const service = Keypair.generate();
      await program.methods
        .registerService(
          "https://api.fullcycle.com",
          "Full Cycle Service",
          "Test full agent lifecycle",
          "data",
          new anchor.BN(1_000_000),
          [mint]
        )
        .accounts({
          service: service.publicKey,
          agent: agentPda,
          owner: testUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser, service])
        .rpc();

      const agentData = await program.account.agent.fetch(agentPda);
      assert.equal(agentData.serviceCount, 1);

      try {
        await program.methods
          .closeAgent()
          .accounts({
            agent: agentPda,
            recipient: testUser.publicKey,
          })
          .signers([testUser])
          .rpc();

        assert.fail("Should have failed with CannotCloseWithServices");
      } catch (error) {
        assert.include(error.toString(), "CannotCloseWithServices");
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
      assert.equal(agentDataAfterClose.serviceCount, 0);
    });
  });
});
