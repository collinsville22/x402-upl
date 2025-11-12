import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentVerifier } from '../src/payment-verifier.js';
import { PaymentProof, PaymentRequirement } from '../src/types.js';

describe('PaymentVerifier', () => {
  let verifier: PaymentVerifier;
  const recipientAddress = 'RecipientWalletAddress123456789';

  beforeEach(() => {
    verifier = new PaymentVerifier('https://api.devnet.solana.com', recipientAddress);
  });

  describe('verifyPayment', () => {
    it('should reject payment with wrong request ID', async () => {
      const requirement: PaymentRequirement = {
        amount: 0.001,
        recipient: recipientAddress,
        currency: 'CASH',
        mint: 'CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT',
        expiresAt: Date.now() + 300000,
        requestId: 'request123',
      };

      const proof: PaymentProof = {
        signature: 'sig123',
        amount: 0.001,
        sender: 'sender123',
        recipient: recipientAddress,
        mint: 'CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT',
        timestamp: Date.now(),
        requestId: 'wrong_request',
      };

      const result = await verifier.verifyPayment(proof, requirement);

      expect(result).toBe(false);
    });

    it('should reject payment with insufficient amount', async () => {
      const requirement: PaymentRequirement = {
        amount: 1.0,
        recipient: recipientAddress,
        currency: 'CASH',
        mint: 'CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT',
        expiresAt: Date.now() + 300000,
        requestId: 'request123',
      };

      const proof: PaymentProof = {
        signature: 'sig123',
        amount: 0.5,
        sender: 'sender123',
        recipient: recipientAddress,
        mint: 'CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT',
        timestamp: Date.now(),
        requestId: 'request123',
      };

      const result = await verifier.verifyPayment(proof, requirement);

      expect(result).toBe(false);
    });

    it('should reject expired payment', async () => {
      const requirement: PaymentRequirement = {
        amount: 0.001,
        recipient: recipientAddress,
        currency: 'CASH',
        mint: 'CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT',
        expiresAt: Date.now() - 1000,
        requestId: 'request123',
      };

      const proof: PaymentProof = {
        signature: 'sig123',
        amount: 0.001,
        sender: 'sender123',
        recipient: recipientAddress,
        mint: 'CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT',
        timestamp: Date.now(),
        requestId: 'request123',
      };

      const result = await verifier.verifyPayment(proof, requirement);

      expect(result).toBe(false);
    });

    it('should not allow duplicate payment verification', async () => {
      const requirement: PaymentRequirement = {
        amount: 0.001,
        recipient: recipientAddress,
        currency: 'CASH',
        mint: 'CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT',
        expiresAt: Date.now() + 300000,
        requestId: 'request123',
      };

      const proof: PaymentProof = {
        signature: 'verified_sig',
        amount: 0.001,
        sender: 'sender123',
        recipient: recipientAddress,
        mint: 'CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT',
        timestamp: Date.now(),
        requestId: 'request123',
      };

      (verifier as any).verifiedPayments.add('verified_sig');

      const result = await verifier.verifyPayment(proof, requirement);

      expect(result).toBe(false);
    });
  });

  describe('isPaymentVerified', () => {
    it('should return true for verified payment', () => {
      (verifier as any).verifiedPayments.add('sig123');

      expect(verifier.isPaymentVerified('sig123')).toBe(true);
    });

    it('should return false for unverified payment', () => {
      expect(verifier.isPaymentVerified('unknown_sig')).toBe(false);
    });
  });

  describe('clearVerifiedPayment', () => {
    it('should remove verified payment from set', () => {
      (verifier as any).verifiedPayments.add('sig123');

      verifier.clearVerifiedPayment('sig123');

      expect(verifier.isPaymentVerified('sig123')).toBe(false);
    });
  });
});
