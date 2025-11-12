import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface WebhookHandlers {
  onOrderCreated?: (order: any) => Promise<void>;
  onOrderUpdated?: (order: any) => Promise<void>;
  onOrderDeleted?: (order: any) => Promise<void>;
  onOrderRestored?: (order: any) => Promise<void>;
}

export class WooCommerceWebhookHandler {
  private secret: string;
  private handlers: WebhookHandlers;

  constructor(secret: string, handlers: WebhookHandlers) {
    this.secret = secret;
    this.handlers = handlers;
  }

  verifyWebhook(req: Request, res: Response, next: NextFunction): void {
    const signature = req.get('X-WC-Webhook-Signature');

    if (!signature) {
      res.status(401).json({ error: 'Missing webhook signature' });
      return;
    }

    const body = JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha256', this.secret)
      .update(body)
      .digest('base64');

    if (hash !== signature) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    next();
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    const topic = req.get('X-WC-Webhook-Topic');

    try {
      switch (topic) {
        case 'order.created':
          if (this.handlers.onOrderCreated) {
            await this.handlers.onOrderCreated(req.body);
          }
          break;

        case 'order.updated':
          if (this.handlers.onOrderUpdated) {
            await this.handlers.onOrderUpdated(req.body);
          }
          break;

        case 'order.deleted':
          if (this.handlers.onOrderDeleted) {
            await this.handlers.onOrderDeleted(req.body);
          }
          break;

        case 'order.restored':
          if (this.handlers.onOrderRestored) {
            await this.handlers.onOrderRestored(req.body);
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
