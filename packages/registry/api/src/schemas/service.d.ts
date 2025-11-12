import { z } from 'zod';
export declare const RegisterServiceSchema: z.ZodObject<{
    url: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    category: z.ZodString;
    ownerWalletAddress: z.ZodString;
    pricePerCall: z.ZodNumber;
    pricingModel: z.ZodDefault<z.ZodEnum<["FLAT", "TIERED", "DYNAMIC"]>>;
    acceptedTokens: z.ZodArray<z.ZodString, "many">;
    openapiSchemaUri: z.ZodOptional<z.ZodString>;
    inputSchema: z.ZodOptional<z.ZodString>;
    outputSchema: z.ZodOptional<z.ZodString>;
    capabilities: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    pricePerCall: number;
    acceptedTokens: string[];
    description: string;
    name: string;
    category: string;
    capabilities: string[];
    tags: string[];
    url: string;
    ownerWalletAddress: string;
    pricingModel: "FLAT" | "TIERED" | "DYNAMIC";
    inputSchema?: string | undefined;
    outputSchema?: string | undefined;
    openapiSchemaUri?: string | undefined;
}, {
    pricePerCall: number;
    acceptedTokens: string[];
    description: string;
    name: string;
    category: string;
    url: string;
    ownerWalletAddress: string;
    capabilities?: string[] | undefined;
    tags?: string[] | undefined;
    inputSchema?: string | undefined;
    outputSchema?: string | undefined;
    pricingModel?: "FLAT" | "TIERED" | "DYNAMIC" | undefined;
    openapiSchemaUri?: string | undefined;
}>;
export declare const UpdateServiceSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    pricePerCall: z.ZodOptional<z.ZodNumber>;
    acceptedTokens: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "PAUSED", "DEPRECATED"]>>;
}, "strip", z.ZodTypeAny, {
    pricePerCall?: number | undefined;
    acceptedTokens?: string[] | undefined;
    description?: string | undefined;
    name?: string | undefined;
    capabilities?: string[] | undefined;
    tags?: string[] | undefined;
    status?: "ACTIVE" | "PAUSED" | "DEPRECATED" | undefined;
}, {
    pricePerCall?: number | undefined;
    acceptedTokens?: string[] | undefined;
    description?: string | undefined;
    name?: string | undefined;
    capabilities?: string[] | undefined;
    tags?: string[] | undefined;
    status?: "ACTIVE" | "PAUSED" | "DEPRECATED" | undefined;
}>;
export declare const DiscoverServicesSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    maxPrice: z.ZodOptional<z.ZodNumber>;
    minReputation: z.ZodOptional<z.ZodNumber>;
    minUptime: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    sortBy: z.ZodDefault<z.ZodEnum<["price", "reputation", "value", "recent"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sortBy: "recent" | "price" | "value" | "reputation";
    limit: number;
    offset: number;
    category?: string | undefined;
    tags?: string[] | undefined;
    query?: string | undefined;
    maxPrice?: number | undefined;
    minReputation?: number | undefined;
    minUptime?: number | undefined;
}, {
    category?: string | undefined;
    tags?: string[] | undefined;
    query?: string | undefined;
    sortBy?: "recent" | "price" | "value" | "reputation" | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    maxPrice?: number | undefined;
    minReputation?: number | undefined;
    minUptime?: number | undefined;
}>;
export type RegisterServiceInput = z.infer<typeof RegisterServiceSchema>;
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;
export type DiscoverServicesInput = z.infer<typeof DiscoverServicesSchema>;
//# sourceMappingURL=service.d.ts.map