import { Request, Response, NextFunction } from 'express';
export interface WebhookHandlers {
    onOrderCreated?: (order: any) => Promise<void>;
    onOrderPaid?: (order: any) => Promise<void>;
    onOrderCancelled?: (order: any) => Promise<void>;
    onOrderRefunded?: (order: any) => Promise<void>;
}
export declare class ShopifyWebhookHandler {
    private secret;
    private handlers;
    constructor(secret: string, handlers: WebhookHandlers);
    verifyWebhook(req: Request, res: Response, next: NextFunction): void;
    handleWebhook(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=webhooks.d.ts.map