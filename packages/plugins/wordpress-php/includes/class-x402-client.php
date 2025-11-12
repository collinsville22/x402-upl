<?php

if (!defined('ABSPATH')) {
    exit;
}

class X402_Client {
    private $api_url;
    private $network;
    private $merchant_wallet;

    public function __construct() {
        $this->api_url = get_option('x402_api_url', 'http://localhost:3000');
        $this->network = get_option('x402_solana_network', 'devnet');
        $this->merchant_wallet = get_option('x402_merchant_wallet', '');
    }

    public function create_payment_session($order_id, $amount, $currency) {
        $session_id = 'wp_' . $order_id . '_' . time();

        $response = wp_remote_post($this->api_url . '/api/create-payment', [
            'timeout' => 30,
            'headers' => [
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode([
                'orderId' => $order_id,
                'amount' => (string)$amount,
                'currency' => $currency
            ])
        ]);

        if (is_wp_error($response)) {
            return new WP_Error('api_error', $response->get_error_message());
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (wp_remote_retrieve_response_code($response) !== 200) {
            return new WP_Error('api_error', $data['error'] ?? 'Payment creation failed');
        }

        return $data;
    }

    public function verify_payment($signature, $expected_amount) {
        $response = wp_remote_post($this->api_url . '/api/verify-payment', [
            'timeout' => 30,
            'headers' => [
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode([
                'signature' => $signature,
                'amount' => (string)$expected_amount
            ])
        ]);

        if (is_wp_error($response)) {
            return false;
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        return isset($data['verified']) && $data['verified'] === true;
    }

    public function get_transaction($signature) {
        $rpc_url = $this->get_rpc_url();

        $response = wp_remote_post($rpc_url, [
            'timeout' => 30,
            'headers' => [
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode([
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'getTransaction',
                'params' => [
                    $signature,
                    ['encoding' => 'json', 'commitment' => 'confirmed']
                ]
            ])
        ]);

        if (is_wp_error($response)) {
            return null;
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        return $data['result'] ?? null;
    }

    public function get_balance($address) {
        $rpc_url = $this->get_rpc_url();

        $response = wp_remote_post($rpc_url, [
            'timeout' => 30,
            'headers' => [
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode([
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'getBalance',
                'params' => [$address]
            ])
        ]);

        if (is_wp_error($response)) {
            return 0;
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        $lamports = $data['result']['value'] ?? 0;
        return $lamports / 1000000000;
    }

    private function get_rpc_url() {
        $urls = [
            'mainnet-beta' => 'https://api.mainnet-beta.solana.com',
            'devnet' => 'https://api.devnet.solana.com',
            'testnet' => 'https://api.testnet.solana.com'
        ];

        return $urls[$this->network] ?? $urls['devnet'];
    }

    public function get_merchant_address() {
        return $this->merchant_wallet;
    }

    public function get_network() {
        return $this->network;
    }
}
