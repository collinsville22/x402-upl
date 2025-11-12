export declare function generateWebhookSignature(payload: Record<string, any>, secret: string, timestamp: number): string;
export declare function verifyWebhookSignature(payload: Record<string, any>, signature: string, secret: string, timestamp: number, toleranceSeconds?: number): boolean;
export declare function createWebhookHeaders(payload: Record<string, any>, secret: string, eventType: string): Record<string, string>;
//# sourceMappingURL=webhook-signature.d.ts.map