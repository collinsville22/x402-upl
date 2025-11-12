import { z } from 'zod';

export const RegisterServiceSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  category: z.string().min(1).max(50),
  ownerWalletAddress: z.string().length(44),
  pricePerCall: z.number().positive(),
  pricingModel: z.enum(['FLAT', 'TIERED', 'DYNAMIC']).default('FLAT'),
  acceptedTokens: z.array(z.string()).min(1),
  openapiSchemaUri: z.string().url().optional(),
  inputSchema: z.string().optional(),
  outputSchema: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export const UpdateServiceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(1000).optional(),
  pricePerCall: z.number().positive().optional(),
  acceptedTokens: z.array(z.string()).min(1).optional(),
  capabilities: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'DEPRECATED']).optional(),
});

export const DiscoverServicesSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  maxPrice: z.number().positive().optional(),
  minReputation: z.number().min(0).max(10000).optional(),
  minUptime: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['price', 'reputation', 'value', 'recent']).default('value'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type RegisterServiceInput = z.infer<typeof RegisterServiceSchema>;
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;
export type DiscoverServicesInput = z.infer<typeof DiscoverServicesSchema>;
