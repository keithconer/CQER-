"use client";

import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function OAuthLoadingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const nextPath = searchParams.get("next") || "/dashboard";

    const fadeTimer = window.setTimeout(() => {
      setFadeOut(true);
    }, 650);

    const redirectTimer = window.setTimeout(() => {
      router.replace(nextPath);
    }, 1050);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(redirectTimer);
    };
  }, [router, searchParams]);

  return (
    <div
      className={`min-h-screen bg-white flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative w-24 h-24 animate-in fade-in duration-300">
        <Image
          src="/CQERFINAL.png"
          alt="CQER Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}

export default function OAuthLoadingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <OAuthLoadingContent />
    </Suspense>
  );
}
