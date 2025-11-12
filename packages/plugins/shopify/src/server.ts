import express, { Request, Response } from 'express';
import { ShopifyX402Plugin } from './index';

export class ShopifyX402Server {
  private app: express.Application;
  private plugin: ShopifyX402Plugin;
  private port: number;

  constructor(plugin: ShopifyX402Plugin, port: number = 3000) {
    this.plugin = plugin;
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    this.app.post('/api/create-payment', async (req: Request, res: Response) => {
      try {
        const { orderId, amount, currency } = req.body;

        if (!orderId || !amount || !currency) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const paymentSession = await this.plugin.createPaymentSession(
          orderId,
          parseFloat(amount),
          currency
        );

        res.json(paymentSession);
      } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({ error: 'Failed to create payment session' });
      }
    });

    this.app.post('/api/verify-payment', async (req: Request, res: Response) => {
      try {
        const { signature, amount } = req.body;

        if (!signature || !amount) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const verified = await this.plugin.verifyPayment(
          signature,
          parseFloat(amount)
        );

        res.json({ verified });
      } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
      }
    });

    this.app.post('/api/fulfill-order', async (req: Request, res: Response) => {
      try {
        const { orderId, signature } = req.body;

        if (!orderId || !signature) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        await this.plugin.fulfillOrder(orderId, signature);

        res.json({ success: true });
      } catch (error) {
        console.error('Order fulfillment error:', error);
        res.status(500).json({ error: 'Failed to fulfill order' });
      }
    });

    this.app.post('/api/refund-order', async (req: Request, res: Response) => {
      try {
        const { orderId, amount, reason } = req.body;

        if (!orderId || !amount) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const refundId = await this.plugin.refundOrder(
          orderId,
          parseFloat(amount),
          reason || 'Customer requested refund'
        );

        res.json({ refundId });
      } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({ error: 'Failed to process refund' });
      }
    });

    this.app.get('/api/merchant-address', (req: Request, res: Response) => {
      res.json({ address: this.plugin.getMerchantAddress() });
    });

    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`Shopify x402 server running on port ${this.port}`);
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}
