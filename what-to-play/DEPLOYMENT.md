# Deploiement Vercel

Cette application ne peut pas etre hebergee sur GitHub Pages : elle utilise des
routes API Next.js, des cookies de session, Steam OpenID et des secrets serveur.

## Configuration du projet

1. Importe le depot GitHub `MoerelT/WhatToPlay` dans Vercel.
2. Dans **Settings > General**, regle **Root Directory** sur `what-to-play`.
3. Laisse **Framework Preset** sur `Next.js`.
4. Laisse les commandes Build et Install sur leurs valeurs automatiques.

## Variables d'environnement

Ajoute ces variables dans **Settings > Environment Variables** pour
l'environnement Production :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STEAM_API_KEY`
- `APP_URL` avec la valeur `https://what-to-play-wheel.vercel.app`
- `SESSION_SECRET`

Les valeurs existent deja dans le fichier local `.env.local`. Ne publie jamais
ce fichier et ne colle jamais les secrets dans GitHub.

## Mise en ligne

1. Ouvre **Deployments**.
2. Sur le dernier deploiement, ouvre le menu `...`.
3. Choisis **Redeploy**.
4. Une fois le statut **Ready**, ouvre
   `https://what-to-play-wheel.vercel.app/login`.
5. Teste la connexion Steam.

Apres un changement de `APP_URL` ou d'une autre variable, effectue toujours un
nouveau deploiement : les anciens deploiements ne recuperent pas les nouvelles
variables.
