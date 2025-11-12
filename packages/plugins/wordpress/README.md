# x402-upl WordPress Plugin

Production WordPress plugin for accepting x402 cryptocurrency payments on Solana.

## Installation

```bash
npm install @x402-upl/wordpress-plugin
```

## Quick Start

```typescript
import { Keypair } from '@solana/web3.js';
import { WordPressX402Plugin, WordPressX402Server } from '@x402-upl/wordpress-plugin';

const merchantWallet = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(process.env.MERCHANT_PRIVATE_KEY!))
);

const plugin = new WordPressX402Plugin({
  wordpressUrl: process.env.WORDPRESS_URL!,
  wordpressUser: process.env.WORDPRESS_USER!,
  wordpressPassword: process.env.WORDPRESS_PASSWORD!,
  solanaNetwork: 'devnet',
  merchantWallet,
});

const server = new WordPressX402Server(plugin, 3000);
server.start();
```

## API Endpoints

### Create Payment

```http
POST /api/create-payment
Content-Type: application/json

{
  "orderId": "order-123",
  "amount": "99.99",
  "currency": "USD"
}
```

### Verify Payment

```http
POST /api/verify-payment
Content-Type: application/json

{
  "signature": "transaction-signature",
  "amount": "99.99"
}
```

### Complete Payment

```http
POST /api/complete-payment
Content-Type: application/json

{
  "postId": 123,
  "signature": "transaction-signature"
}
```

### Get Post

```http
GET /api/post/123
```

### List Posts

```http
GET /api/posts?status=publish&page=1&per_page=10
```

### Create Post

```http
POST /api/posts
Content-Type: application/json

{
  "title": "Post Title",
  "content": "Post content",
  "status": "publish",
  "meta": {
    "custom_field": "value"
  }
}
```

### Update Post

```http
PUT /api/posts/123
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "publish"
}
```

### Create User

```http
POST /api/users
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "secure-password",
  "roles": ["subscriber"]
}
```

### Get Merchant Address

```http
GET /api/merchant-address
```

## Configuration

### Environment Variables

```bash
WORDPRESS_URL=https://yoursite.com
WORDPRESS_USER=admin
WORDPRESS_PASSWORD=your-app-password
MERCHANT_PRIVATE_KEY=[1,2,3,...]
SOLANA_NETWORK=devnet
```

### WordPress REST API Setup

1. Go to Users > Profile
2. Scroll to Application Passwords
3. Create new application password
4. Use this for API authentication

### Enable REST API

```php
add_filter('rest_authentication_errors', function($result) {
    if (!empty($result)) {
        return $result;
    }
    if (!is_user_logged_in()) {
        return new WP_Error(
            'rest_not_logged_in',
            __('You are not currently logged in.'),
            array('status' => 401)
        );
    }
    return $result;
});
```

## Payment Flow

1. User requests content/service
2. Server creates payment post with metadata
3. User pays with Solana wallet
4. Server verifies payment on-chain
5. Server marks payment as completed
6. User gains access to content/service

## Custom Post Meta

Payment posts store metadata:

- `x402_session_id` - Payment session ID
- `x402_order_id` - Associated order ID
- `x402_amount` - Payment amount
- `x402_currency` - Payment currency
- `x402_merchant` - Merchant Solana address
- `x402_status` - Payment status (pending/completed)
- `x402_signature` - Transaction signature
- `x402_completed_at` - Completion timestamp

## Currency Mapping

| WordPress Currency | Solana Asset |
|-------------------|--------------|
| USD | USDC |
| SOL | SOL |
| CASH | CASH |

## Security

- Basic authentication for WordPress REST API
- On-chain payment verification
- Secure wallet key management
- Transaction confirmation checking
- Application password support

## Testing

```bash
npm test
```

## License

Apache-2.0
