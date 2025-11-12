import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface WebhookHandlers {
  onOrderCreated?: (order: any) => Promise<void>;
  onOrderPaid?: (order: any) => Promise<void>;
  onOrderCancelled?: (order: any) => Promise<void>;
  onOrderRefunded?: (order: any) => Promise<void>;
}

export class ShopifyWebhookHandler {
  private secret: string;
  private handlers: WebhookHandlers;

  constructor(secret: string, handlers: WebhookHandlers) {
    this.secret = secret;
    this.handlers = handlers;
  }

  verifyWebhook(req: Request, res: Response, next: NextFunction): void {
    const hmac = req.get('X-Shopify-Hmac-Sha256');

    if (!hmac) {
      res.status(401).json({ error: 'Missing HMAC signature' });
      return;
    }

    const body = JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha256', this.secret)
      .update(body, 'utf8')
      .digest('base64');

    if (hash !== hmac) {
      res.status(401).json({ error: 'Invalid HMAC signature' });
      return;
    }

    next();
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    const topic = req.get('X-Shopify-Topic');

    try {
      switch (topic) {
        case 'orders/create':
          if (this.handlers.onOrderCreated) {
            await this.handlers.onOrderCreated(req.body);
          }
          break;

        case 'orders/paid':
          if (this.handlers.onOrderPaid) {
            await this.handlers.onOrderPaid(req.body);
          }
          break;

        case 'orders/cancelled':
          if (this.handlers.onOrderCancelled) {
            await this.handlers.onOrderCancelled(req.body);
          }
          break;

        case 'refunds/create':
          if (this.handlers.onOrderRefunded) {
            await this.handlers.onOrderRefunded(req.body);
          }
          break;

        default:
          console.log(`Unhandled webhook topic: ${topic}`);
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook handling error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
}
