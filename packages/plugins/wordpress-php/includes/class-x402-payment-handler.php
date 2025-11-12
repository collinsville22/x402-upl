<?php

if (!defined('ABSPATH')) {
    exit;
}

class X402_Payment_Handler {
    private static $instance = null;

    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('wp_ajax_x402_create_payment', [$this, 'ajax_create_payment']);
        add_action('wp_ajax_nopriv_x402_create_payment', [$this, 'ajax_create_payment']);
        add_action('wp_ajax_x402_verify_payment', [$this, 'ajax_verify_payment']);
        add_action('wp_ajax_nopriv_x402_verify_payment', [$this, 'ajax_verify_payment']);
    }

    public function create_payment($request) {
        $params = $request->get_json_params();

        $order_id = sanitize_text_field($params['orderId'] ?? '');
        $amount = floatval($params['amount'] ?? 0);
        $currency = sanitize_text_field($params['currency'] ?? 'USD');

        if (empty($order_id) || $amount <= 0) {
            return new WP_Error('invalid_params', 'Invalid payment parameters', ['status' => 400]);
        }

        $client = new X402_Client();
        $session_id = 'wp_' . $order_id . '_' . time();

        global $wpdb;
        $table_name = $wpdb->prefix . 'x402_payments';

        $wpdb->insert($table_name, [
            'post_id' => 0,
            'order_id' => $order_id,
            'session_id' => $session_id,
            'amount' => $amount,
            'currency' => $currency,
            'asset' => $this->map_currency_to_asset($currency),
            'merchant_address' => $client->get_merchant_address(),
            'status' => 'pending',
            'created_at' => current_time('mysql'),
            'updated_at' => current_time('mysql')
        ]);

        return new WP_REST_Response([
            'sessionId' => $session_id,
            'paymentUrl' => home_url('/pay/' . $session_id),
            'payTo' => $client->get_merchant_address(),
            'amount' => (string)$amount,
            'asset' => $this->map_currency_to_asset($currency),
            'network' => $client->get_network()
        ], 200);
    }

    public function verify_payment($request) {
        $params = $request->get_json_params();

        $signature = sanitize_text_field($params['signature'] ?? '');
        $expected_amount = floatval($params['amount'] ?? 0);

        if (empty($signature) || $expected_amount <= 0) {
            return new WP_Error('invalid_params', 'Invalid verification parameters', ['status' => 400]);
        }

        $client = new X402_Client();
        $verified = $client->verify_payment($signature, $expected_amount);

        if ($verified) {
            global $wpdb;
            $table_name = $wpdb->prefix . 'x402_payments';

            $wpdb->update(
                $table_name,
                [
                    'signature' => $signature,
                    'status' => 'completed',
                    'updated_at' => current_time('mysql')
                ],
                ['signature' => null],
                ['%s', '%s', '%s'],
                ['%s']
            );

            do_action('x402_payment_verified', $signature, $expected_amount);
        }

        return new WP_REST_Response([
            'verified' => $verified
        ], 200);
    }

    public function handle_webhook($request) {
        $params = $request->get_json_params();

        $signature = sanitize_text_field($params['signature'] ?? '');
        $session_id = sanitize_text_field($params['sessionId'] ?? '');

        if (empty($signature) || empty($session_id)) {
            return new WP_Error('invalid_params', 'Invalid webhook parameters', ['status' => 400]);
        }

        global $wpdb;
        $table_name = $wpdb->prefix . 'x402_payments';

        $payment = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE session_id = %s",
            $session_id
        ));

        if (!$payment) {
            return new WP_Error('not_found', 'Payment session not found', ['status' => 404]);
        }

        $client = new X402_Client();
        $verified = $client->verify_payment($signature, $payment->amount);

        if ($verified) {
            $wpdb->update(
                $table_name,
                [
                    'signature' => $signature,
                    'status' => 'completed',
                    'updated_at' => current_time('mysql')
                ],
                ['id' => $payment->id],
                ['%s', '%s', '%s'],
                ['%d']
            );

            do_action('x402_payment_completed', $payment, $signature);

            return new WP_REST_Response([
                'success' => true
            ], 200);
        }

        return new WP_Error('verification_failed', 'Payment verification failed', ['status' => 400]);
    }

    public function ajax_create_payment() {
        check_ajax_referer('x402_nonce', 'nonce');

        $order_id = sanitize_text_field($_POST['order_id'] ?? '');
        $amount = floatval($_POST['amount'] ?? 0);
        $currency = sanitize_text_field($_POST['currency'] ?? 'USD');

        if (empty($order_id) || $amount <= 0) {
            wp_send_json_error(['message' => 'Invalid payment parameters']);
            return;
        }

        $client = new X402_Client();
        $result = $client->create_payment_session($order_id, $amount, $currency);

        if (is_wp_error($result)) {
            wp_send_json_error(['message' => $result->get_error_message()]);
            return;
        }

        wp_send_json_success($result);
    }

    public function ajax_verify_payment() {
        check_ajax_referer('x402_nonce', 'nonce');

        $signature = sanitize_text_field($_POST['signature'] ?? '');
        $amount = floatval($_POST['amount'] ?? 0);

        if (empty($signature) || $amount <= 0) {
            wp_send_json_error(['message' => 'Invalid verification parameters']);
            return;
        }

        $client = new X402_Client();
        $verified = $client->verify_payment($signature, $amount);

        wp_send_json_success(['verified' => $verified]);
    }

    private function map_currency_to_asset($currency) {
        $mapping = [
            'USD' => 'USDC',
            'SOL' => 'SOL',
            'CASH' => 'CASH'
        ];

        return $mapping[$currency] ?? 'SOL';
    }

    public function get_payment_by_session($session_id) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'x402_payments';

        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE session_id = %s",
            $session_id
        ));
    }

    public function get_payment_by_order($order_id) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'x402_payments';

        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE order_id = %s ORDER BY created_at DESC LIMIT 1",
            $order_id
        ));
    }
}
