import express, { Request, Response } from 'express';
import { WordPressX402Plugin } from './index';

export class WordPressX402Server {
  private app: express.Application;
  private plugin: WordPressX402Plugin;
  private port: number;

  constructor(plugin: WordPressX402Plugin, port: number = 3000) {
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

        const payment = await this.plugin.createPaymentPost(
          orderId,
          parseFloat(amount),
          currency
        );

        res.json(payment);
      } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({ error: 'Failed to create payment' });
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

    this.app.post('/api/complete-payment', async (req: Request, res: Response) => {
      try {
        const { postId, signature } = req.body;

        if (!postId || !signature) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        await this.plugin.completePayment(parseInt(postId), signature);

        res.json({ success: true });
      } catch (error) {
        console.error('Payment completion error:', error);
        res.status(500).json({ error: 'Failed to complete payment' });
      }
    });

    this.app.get('/api/post/:id', async (req: Request, res: Response) => {
      try {
        const postId = parseInt(req.params.id);

        if (isNaN(postId)) {
          return res.status(400).json({ error: 'Invalid post ID' });
        }

        const post = await this.plugin.getPost(postId);

        res.json({ post });
      } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({ error: 'Failed to get post' });
      }
    });

    this.app.get('/api/posts', async (req: Request, res: Response) => {
      try {
        const filters = {
          status: req.query.status as string,
          page: req.query.page ? parseInt(req.query.page as string) : undefined,
          perPage: req.query.per_page ? parseInt(req.query.per_page as string) : undefined,
        };

        const posts = await this.plugin.listPosts(filters);

        res.json({ posts });
      } catch (error) {
        console.error('List posts error:', error);
        res.status(500).json({ error: 'Failed to list posts' });
      }
    });

    this.app.post('/api/posts', async (req: Request, res: Response) => {
      try {
        const { title, content, status, meta } = req.body;

        if (!title || !content) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const post = await this.plugin.createPost({
          title,
          content,
          status: status || 'draft',
          meta,
        });

        res.json({ post });
      } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: 'Failed to create post' });
      }
    });

    this.app.put('/api/posts/:id', async (req: Request, res: Response) => {
      try {
        const postId = parseInt(req.params.id);

        if (isNaN(postId)) {
          return res.status(400).json({ error: 'Invalid post ID' });
        }

        const { title, content, status, meta } = req.body;

        const post = await this.plugin.updatePost(postId, {
          title,
          content,
          status,
          meta,
        });

        res.json({ post });
      } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({ error: 'Failed to update post' });
      }
    });

    this.app.post('/api/users', async (req: Request, res: Response) => {
      try {
        const { username, email, password, roles } = req.body;

        if (!username || !email || !password) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const user = await this.plugin.createUser({
          username,
          email,
          password,
          roles,
        });

        res.json({ user });
      } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
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
      console.log(`WordPress x402 server running on port ${this.port}`);
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}
