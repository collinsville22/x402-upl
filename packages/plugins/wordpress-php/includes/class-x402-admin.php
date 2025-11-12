<?php

if (!defined('ABSPATH')) {
    exit;
}

class X402_Admin {
    private static $instance = null;

    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('admin_menu', [$this, 'add_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_scripts']);
    }

    public function add_menu() {
        add_menu_page(
            'x402 Payments',
            'x402 Payments',
            'manage_options',
            'x402-payments',
            [$this, 'render_settings_page'],
            'dashicons-money-alt',
            30
        );

        add_submenu_page(
            'x402-payments',
            'Settings',
            'Settings',
            'manage_options',
            'x402-payments',
            [$this, 'render_settings_page']
        );

        add_submenu_page(
            'x402-payments',
            'Transactions',
            'Transactions',
            'manage_options',
            'x402-transactions',
            [$this, 'render_transactions_page']
        );
    }

    public function register_settings() {
        register_setting('x402_settings', 'x402_solana_network');
        register_setting('x402_settings', 'x402_merchant_wallet');
        register_setting('x402_settings', 'x402_api_url');
        register_setting('x402_settings', 'x402_registry_url');
        register_setting('x402_settings', 'x402_facilitator_url');

        add_settings_section(
            'x402_main_section',
            'x402 Configuration',
            null,
            'x402-payments'
        );

        add_settings_field(
            'x402_solana_network',
            'Solana Network',
            [$this, 'render_network_field'],
            'x402-payments',
            'x402_main_section'
        );

        add_settings_field(
            'x402_merchant_wallet',
            'Merchant Wallet Address',
            [$this, 'render_wallet_field'],
            'x402-payments',
            'x402_main_section'
        );

        add_settings_field(
            'x402_api_url',
            'API Server URL',
            [$this, 'render_api_url_field'],
            'x402-payments',
            'x402_main_section'
        );

        add_settings_field(
            'x402_registry_url',
            'Registry URL',
            [$this, 'render_registry_url_field'],
            'x402-payments',
            'x402_main_section'
        );

        add_settings_field(
            'x402_facilitator_url',
            'Facilitator URL',
            [$this, 'render_facilitator_url_field'],
            'x402-payments',
            'x402_main_section'
        );
    }

    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }

        $client = new X402_Client();
        $merchant_address = $client->get_merchant_address();
        $balance = 0;

        if ($merchant_address) {
            $balance = $client->get_balance($merchant_address);
        }
        ?>
        <div class="wrap">
            <h1>x402 Solana Payments Settings</h1>

            <?php if ($merchant_address): ?>
            <div class="notice notice-info">
                <p><strong>Merchant Address:</strong> <?php echo esc_html($merchant_address); ?></p>
                <p><strong>Balance:</strong> <?php echo number_format($balance, 9); ?> SOL</p>
                <p><strong>Network:</strong> <?php echo esc_html($client->get_network()); ?></p>
            </div>
            <?php endif; ?>

            <form method="post" action="options.php">
                <?php
                settings_fields('x402_settings');
                do_settings_sections('x402-payments');
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }

    public function render_transactions_page() {
        if (!current_user_can('manage_options')) {
            return;
        }

        global $wpdb;
        $table_name = $wpdb->prefix . 'x402_payments';
        $payments = $wpdb->get_results("SELECT * FROM $table_name ORDER BY created_at DESC LIMIT 100");
        ?>
        <div class="wrap">
            <h1>x402 Transactions</h1>
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Order ID</th>
                        <th>Amount</th>
                        <th>Asset</th>
                        <th>Status</th>
                        <th>Signature</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($payments as $payment): ?>
                    <tr>
                        <td><?php echo esc_html($payment->id); ?></td>
                        <td><?php echo esc_html($payment->order_id); ?></td>
                        <td><?php echo number_format($payment->amount, 9); ?></td>
                        <td><?php echo esc_html($payment->asset); ?></td>
                        <td>
                            <span class="status-<?php echo esc_attr($payment->status); ?>">
                                <?php echo esc_html(ucfirst($payment->status)); ?>
                            </span>
                        </td>
                        <td>
                            <?php if ($payment->signature): ?>
                                <a href="https://explorer.solana.com/tx/<?php echo esc_attr($payment->signature); ?>?cluster=<?php echo esc_attr($payment->status); ?>" target="_blank">
                                    <?php echo esc_html(substr($payment->signature, 0, 20) . '...'); ?>
                                </a>
                            <?php else: ?>
                                -
                            <?php endif; ?>
                        </td>
                        <td><?php echo esc_html($payment->created_at); ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php
    }

    public function render_network_field() {
        $value = get_option('x402_solana_network', 'devnet');
        ?>
        <select name="x402_solana_network">
            <option value="devnet" <?php selected($value, 'devnet'); ?>>Devnet</option>
            <option value="testnet" <?php selected($value, 'testnet'); ?>>Testnet</option>
            <option value="mainnet-beta" <?php selected($value, 'mainnet-beta'); ?>>Mainnet Beta</option>
        </select>
        <?php
    }

    public function render_wallet_field() {
        $value = get_option('x402_merchant_wallet', '');
        ?>
        <input type="text" name="x402_merchant_wallet" value="<?php echo esc_attr($value); ?>" class="regular-text" />
        <p class="description">Your Solana wallet address to receive payments</p>
        <?php
    }

    public function render_api_url_field() {
        $value = get_option('x402_api_url', 'http://localhost:3000');
        ?>
        <input type="text" name="x402_api_url" value="<?php echo esc_attr($value); ?>" class="regular-text" />
        <p class="description">x402 API server URL</p>
        <?php
    }

    public function render_registry_url_field() {
        $value = get_option('x402_registry_url', 'https://registry.x402.network');
        ?>
        <input type="text" name="x402_registry_url" value="<?php echo esc_attr($value); ?>" class="regular-text" />
        <p class="description">x402 Registry URL</p>
        <?php
    }

    public function render_facilitator_url_field() {
        $value = get_option('x402_facilitator_url', 'https://facilitator.payai.network');
        ?>
        <input type="text" name="x402_facilitator_url" value="<?php echo esc_attr($value); ?>" class="regular-text" />
        <p class="description">x402 Facilitator URL</p>
        <?php
    }

    public function enqueue_scripts($hook) {
        if (strpos($hook, 'x402-payments') === false && strpos($hook, 'x402-transactions') === false) {
            return;
        }

        wp_enqueue_style('x402-admin', X402_PLUGIN_URL . 'assets/admin.css', [], X402_VERSION);
        wp_enqueue_script('x402-admin', X402_PLUGIN_URL . 'assets/admin.js', ['jquery'], X402_VERSION, true);
    }
}
