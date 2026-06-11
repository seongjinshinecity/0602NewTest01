"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "Studio", icon: "✦" },
  { href: "/gallery", label: "Gallery", icon: "▦" },
];

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-16 flex-col items-center justify-between border-r border-white/5 bg-ink-900/60 py-5 md:w-60 md:items-stretch md:px-4">
      <div>
        <div className="mb-8 flex items-center gap-2.5 px-1 md:px-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-indigo-500 text-lg">
            ✦
          </div>
          <span className="hidden text-sm font-semibold text-white md:block">AI Image Studio</span>
        </div>

        <nav className="space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-center gap-3 rounded-lg px-2 py-2.5 text-sm transition md:justify-start md:px-3 ${
                  active
                    ? "bg-brand-500/15 text-brand-300"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="hidden md:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="w-full">
        <div className="mb-2 hidden truncate px-3 text-xs text-zinc-500 md:block" title={email}>
          {email}
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-3 rounded-lg px-2 py-2.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white md:justify-start md:px-3"
        >
          <span className="text-base">⏏</span>
          <span className="hidden md:block">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
