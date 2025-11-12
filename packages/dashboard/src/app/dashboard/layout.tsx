'use client';

import { Sidebar } from '@/components/Sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen overflow-hidden bg-[#0A0A0A]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#0A0A0A]">
          <div className="mx-auto max-w-7xl p-6">{children}</div>
        </main>
      </div>
    </QueryClientProvider>
  );
}
