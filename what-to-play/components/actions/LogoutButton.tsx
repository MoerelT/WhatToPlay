"use client";

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button
        className="min-h-10 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
        type="submit"
      >
        Deconnexion
      </button>
    </form>
  );
}
