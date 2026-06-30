import Link from "next/link";
import Image from "next/image";
import { LogoutButton } from "@/components/actions/LogoutButton";
import type { ProfileRow } from "@/types/database";

export function AppShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: ProfileRow;
}) {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link className="text-lg font-black text-stone-950" href="/dashboard">
            WhatToPlay
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              className="rounded-md px-3 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className="rounded-md px-3 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
              href="/wheel"
            >
              Roue
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {profile.avatar_url ? (
              <Image
                alt=""
                className="h-9 w-9 rounded-md object-cover"
                height={36}
                src={profile.avatar_url}
                width={36}
              />
            ) : null}
            <span className="hidden text-sm font-bold text-stone-700 sm:inline">
              {profile.display_name ?? profile.steam_id}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
