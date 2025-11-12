import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'x402 Next.js Service',
  description: 'Production-ready x402-enabled Next.js API service',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
