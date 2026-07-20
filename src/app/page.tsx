"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const timer = setTimeout(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      router.replace(session ? "/inventario/nuevos" : "/login");
    }, 1100);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 dark:bg-[#0a0f0c]">
      <Image
        src="/logo.png"
        alt="Agro Sky Panamá"
        width={200}
        height={200}
        priority
        className="animate-splash"
      />
    </main>
  );
}
