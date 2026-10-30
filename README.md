# GameReviews

A community game review website built from the supplied `uiassets` references. React/TypeScript handles the interface; a Cloudflare Worker and D1 database handle persistent data and moderation; Firebase handles accounts.

Live website: https://gamereviews.gamereviews-saimadhav10.workers.dev

## Local development

Use **Node.js 24 LTS** and npm. No paid accounts or live service keys are needed for local development.

```sh
npm ci
npm run setup:local
npm run db:migrate
npm run db:seed
npm run build
npm run dev
```

Open **http://127.0.0.1:5173**. The local Firebase Authentication emulator provides working email/password registration, verification links, password reset, and simulated Google sign-in. These are development accounts, not production identities. The emulator dashboard is at http://127.0.0.1:4000.

After starting development services, create a local administrator:

```sh
npm run setup:admin-local
```

The helper saves local-only sign-in details in `.local/admin.env`, updates the ignored `.dev.vars`, and never creates a production account. After restarting the auth emulator, run the helper again. Ordinary emulator accounts are ephemeral; local D1 data persists in `.wrangler/`.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

Tests use a separate authentication emulator on port 9199 and an isolated, ephemeral D1 database. They do not mutate the development or production database. The suite covers account boundaries, score edits, moderation/revision races, vote changes, anonymity, ranking eligibility, 24-hour highlights, catalog approval, Steam state validation, and safe spoiler/text rendering.

## Included features

- Searchable game catalog with platform/genre/year filters.
- Game pages, editable decimal ratings, reviews, and threaded replies.
- Email/password and Google authentication integration, verification, and recovery screens.
- Profile-wide anonymity, contribution status tracking, and private account settings.
- Community Top 50 and rolling 24-hour review/comment highlights.
- Admin approval queues, feedback, catalog management, IGDB import, and ranking settings.
- Optional Steam linking with state validation and account ownership checks through Steam OpenID.
- Responsive layouts, keyboard-accessible forms, focus states, spoiler concealment, and honest empty states.

The starter catalog contains 14 actual games. No community reviews, accounts, votes, or scores are seeded. Initial metadata comes from the Steam Store; the first four cover illustrations reuse the supplied design references. Other starter artwork comes from the corresponding Steam Store pages.

## Production

See [deployment instructions](docs/DEPLOYMENT.md), [product requirements](docs/REQUIREMENTS.md), and [verification results](docs/VERIFICATION.md). Production is designed for free Cloudflare Workers/D1 and Firebase Spark allowances. Quota limits still apply. No custom domain purchase or paid plan is required.

The established Firebase project is connected and its providers/domain are configured. `npm run setup:firebase` reconnects that project through the signed-in owner without printing keys. After the owner's first Google sign-in on the website, `npm run setup:owner-admin` initializes administrator access without replacing an existing administrator list.

Never commit `.dev.vars`, `.env*`, `.local/`, or authentication credentials. Public Firebase web configuration is returned by `/api/config`; server-only integration secrets remain in Worker environment settings. The browser build does not require `VITE_*` variables.
