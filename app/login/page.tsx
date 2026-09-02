"use client";

import { AuthCard } from "@/components/application/auth/auth-card";

/** The starter's sign-in screen, reached from Log out in the account menu. */
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background-full p-6">
      <AuthCard />
    </main>
  );
}
