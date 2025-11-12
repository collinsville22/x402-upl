'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-x402-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">My Services</h1>
          <p className="mt-1 text-x402-text-secondary">
            Manage your registered services
          </p>
        </div>
        <Link href="/provider/services/new">
          <Button variant="primary">Register New Service</Button>
        </Link>
      </div>

      <Card className="p-12">
        <div className="text-center">
          <p className="text-lg font-medium text-white">No services registered yet</p>
          <p className="mt-1 text-sm text-x402-text-tertiary">
            Register your first service to start earning
          </p>
        </div>
      </Card>
    </div>
  );
}
