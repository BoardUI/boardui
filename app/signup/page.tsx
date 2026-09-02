"use client";

import { useStarterBase } from "@/components/application/app-shell/app-shell";
import { AuthCard } from "@/components/application/auth/auth-card";
import { AuthMediaCarousel } from "@/components/application/auth/auth-media-carousel";

/** The starter's sign-up screen: the split layout, form beside artwork. */
export default function SignupPage() {
  const base = useStarterBase();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background-full p-6">
      <AuthCard
        mode="signup"
        layout="grid"
        centered
        confirmPassword
        providers={["apple", "google", "figma"]}
        title="Create your account"
        description="Enter your email below to create your account"
        switchHref={`${base}/login`}
        footnote={<>By clicking continue, you agree to our Terms of Service and Privacy Policy.</>}
        media={
          <AuthMediaCarousel
            slides={[
              { src: "/carousel/floral.webp" },
              { src: "/carousel/space-squid.webp" },
              { src: "/carousel/sunrise.webp" },
              { src: "/carousel/shark-collage.webp" },
              { src: "/carousel/kitchen.webp" },
              { src: "/carousel/seafood.webp" },
              { src: "/carousel/vending-machine.webp" },
            ]}
          />
        }
      />
    </main>
  );
}
