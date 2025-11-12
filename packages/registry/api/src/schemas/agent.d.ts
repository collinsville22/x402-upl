import { z } from 'zod';
export declare const RegisterAgentSchema: z.ZodObject<{
    walletAddress: z.ZodString;
    did: z.ZodOptional<z.ZodString>;
    visaTapCert: z.ZodOptional<z.ZodString>;
    stakedSol: z.ZodNumber;
    metadataUri: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    walletAddress: string;
    stakedSol: number;
    did?: string | undefined;
    visaTapCert?: string | undefined;
    metadataUri?: string | undefined;
}, {
    walletAddress: string;
    stakedSol: number;
    did?: string | undefined;
    visaTapCert?: string | undefined;
    metadataUri?: string | undefined;
}>;
export declare const UpdateAgentSchema: z.ZodObject<{
    did: z.ZodOptional<z.ZodString>;
    visaTapCert: z.ZodOptional<z.ZodString>;
    metadataUri: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "PAUSED"]>>;
}, "strip", z.ZodTypeAny, {
    did?: string | undefined;
    visaTapCert?: string | undefined;
    status?: "ACTIVE" | "PAUSED" | undefined;
    metadataUri?: string | undefined;
}, {
    did?: string | undefined;
    visaTapCert?: string | undefined;
    status?: "ACTIVE" | "PAUSED" | undefined;
    metadataUri?: string | undefined;
}>;
export declare const RecordTransactionSchema: z.ZodObject<{
    agentId: z.ZodString;
    serviceId: z.ZodString;
    amountUsdc: z.ZodNumber;
    token: z.ZodString;
    signature: z.ZodString;
    responseTimeMs: z.ZodOptional<z.ZodNumber>;
    status: z.ZodEnum<["PENDING", "CONFIRMING", "CONFIRMED", "FAILED"]>;
    blockHash: z.ZodOptional<z.ZodString>;
    slot: z.ZodOptional<z.ZodNumber>;
    paymentProof: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    agentId: string;
    status: "FAILED" | "PENDING" | "CONFIRMING" | "CONFIRMED";
    signature: string;
    serviceId: string;
    token: string;
    amountUsdc: number;
    slot?: number | undefined;
    responseTimeMs?: number | undefined;
    blockHash?: string | undefined;
    paymentProof?: string | undefined;
}, {
    agentId: string;
    status: "FAILED" | "PENDING" | "CONFIRMING" | "CONFIRMED";
    signature: string;
    serviceId: string;
    token: string;
    amountUsdc: number;
    slot?: number | undefined;
    responseTimeMs?: number | undefined;
    blockHash?: string | undefined;
    paymentProof?: string | undefined;
}>;
export declare const RateServiceSchema: z.ZodObject<{
    transactionId: z.ZodString;
    rating: z.ZodNumber;
    comment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    transactionId: string;
    rating: number;
    comment?: string | undefined;
}, {
    transactionId: string;
    rating: number;
    comment?: string | undefined;
}>;
export type RegisterAgentInput = z.infer<typeof RegisterAgentSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
export type RecordTransactionInput = z.infer<typeof RecordTransactionSchema>;
export type RateServiceInput = z.infer<typeof RateServiceSchema>;
//# sourceMappingURL=agent.d.ts.map