# x402 Solana Payments - WordPress Plugin

Production WordPress plugin for accepting Solana cryptocurrency payments via x402 protocol.

## Features

- Accept SOL, USDC, and CASH token payments
- WooCommerce payment gateway integration
- Automatic on-chain payment verification
- Transaction history and reporting
- Admin dashboard with balance display
- REST API endpoints for payment processing
- Webhook support for payment notifications

## Requirements

- WordPress 6.0+
- PHP 8.0+
- WooCommerce 7.0+ (optional, for e-commerce)
- x402 API server running (Node.js backend)

## Installation

### Method 1: Upload via WordPress Admin

1. Download the plugin files
2. Zip the `wordpress-php` folder
3. Go to WordPress Admin > Plugins > Add New
4. Click "Upload Plugin"
5. Select the zip file
6. Click "Install Now"
7. Activate the plugin

### Method 2: FTP Upload

1. Upload `wordpress-php` folder to `/wp-content/plugins/`
2. Rename folder to `x402-payments`
3. Go to WordPress Admin > Plugins
4. Activate "x402 Solana Payments"

## Configuration

### Step 1: Configure Plugin Settings

1. Go to **WordPress Admin > x402 Payments > Settings**
2. Configure:
   - **Solana Network**: devnet, testnet, or mainnet-beta
   - **Merchant Wallet Address**: Your Solana wallet address
   - **API Server URL**: Your x402 API server (default: http://localhost:3000)
   - **Registry URL**: https://registry.x402.network
   - **Facilitator URL**: https://facilitator.payai.network
3. Click "Save Changes"

### Step 2: Configure WooCommerce (if using)

1. Go to **WooCommerce > Settings > Payments**
2. Enable "x402 Solana Payments"
3. Click "Manage"
4. Configure:
   - **Title**: Solana Payment
   - **Description**: Pay with SOL, USDC, or other Solana tokens
   - **Accepted Assets**: Select which tokens to accept
   - **Order Status After Payment**: Processing or Completed
5. Click "Save changes"

## Usage

### For WooCommerce Stores

**Customer Flow:**
1. Customer adds products to cart
2. Customer proceeds to checkout
3. Customer selects "Solana Payment" as payment method
4. Customer chooses asset (SOL, USDC, CASH)
5. Customer is redirected to payment page
6. Customer pays with Solana wallet (Phantom, Solflare, etc.)
7. Payment is verified on-chain
8. Order is automatically completed
9. Customer receives confirmation

**Merchant Dashboard:**
- View all transactions: **x402 Payments > Transactions**
- Check wallet balance: **x402 Payments > Settings**
- View transaction on Solana Explorer (click transaction link)

### For Custom Implementations

**REST API Endpoints:**

#### Create Payment
```
POST /wp-json/x402/v1/payment/create
Content-Type: application/json

{
  "orderId": "12345",
  "amount": "99.99",
  "currency": "USD"
}
```

Response:
```json
{
  "sessionId": "wp_12345_1234567890",
  "paymentUrl": "/pay/wp_12345_1234567890",
  "payTo": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "amount": "99.99",
  "asset": "USDC",
  "network": "devnet"
}
```

#### Verify Payment
```
POST /wp-json/x402/v1/payment/verify
Content-Type: application/json

{
  "signature": "5VERv8NMvz...",
  "amount": "99.99"
}
```

Response:
```json
{
  "verified": true
}
```

#### Webhook Handler
```
POST /wp-json/x402/v1/payment/webhook
Content-Type: application/json

{
  "signature": "5VERv8NMvz...",
  "sessionId": "wp_12345_1234567890"
}
```

### WordPress Actions and Filters

**Actions:**
```php
do_action('x402_payment_verified', $signature, $amount);

do_action('x402_payment_completed', $payment, $signature);
```

**Example Hook:**
```php
add_action('x402_payment_completed', function($payment, $signature) {
    error_log('Payment completed: ' . $signature);

}, 10, 2);
```

## Database Structure

Plugin creates `wp_x402_payments` table:

```sql
CREATE TABLE wp_x402_payments (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    post_id bigint(20) unsigned NOT NULL,
    order_id varchar(100) NOT NULL,
    session_id varchar(100) NOT NULL,
    amount decimal(20,9) NOT NULL,
    currency varchar(10) NOT NULL,
    asset varchar(10) NOT NULL,
    merchant_address varchar(100) NOT NULL,
    customer_address varchar(100) DEFAULT NULL,
    signature varchar(200) DEFAULT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending',
    metadata longtext,
    created_at datetime NOT NULL,
    updated_at datetime NOT NULL,
    PRIMARY KEY (id),
    KEY order_id (order_id),
    KEY session_id (session_id),
    KEY status (status)
);
```

## Security

- REST API endpoints are public (required for payment processing)
- AJAX actions use WordPress nonces
- All input is sanitized and validated
- Prepared statements for database queries
- On-chain payment verification (cannot be faked)
- Signature verification for webhooks

## Troubleshooting

### Payment Not Completing

1. Check x402 API server is running
2. Verify merchant wallet address is correct
3. Check Solana network matches (devnet vs mainnet)
4. View browser console for JavaScript errors
5. Check WordPress debug.log

### Balance Not Showing

1. Verify merchant wallet address is correct
2. Check Solana RPC is accessible
3. Try different network (devnet/mainnet)

### WooCommerce Gateway Not Appearing

1. Ensure WooCommerce is installed and active
2. Clear WordPress cache
3. Deactivate and reactivate plugin

## Development

### File Structure

```
wordpress-php/
├── x402-payments.php                    Main plugin file
├── includes/
│   ├── class-x402-client.php           x402 API client
│   ├── class-x402-admin.php            Admin dashboard
│   ├── class-x402-payment-handler.php  Payment processing
│   └── class-x402-woocommerce-gateway.php  WooCommerce gateway
├── assets/
│   ├── admin.css                        Admin styles
│   ├── admin.js                         Admin scripts
│   └── solana-logo.png                  Payment method icon
└── README.md
```

### Hooks for Developers

```php
add_filter('x402_payment_amount', function($amount, $order_id) {
    return $amount;
}, 10, 2);

add_filter('x402_merchant_address', function($address) {
    return $address;
});

add_filter('x402_accepted_assets', function($assets) {
    return ['SOL', 'USDC', 'CASH'];
});
```

## Support

- Documentation: https://docs.x402.network
- GitHub: https://github.com/x402-upl/x402-upl
- Discord: https://discord.gg/x402

## License

Apache-2.0

## Credits

Built by the x402-upl team for the Solana AI Hackathon.
