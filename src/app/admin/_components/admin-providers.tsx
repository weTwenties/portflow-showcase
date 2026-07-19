"use client";

import { Toaster } from "@/components/ui/sonner";

/** Client toast host for the admin shell. */
export function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
