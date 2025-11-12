import crypto from 'crypto';

export function generateWebhookSignature(
  payload: Record<string, any>,
  secret: string,
  timestamp: number
): string {
  const data = `${timestamp}.${JSON.stringify(payload)}`;

  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

export function verifyWebhookSignature(
  payload: Record<string, any>,
  signature: string,
  secret: string,
  timestamp: number,
  toleranceSeconds: number = 300
): boolean {
  const now = Math.floor(Date.now() / 1000);

  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  const expectedSignature = generateWebhookSignature(payload, secret, timestamp);

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export function createWebhookHeaders(
  payload: Record<string, any>,
  secret: string,
  eventType: string
): Record<string, string> {
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
