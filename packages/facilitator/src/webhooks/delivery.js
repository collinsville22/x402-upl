import { prisma } from '../db/client.js';
export class WebhookDeliveryService {
    maxRetries = 3;
    retryDelays = [60000, 300000, 900000];
    logger;
    constructor(logger) {
        this.logger = logger || console;
    }
    async enqueueWebhook(webhookUrl, eventType, payload) {
        const webhook = await prisma.webhookDelivery.create({
            data: {
                webhookUrl,
                eventType,
                payload,
                status: 'pending',
                attempts: 0,
                maxAttempts: this.maxRetries,
                nextRetryAt: new Date(),
            },
        });
        this.deliverWebhook(webhook.id);
        return webhook.id;
    }
    async deliverWebhook(webhookId) {
        const webhook = await prisma.webhookDelivery.findUnique({
            where: { id: webhookId },
        });
        if (!webhook || webhook.status !== 'pending') {
            return;
        }
        try {
            const webhookConfig = await prisma.webhookConfig.findFirst({
                where: {
                    webhookUrl: webhook.webhookUrl,
                    enabled: true
                }
            });
            if (!webhookConfig) {
                await prisma.webhookDelivery.update({
                    where: { id: webhookId },
                    data: {
                        status: 'failed',
                        error: 'Webhook configuration not found or disabled',
                        completedAt: new Date()
                    }
                });
                return;
            }
            const timestamp = Math.floor(Date.now() / 1000);
            const data = `${timestamp}.${JSON.stringify(webhook.payload)}`;
            const crypto = await import('crypto');
            const signature = crypto
                .createHmac('sha256', webhookConfig.webhookSecret)
                .update(data)
                .digest('hex');
            const response = await fetch(webhook.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'x402-facilitator/2.0',
                    'X-Webhook-Event': webhook.eventType,
                    'X-Webhook-Signature': signature,
                    'X-Webhook-Timestamp': timestamp.toString(),
                },
                body: JSON.stringify(webhook.payload),
                signal: AbortSignal.timeout(10000),
            });
            if (response.ok) {
                await prisma.webhookDelivery.update({
                    where: { id: webhookId },
                    data: {
                        status: 'completed',
                        completedAt: new Date(),
                        lastAttemptAt: new Date(),
                    },
                });
            }
            else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        catch (error) {
            const attempts = webhook.attempts + 1;
            const shouldRetry = attempts < webhook.maxAttempts;
            if (shouldRetry) {
                const nextRetryAt = new Date(Date.now() + this.retryDelays[attempts - 1]);
                await prisma.webhookDelivery.update({
                    where: { id: webhookId },
                    data: {
                        attempts,
                        lastAttemptAt: new Date(),
                        nextRetryAt,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    },
                });
                setTimeout(() => this.deliverWebhook(webhookId), this.retryDelays[attempts - 1]);
            }
            else {
                this.logger.error({
                    err: error,
                    webhookId,
                    webhookUrl: webhook.webhookUrl,
                    attempts
                }, 'Webhook delivery failed after max retries');
                await prisma.webhookDelivery.update({
                    where: { id: webhookId },
                    data: {
                        status: 'failed',
                        attempts,
                        lastAttemptAt: new Date(),
                        completedAt: new Date(),
                        error: error instanceof Error ? error.message : 'Unknown error',
                    },
                });
            }
        }
    }
    async retryFailedWebhooks() {
        const pendingWebhooks = await prisma.webhookDelivery.findMany({
            where: {
                status: 'pending',
                nextRetryAt: {
                    lte: new Date(),
                },
            },
            take: 100,
        });
        for (const webhook of pendingWebhooks) {
            await this.deliverWebhook(webhook.id);
        }
    }
    async getWebhookStatus(webhookId) {
        return prisma.webhookDelivery.findUnique({
            where: { id: webhookId },
            select: {
                id: true,
                status: true,
                attempts: true,
                lastAttemptAt: true,
                completedAt: true,
                error: true,
            },
        });
    }
}
export const webhookService = new WebhookDeliveryService();
//# sourceMappingURL=delivery.js.map