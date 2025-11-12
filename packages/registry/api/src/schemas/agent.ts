import { z } from 'zod';

export const RegisterAgentSchema = z.object({
  walletAddress: z.string().length(44),
  did: z.string().optional(),
  visaTapCert: z.string().optional(),
  stakedSol: z.number().nonnegative(),
  metadataUri: z.string().url().optional(),
});

export const UpdateAgentSchema = z.object({
  did: z.string().optional(),
  visaTapCert: z.string().optional(),
  metadataUri: z.string().url().optional(),
  status: z.enum(['ACTIVE', 'PAUSED']).optional(),
});

export const RecordTransactionSchema = z.object({
  agentId: z.string().cuid(),
  serviceId: z.string().cuid(),
  amountUsdc: z.number().positive(),
  token: z.string(),
  signature: z.string(),
  responseTimeMs: z.number().nonnegative().optional(),
  status: z.enum(['PENDING', 'CONFIRMING', 'CONFIRMED', 'FAILED']),
  blockHash: z.string().optional(),
  slot: z.number().optional(),
  paymentProof: z.string().optional(),
});

export const RateServiceSchema = z.object({
  transactionId: z.string().cuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export type RegisterAgentInput = z.infer<typeof RegisterAgentSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
export type RecordTransactionInput = z.infer<typeof RecordTransactionSchema>;
export type RateServiceInput = z.infer<typeof RateServiceSchema>;
