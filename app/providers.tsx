"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { GuestModeProvider } from "@/components/GuestModeProvider";
import { GuestMigrationModal } from "@/components/GuestMigrationModal";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <GuestModeProvider>
          <GuestMigrationModal />
          {children}
        </GuestModeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
