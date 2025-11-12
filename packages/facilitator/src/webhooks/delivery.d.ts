export declare class WebhookDeliveryService {
    private maxRetries;
    private retryDelays;
    private logger;
    constructor(logger?: any);
    enqueueWebhook(webhookUrl: string, eventType: string, payload: Record<string, any>): Promise<string>;
    private deliverWebhook;
    retryFailedWebhooks(): Promise<void>;
    getWebhookStatus(webhookId: string): Promise<any>;
}
export declare const webhookService: WebhookDeliveryService;
//# sourceMappingURL=delivery.d.ts.map