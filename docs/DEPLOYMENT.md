# Deployment

## Established resources

- Repository: https://github.com/saimadhav10/game-reviews
- Website: https://gamereviews.gamereviews-saimadhav10.workers.dev
- Cloudflare Worker: `gamereviews`; account subdomain: `gamereviews-saimadhav10`.
- D1 database: `gamereviews`, ID `fd70728c-244b-4309-a590-66f764198e36`.
- Firebase project: `gamereviews-saimadhav10`, active with email/password and Google sign-in enabled. No billing account is linked.

Live account services are connected. Initial console onboarding must be completed by the project owner when creating a new Firebase project; the remaining configuration can then be performed with the setup helper. Reuse the established project and database.

## Services

- Cloudflare Workers with static assets and D1: [pricing](https://developers.cloudflare.com/workers/platform/pricing/), [database allowances](https://developers.cloudflare.com/d1/platform/pricing/).
- Firebase Spark for email/password, Google authentication, verification, and reset email: [pricing](https://firebase.google.com/pricing), [authentication quotas](https://firebase.google.com/docs/auth/limits).
- Optional IGDB catalog import: [free API setup](https://api-docs.igdb.com/#account-creation).

Stay on free plans and use the free `workers.dev` address. Do not attach billing or activate paid upgrades to complete this setup. Free plans have usage limits; a zero-cost launch is not a promise of unlimited capacity.

## Firebase

1. Sign into Firebase using `npx firebase login` and create/select a Firebase project on the no-cost Spark plan. No Firestore, Firebase Storage, or Firebase Cloud Functions are needed.
2. Register a web app and obtain its project ID and web API key.
3. Enable **Email/Password** and **Google** in Authentication → Sign-in method. Google setup requires choosing a support email.
4. Add the deployed website hostname to Authentication → Settings → Authorized domains.
5. The current project uses Firebase's built-in verification/reset action pages, with continue links returning to GameReviews. If a custom action URL is configured later in Firebase Console, use `https://YOUR-WORKER-HOST/auth/action`; the application also handles those links. The setup helper falls back to the managed action pages if the template API rejects customization.
6. Set `vars.FIREBASE_PROJECT_ID` in `wrangler.jsonc` to the real project ID. Store the Firebase web API key with `npx wrangler secret put FIREBASE_WEB_API_KEY`. Paste it through the command's hidden prompt; do not put keys in shell arguments or chat.
7. Create and verify the owner's site account. Find its UID in Firebase Authentication → Users. Store it with `npx wrangler secret put ADMIN_UIDS`. Multiple admins use comma-separated Firebase UIDs. A display name, email, or public profile ID never grants admin access.

The application fetches its public Firebase configuration from `/api/config`, so changing server-side configuration does not require rebuilding a client environment file. Never set `FIREBASE_AUTH_EMULATOR_HOST` in production. The server rejects emulator authentication on public hosts.

For this established project, after owner sign-in to the Firebase CLI:

```sh
npm run setup:firebase
npm run deploy
```

The helper reuses the web app, configures the two providers and authorized domain, and stores the API key privately and through Wrangler's stdin. It uses the owner's selected Firebase account email as Google support email, as authorized for this project. It does not accept terms, configure billing, or create paid resources.

After the owner signs into GameReviews once with that Google account, initialize the admin role:

```sh
npm run setup:owner-admin
```

This looks up the verified owner account, stores its Firebase UID in `ADMIN_UIDS`, and refuses to replace an existing administrator list. Refresh GameReviews afterward. Additional administrators should be added by deliberately updating the UID list through Wrangler's hidden prompt.

## Cloudflare

```sh
npx wrangler login
npx wrangler d1 list
```

Reuse the established `gamereviews` database if present. If none exists, create it once:

```sh
npx wrangler d1 create gamereviews
```

Put the returned database ID into `wrangler.jsonc`. Then:

```sh
npx wrangler d1 migrations apply gamereviews --remote
npx wrangler d1 execute gamereviews --remote --file db/seed.sql
npm run deploy
```

The seed command inserts only missing game metadata and never creates community scores. Keep applied migrations immutable; append a migration when the schema changes.

`npm run deploy` checks for a real Firebase project and database ID before building or deploying. If a browsing preview is deployed before Firebase setup, `/api/config` returns `firebase: null` and the interface clearly explains that account services are not connected; do not describe that preview as a fully activated community website.

## IGDB

Create a free Twitch developer application with a confidential client type. Set its credentials through these hidden prompts:

```sh
npx wrangler secret put IGDB_CLIENT_ID
npx wrangler secret put IGDB_CLIENT_SECRET
```

The admin catalog page then supports search and import. Credentials and application access tokens are used only server-side. Metadata imports never copy external ratings. IGDB attribution is included in the footer; monetized use requires following IGDB's commercial partnership process.

## Steam

Steam account linking uses [Steam OpenID](https://partner.steamgames.com/doc/features/auth#website). It does not require a Steam Web API key, playtime access, or asking for Steam passwords. Users must be signed in with a verified account before initiating the flow. Public profile endpoints do not disclose linked Steam IDs. PlayStation linking is not implemented.

## Before opening registration to the public

Verify Google sign-in, actual email delivery, verification/reset redirects, admin access, and a complete approval flow against the production configuration. Finalize the website owner's privacy/terms details. These are owner-specific configuration requirements, not checks the local emulator can prove.
