export function SteamLoginButton() {
  return (
    <a
      className="inline-flex min-h-12 items-center justify-center rounded-md bg-stone-950 px-5 text-sm font-bold text-white transition hover:bg-emerald-800"
      href="/api/auth/steam/login"
    >
      Connexion avec Steam
    </a>
  );
}
