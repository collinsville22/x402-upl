<?php

if (!defined('ABSPATH')) {
    exit;
}

class X402_WooCommerce_Gateway extends WC_Payment_Gateway {
    public function __construct() {
        $this->id = 'x402';
        $this->icon = X402_PLUGIN_URL . 'assets/solana-logo.png';
        $this->has_fields = false;
        $this->method_title = 'x402 Solana Payments';
        $this->method_description = 'Accept Solana cryptocurrency payments via x402 protocol';

        $this->supports = [
            'products',
            'refunds'
        ];

        $this->init_form_fields();
        $this->init_settings();

        $this->title = $this->get_option('title');
        $this->description = $this->get_option('description');
        $this->enabled = $this->get_option('enabled');

        add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);
        add_action('woocommerce_api_x402_webhook', [$this, 'webhook_handler']);
        add_action('woocommerce_thankyou_' . $this->id, [$this, 'thankyou_page']);
    }

    public function init_form_fields() {
        $this->form_fields = [
            'enabled' => [
                'title' => 'Enable/Disable',
                'type' => 'checkbox',
                'label' => 'Enable x402 Solana Payments',
                'default' => 'yes'
            ],
            'title' => [
                'title' => 'Title',
                'type' => 'text',
                'description' => 'Payment method title shown to customers',
                'default' => 'Solana Payment',
                'desc_tip' => true
            ],
            'description' => [
                'title' => 'Description',
                'type' => 'textarea',
                'description' => 'Payment method description shown to customers',
                'default' => 'Pay with SOL, USDC, or other Solana tokens',
                'desc_tip' => true
            ],
            'accepted_assets' => [
                'title' => 'Accepted Assets',
                'type' => 'multiselect',
                'description' => 'Select which Solana assets to accept',
                'default' => ['SOL', 'USDC'],
                'options' => [
                    'SOL' => 'SOL',
                    'USDC' => 'USDC',
                    'CASH' => 'CASH'
                ]
            ],
            'order_status' => [
                'title' => 'Order Status After Payment',
                'type' => 'select',
                'description' => 'Order status after successful payment',
                'default' => 'processing',
                'options' => [
                    'processing' => 'Processing',
                    'completed' => 'Completed'
                ]
            ]
        ];
    }

    public function payment_fields() {
        if ($this->description) {
            echo wpautop(wptok($this->description));
        }

        $accepted = $this->get_option('accepted_assets', ['SOL', 'USDC']);
        ?>
        <div class="x402-payment-fields">
            <p>
                <label for="x402_asset">Select Payment Asset:</label>
                <select id="x402_asset" name="x402_asset" class="input-select">
                    <?php foreach ($accepted as $asset): ?>
                        <option value="<?php echo esc_attr($asset); ?>">
                            <?php echo esc_html($asset); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </p>
            <p class="x402-info">
                You will be redirected to complete payment with your Solana wallet.
            </p>
        </div>
        <?php
    }

    public function process_payment($order_id) {
        $order = wc_get_order($order_id);

        if (!$order) {
            return ['result' => 'error', 'message' => 'Order not found'];
        }

        $client = new X402_Client();
        $amount = $order->get_total();
        $currency = $order->get_currency();

        $result = $client->create_payment_session($order_id, $amount, $currency);

        if (is_wp_error($result)) {
            wc_add_notice($result->get_error_message(), 'error');
            return ['result' => 'error'];
        }

        global $wpdb;
        $table_name = $wpdb->prefix . 'x402_payments';

        $wpdb->insert($table_name, [
            'post_id' => $order->get_id(),
            'order_id' => (string)$order_id,
            'session_id' => $result['sessionId'],
            'amount' => $amount,
            'currency' => $currency,
            'asset' => $result['asset'],
            'merchant_address' => $result['payTo'],
            'status' => 'pending',
            'created_at' => current_time('mysql'),
            'updated_at' => current_time('mysql')
        ]);

        $order->update_meta_data('_x402_session_id', $result['sessionId']);
        $order->update_meta_data('_x402_payment_url', $result['paymentUrl']);
        $order->update_meta_data('_x402_merchant_address', $result['payTo']);
        $order->update_meta_data('_x402_amount', $result['amount']);
        $order->update_meta_data('_x402_asset', $result['asset']);
        $order->save();

        $order->update_status('pending', 'Awaiting Solana payment');

        WC()->cart->empty_cart();

        return [
            'result' => 'success',
            'redirect' => $this->get_payment_url($order, $result)
        ];
    }

    private function get_payment_url($order, $payment_data) {
        $args = [
            'order_id' => $order->get_id(),
            'session_id' => $payment_data['sessionId'],
            'amount' => $payment_data['amount'],
            'asset' => $payment_data['asset'],
            'merchant' => $payment_data['payTo'],
            'return_url' => $this->get_return_url($order)
        ];

        return add_query_arg($args, home_url('/x402-payment'));
    }

    public function webhook_handler() {
        $payload = file_get_contents('php://input');
        $data = json_decode($payload, true);

        if (!$data || !isset($data['signature']) || !isset($data['orderId'])) {
            status_header(400);
            exit;
        }

        $order_id = intval($data['orderId']);
        $signature = sanitize_text_field($data['signature']);

        $order = wc_get_order($order_id);

        if (!$order) {
            status_header(404);
            exit;
        }

        $expected_amount = $order->get_total();
        $client = new X402_Client();
        $verified = $client->verify_payment($signature, $expected_amount);

        if (!$verified) {
            status_header(400);
            exit;
        }

        global $wpdb;
        $table_name = $wpdb->prefix . 'x402_payments';

        $wpdb->update(
            $table_name,
            [
                'signature' => $signature,
                'status' => 'completed',
                'updated_at' => current_time('mysql')
            ],
            ['order_id' => (string)$order_id],
            ['%s', '%s', '%s'],
            ['%s']
        );

        $order->payment_complete($signature);
        $order->add_order_note(
            sprintf('Solana payment completed. Transaction: %s', $signature)
        );

        $order_status = $this->get_option('order_status', 'processing');
        $order->update_status($order_status);

        status_header(200);
        echo json_encode(['success' => true]);
        exit;
    }

    public function thankyou_page($order_id) {
        $order = wc_get_order($order_id);

        if (!$order) {
            return;
        }

        $session_id = $order->get_meta('_x402_session_id');
        $handler = X402_Payment_Handler::instance();
        $payment = $handler->get_payment_by_session($session_id);

        if ($payment && $payment->signature) {
            ?>
            <div class="woocommerce-order-overview x402-payment-info">
                <h2>Payment Details</h2>
                <ul class="woocommerce-order-overview__list">
                    <li>
                        <strong>Payment Method:</strong> Solana (<?php echo esc_html($payment->asset); ?>)
                    </li>
                    <li>
                        <strong>Amount:</strong> <?php echo number_format($payment->amount, 9); ?> <?php echo esc_html($payment->asset); ?>
                    </li>
                    <li>
                        <strong>Transaction:</strong>
                        <a href="https://explorer.solana.com/tx/<?php echo esc_attr($payment->signature); ?>?cluster=<?php echo esc_attr(get_option('x402_solana_network')); ?>" target="_blank">
                            <?php echo esc_html(substr($payment->signature, 0, 20) . '...'); ?>
                        </a>
                    </li>
                    <li>
                        <strong>Status:</strong> <?php echo esc_html(ucfirst($payment->status)); ?>
                    </li>
                </ul>
            </div>
            <?php
        }
    }

    public function process_refund($order_id, $amount = null, $reason = '') {
        $order = wc_get_order($order_id);

        if (!$order) {
            return new WP_Error('invalid_order', 'Order not found');
        }

        $handler = X402_Payment_Handler::instance();
        $payment = $handler->get_payment_by_order($order_id);

        if (!$payment || !$payment->signature) {
            return new WP_Error('no_payment', 'No payment found for this order');
        }

        $order->add_order_note(
            sprintf('Refund requested: %s %s. Reason: %s', $amount, $payment->asset, $reason)
        );

        return true;
    }
}
