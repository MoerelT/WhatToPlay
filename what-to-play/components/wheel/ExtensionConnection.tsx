"use client";

import { useState } from "react";

export function ExtensionConnection() {
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );

  async function generateToken() {
    setState("loading");
    const response = await fetch("/api/import/token", { method: "POST" });
    const payload = (await response.json()) as {
      error?: string;
      token?: string;
    };

    if (!response.ok || !payload.token) {
      setState("error");
      return;
    }

    setToken(payload.token);
    setCopied(false);
    setState("ready");
  }

  async function copyToken() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
  }

  return (
    <section className="grid gap-5 border-t border-stone-200 pt-5">
      <div>
        <h2 className="text-xl font-black text-stone-950">
          Extension d&apos;import
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Steam Family, RetroAchievements et Instant Gaming.
        </p>
      </div>
      <div className="grid gap-2 rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
        <h3 className="font-black">A quoi sert le code de liaison ?</h3>
        <p>
          C&apos;est une autorisation temporaire qui indique a WhatToPlay dans
          quel compte enregistrer les jeux envoyes par l&apos;extension.
        </p>
        <p>
          Il ne contient ni ton mot de passe Steam, ni tes cookies. Il expire
          apres 15 minutes et doit rester prive pendant cette duree.
        </p>
      </div>

      <div className="grid gap-3 text-sm text-stone-700">
        <h3 className="font-black text-stone-950">Installation</h3>
        <p>
          1. Telecharge le fichier ZIP ci-dessous, puis decompresse-le dans un
          dossier que tu conserveras.
        </p>
        <details className="rounded-md border border-stone-200 p-3">
          <summary className="cursor-pointer font-bold text-stone-950">
            Installer dans Chrome ou Edge
          </summary>
          <p className="mt-2">
            Ouvre <strong>chrome://extensions</strong> ou{" "}
            <strong>edge://extensions</strong>, active le mode developpeur,
            clique sur <strong>Charger l&apos;extension non empaquetee</strong>,
            puis selectionne le dossier decompresse.
          </p>
        </details>
        <details className="rounded-md border border-stone-200 p-3">
          <summary className="cursor-pointer font-bold text-stone-950">
            Installer temporairement dans Firefox
          </summary>
          <p className="mt-2">
            Ouvre <strong>about:debugging#/runtime/this-firefox</strong>, clique
            sur <strong>Charger un module complementaire temporaire</strong>,
            puis selectionne le fichier <strong>manifest.json</strong> du
            dossier decompresse.
          </p>
        </details>
      </div>
      <div>
        <a
          className="inline-flex min-h-10 items-center rounded-md border border-emerald-700 px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
          download
          href="/downloads/what-to-play-importer.zip"
        >
          Telecharger l&apos;extension
        </a>
      </div>

      <div className="grid gap-3 text-sm text-stone-700">
        <h3 className="font-black text-stone-950">
          Relier l&apos;extension a ton compte
        </h3>
        <p>
          2. Clique sur <strong>Generer un code de liaison</strong>, puis sur{" "}
          <strong>Copier</strong>.
        </p>
        <p>
          3. Ouvre l&apos;extension WhatToPlay depuis la barre d&apos;outils de
          ton navigateur. Utilise <strong>http://localhost:3000</strong> en
          local ou <strong>https://what-to-play-wheel.vercel.app</strong> en
          production, colle le code dans <strong>Code de liaison</strong>,
          puis clique sur <strong>Enregistrer la liaison</strong>.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          className="min-h-10 rounded-md bg-stone-950 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:bg-stone-400"
          disabled={state === "loading"}
          onClick={generateToken}
          type="button"
        >
          {state === "loading"
            ? "Generation..."
            : "Generer un code de liaison"}
        </button>
        {token ? (
          <>
            <input
              aria-label="Code de liaison"
              className="min-h-10 min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 font-mono text-xs text-stone-700"
              readOnly
              type="password"
              value={token}
            />
            <button
              className="min-h-10 rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
              onClick={copyToken}
              type="button"
            >
              {copied ? "Copie" : "Copier"}
            </button>
          </>
        ) : null}
      </div>
      {state === "ready" ? (
        <p className="text-xs font-semibold text-emerald-700">
          Code valable 15 minutes.
        </p>
      ) : null}
      {state === "error" ? (
        <p className="text-xs font-semibold text-red-700">
          Impossible de generer le code.
        </p>
      ) : null}

      <div className="grid gap-3 text-sm text-stone-700">
        <h3 className="font-black text-stone-950">Importer les jeux</h3>
        <p>
          4. Pour <strong>Steam Family</strong>, connecte-toi au magasin Steam
          dans ce navigateur, puis clique sur{" "}
          <strong>Importer Steam Family</strong> dans l&apos;extension.
        </p>
        <p>
          Pour <strong>RetroAchievements</strong> ou{" "}
          <strong>Instant Gaming</strong>, connecte-toi au site, ouvre la page
          contenant ta liste, puis clique sur{" "}
          <strong>Importer la page RA / Instant Gaming</strong>.
        </p>
        <p className="font-semibold text-stone-950">
          Les jeux importes restent dans la base. Tu peux fermer ou retirer
          l&apos;extension ensuite. Reinstalle-la seulement lorsque tu veux
          actualiser ces listes.
        </p>
      </div>
    </section>
  );
}
