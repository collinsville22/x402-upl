<?php
/**
 * Plugin Name: x402 Solana Payments
 * Plugin URI: https://x402.network
 * Description: Accept Solana cryptocurrency payments via x402 protocol
 * Version: 2.0.0
 * Author: x402-upl Team
 * Author URI: https://x402.network
 * License: Apache-2.0
 * Text Domain: x402-payments
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit;
}

define('X402_VERSION', '2.0.0');
define('X402_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('X402_PLUGIN_URL', plugin_dir_url(__FILE__));

require_once X402_PLUGIN_DIR . 'includes/class-x402-client.php';
require_once X402_PLUGIN_DIR . 'includes/class-x402-admin.php';
require_once X402_PLUGIN_DIR . 'includes/class-x402-payment-handler.php';

if (class_exists('WooCommerce')) {
    require_once X402_PLUGIN_DIR . 'includes/class-x402-woocommerce-gateway.php';
}

class X402_Payments {
    private static $instance = null;

    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('init', [$this, 'init']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        register_activation_hook(__FILE__, [$this, 'activate']);
        register_deactivation_hook(__FILE__, [$this, 'deactivate']);
    }

    public function init() {
        X402_Admin::instance();
        X402_Payment_Handler::instance();

        if (class_exists('WooCommerce')) {
            add_filter('woocommerce_payment_gateways', [$this, 'add_gateway']);
        }
    }

    public function add_gateway($gateways) {
        $gateways[] = 'X402_WooCommerce_Gateway';
        return $gateways;
    }

    public function register_rest_routes() {
        register_rest_route('x402/v1', '/payment/create', [
            'methods' => 'POST',
            'callback' => [X402_Payment_Handler::instance(), 'create_payment'],
            'permission_callback' => '__return_true'
        ]);

        register_rest_route('x402/v1', '/payment/verify', [
            'methods' => 'POST',
            'callback' => [X402_Payment_Handler::instance(), 'verify_payment'],
            'permission_callback' => '__return_true'
        ]);

        register_rest_route('x402/v1', '/payment/webhook', [
            'methods' => 'POST',
            'callback' => [X402_Payment_Handler::instance(), 'handle_webhook'],
            'permission_callback' => '__return_true'
        ]);
    }

    public function activate() {
        global $wpdb;

        $table_name = $wpdb->prefix . 'x402_payments';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
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
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);

        add_option('x402_version', X402_VERSION);
        add_option('x402_solana_network', 'devnet');
        add_option('x402_merchant_wallet', '');
        add_option('x402_api_url', 'http://localhost:3000');
    }

    public function deactivate() {
    }
}

function x402_payments() {
    return X402_Payments::instance();
}

x402_payments();
