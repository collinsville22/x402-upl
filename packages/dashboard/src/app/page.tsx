'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const hasWallet = typeof window !== 'undefined' && localStorage.getItem('x402-wallet-storage');

    if (hasWallet) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
      <div className="text-center max-w-6xl px-4">
        <h1 className="text-7xl font-bold text-white tracking-tight">x402</h1>
        <p className="mt-4 text-xl text-[#CCCCCC]">
          Universal Payment Layer for Autonomous Agents
        </p>

        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="rounded-lg bg-[#00FF88] px-8 py-3 font-semibold text-[#0A0A0A] transition-all hover:bg-[#00DD77]"
          >
            Get Started
          </Link>
          <a
            href="https://github.com/x402-upl"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-[#2A2A2A] bg-[#111111] px-8 py-3 font-semibold text-white transition-all hover:bg-[#1A1A1A]"
          >
            Documentation
          </a>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3 text-left">
          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <h3 className="text-lg font-semibold text-white">HTTP 402 Protocol</h3>
            <p className="mt-2 text-sm text-[#888888]">
              Standard-compliant payment flow for autonomous agents
            </p>
          </div>

          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <h3 className="text-lg font-semibold text-white">Instant Payments</h3>
            <p className="mt-2 text-sm text-[#888888]">
              Zero-fee micropayments with Phantom CASH
            </p>
          </div>

          <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-6">
            <h3 className="text-lg font-semibold text-white">Trusted Identity</h3>
            <p className="mt-2 text-sm text-[#888888]">
              Visa TAP cryptographic verification
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
