import { redirect } from "next/navigation";
import { SteamLoginButton } from "@/components/auth/SteamLoginButton";
import { getSteamSession } from "@/lib/auth/session";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSteamSession();

  if (session) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl content-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">
            WhatToPlay
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight sm:text-6xl">
            Ton backlog Steam, enfin jouable.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-stone-300">
            Connecte ton profil Steam public, synchronise ta bibliotheque, puis
            laisse la roue remplir tes slots de jeux en cours.
          </p>
          <div className="mt-7">
            <SteamLoginButton />
          </div>
          {error === "steam-auth" ? (
            <p className="mt-4 rounded-md border border-red-400 bg-red-950/50 p-3 text-sm font-medium text-red-100">
              La connexion Steam a echoue. Reessaie depuis le bouton Steam.
            </p>
          ) : null}
          {error === "supabase-setup" ? (
            <p className="mt-4 rounded-md border border-amber-400 bg-amber-950/50 p-3 text-sm font-medium text-amber-100">
              Steam a repondu, mais la base Supabase n&apos;est pas encore prete.
              Execute la migration SQL, puis reconnecte-toi.
            </p>
          ) : null}
          {error === "supabase-key" ? (
            <p className="mt-4 rounded-md border border-amber-400 bg-amber-950/50 p-3 text-sm font-medium text-amber-100">
              Steam a repondu, mais les cles Supabase locales sont invalides.
              Remplace les cles dans .env.local, redemarre le serveur, puis reconnecte-toi.
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 rounded-lg border border-stone-700 bg-stone-900 p-4">
          <div className="rounded-md bg-stone-800 p-4">
            <p className="text-sm font-bold text-emerald-300">Hard</p>
            <p className="mt-1 text-2xl font-black">3 jeux en cours</p>
          </div>
          <div className="rounded-md bg-stone-800 p-4">
            <p className="text-sm font-bold text-amber-300">Medium</p>
            <p className="mt-1 text-2xl font-black">5 jeux + 1 free slot</p>
          </div>
          <div className="rounded-md bg-stone-800 p-4">
            <p className="text-sm font-bold text-sky-300">Easy</p>
            <p className="mt-1 text-2xl font-black">7 jeux + 2 free slots</p>
          </div>
        </div>
      </section>
    </main>
  );
}
