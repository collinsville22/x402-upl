import crypto from 'crypto';
export function generateWebhookSignature(payload, secret, timestamp) {
    const data = `${timestamp}.${JSON.stringify(payload)}`;
    return crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');
}
export function verifyWebhookSignature(payload, signature, secret, timestamp, toleranceSeconds = 300) {
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
        return false;
    }
    const expectedSignature = generateWebhookSignature(payload, secret, timestamp);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
export function createWebhookHeaders(payload, secret, eventType) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateWebhookSignature(payload, secret, timestamp);
    return {
        'Content-Type': 'application/json',
        'User-Agent': 'x402-facilitator/2.0',
        'X-Webhook-Event': eventType,
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp.toString()
    };
}
//# sourceMappingURL=webhook-signature.js.map