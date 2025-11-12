import { Request, Response, NextFunction } from 'express';
export interface WebhookHandlers {
    onOrderCreated?: (order: any) => Promise<void>;
    onOrderUpdated?: (order: any) => Promise<void>;
    onOrderDeleted?: (order: any) => Promise<void>;
    onOrderRestored?: (order: any) => Promise<void>;
}
export declare class WooCommerceWebhookHandler {
    private secret;
    private handlers;
    constructor(secret: string, handlers: WebhookHandlers);
    verifyWebhook(req: Request, res: Response, next: NextFunction): void;
    handleWebhook(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=webhooks.d.ts.map