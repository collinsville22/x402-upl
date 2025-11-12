(function($) {
    'use strict';

    $(document).ready(function() {
        const refreshBalance = function() {
            const $button = $('.refresh-balance');
            if ($button.length === 0) return;

            $button.on('click', function(e) {
                e.preventDefault();
                location.reload();
            });
        };

        const initPaymentForm = function() {
            const $form = $('#x402-payment-form');
            if ($form.length === 0) return;

            $form.on('submit', function(e) {
                e.preventDefault();

                const orderId = $form.find('[name="order_id"]').val();
                const amount = $form.find('[name="amount"]').val();
                const currency = $form.find('[name="currency"]').val();

                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'x402_create_payment',
                        nonce: x402Admin.nonce,
                        order_id: orderId,
                        amount: amount,
                        currency: currency
                    },
                    success: function(response) {
                        if (response.success) {
                            window.location.href = response.data.paymentUrl;
                        } else {
                            alert('Payment creation failed: ' + response.data.message);
                        }
                    },
                    error: function() {
                        alert('An error occurred. Please try again.');
                    }
                });
            });
        };

        const initVerifyButton = function() {
            $('.verify-payment').on('click', function(e) {
                e.preventDefault();

                const signature = $(this).data('signature');
                const amount = $(this).data('amount');

                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'x402_verify_payment',
                        nonce: x402Admin.nonce,
                        signature: signature,
                        amount: amount
                    },
                    success: function(response) {
                        if (response.success && response.data.verified) {
                            alert('Payment verified successfully!');
                            location.reload();
                        } else {
                            alert('Payment verification failed.');
                        }
                    },
                    error: function() {
                        alert('An error occurred. Please try again.');
                    }
                });
            });
        };

        refreshBalance();
        initPaymentForm();
        initVerifyButton();
    });
})(jQuery);
