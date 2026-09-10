# Cardpost

Slow mail. You write a card, it takes real days to arrive, and the recipient cannot see it until it lands.

Two kinds of card: **sealed** (private, one recipient from your address book) and **wandering** (public, passed hand to hand between strangers, ranked on the wall by distance travelled).

The delay is the product. There is no deliver-now.

## Stack

- Next.js 15 (App Router) + TypeScript
- Supabase Postgres via Prisma 6 (any Postgres works)
- Supabase Storage for uploaded postcard and stamp artwork; the catalogue lives in the database and is managed at `/admin`
- Email magic-link sign-in (Resend)
- A maintenance job flips arrived cards to delivered and sends the one email this app sends. It runs from a daily Vercel cron (the Hobby plan limit) and opportunistically after page loads, at most every 15 minutes
- Stripe Checkout for postage books, OpenAI moderation for wandering text, Twilio Verify for phone verification — all optional, all gated on env vars
- Installable PWA. The API surface lives in `src/server/*` behind thin server actions, so a React Native / Expo app can share it later.

## Run locally

```bash
cp .env.example .env         # fill in DATABASE_URL and DIRECT_URL
npm install
npx prisma migrate deploy    # or: npx prisma migrate dev
npm run db:seed              # optional: demo holders + wandering cards so the wall has life
npm run dev
```

With no `RESEND_API_KEY`, the sign-in link is printed to the terminal and shown on the login screen.
With `DEV_TIME_TRAVEL=1`, a clock bar at the top lets you jump days ahead to watch cards arrive.

To run the maintenance job by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/deliver
```

## Deploy to Vercel with Supabase

1. Push this repo and import it in Vercel.
2. Connect Supabase to the Vercel project through the **Supabase integration** (Vercel → Integrations, or Supabase → Project settings → Integrations). It injects `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, and the app reads those directly. Nothing to copy.
   Without the integration, set `DATABASE_URL` (transaction pooler, port 6543, with `?pgbouncer=true&connection_limit=1`) and `DIRECT_URL` (session pooler or direct, port 5432) from **Project settings → Database**, and `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from **Project settings → API**.
3. The `artwork` Storage bucket is created automatically, public, on the first upload.
4. Set `ADMIN_EMAILS` to your sign-in email so you can reach `/admin`.
5. Set `APP_URL` to your Vercel URL, `CRON_SECRET` to any long random string, and `RESEND_API_KEY` + `EMAIL_FROM` (a verified sender on Resend).
6. Deploy. The build runs `prisma migrate deploy` before `next build`, so the schema is applied automatically. The seven built-in designs are inserted on first use.
7. The cron in `vercel.json` runs `/api/cron/deliver` once a day (Hobby plan limit). Vercel sends the `CRON_SECRET` bearer header itself. The same job also runs in the background after page loads, so arrivals and emails don't wait for the cron. On Pro you can change the schedule to `0 * * * *`.
8. Optional: seed demo holders once with `DATABASE_URL=... npm run db:seed`, and set `DEMO_BOTS=1` so they keep wandering cards moving.

Leave `DEV_TIME_TRAVEL` unset in production.

### Later

- **Stripe**: set `STRIPE_SECRET_KEY` and add a webhook for `checkout.session.completed` pointing at `/api/stripe/webhook`; put its signing secret in `STRIPE_WEBHOOK_SECRET`.
- **Moderation**: set `OPENAI_API_KEY` to use the moderation endpoint instead of the built-in word list.
- **Phone verification**: set the three `TWILIO_*` vars. Without them, verification is a dev toggle (any code passes).

## Adding postcards and stamps

Sign in with an email listed in `ADMIN_EMAILS`, open **Account → Manage catalogue** (`/admin`), and upload the artwork file with a name, artist, cost and orientation. It appears in the store immediately. From the same page you can feature, retire, reprice, or gift a design to every existing account.

- Postcard art: SVG, PNG, JPEG or WebP under 4 MB. Landscape 3:2 (say 1500×1000) or portrait 2:3. The card front is filled edge to edge; thumbnails letterbox.
- Stamp art: roughly square. It is placed inside the perforated frame, tinted by the hue you choose, and cancelled by the postmark on the card.
- Retiring a design hides it from the store but every card already carrying it keeps rendering, because the design id is frozen on the card.
- The seven built-in designs are drawn in code (`src/components/art.tsx`) and seeded as rows; you can retire or reprice them like any other.

## Rules that are decisions, not suggestions

| Rule | Where it lives |
|---|---|
| Delivery days = distance / 1100, clamped 2–14 | `src/lib/geo.ts` |
| Postage = ceil(distance / 1500), clamped 1–8 | `src/lib/geo.ts` |
| Recipient sees nothing before arrival | every recipient query filters `arrivesAt <= now` (`src/server/cards.ts`) |
| Sealed cards only to your address book | `sendSealed` refuses non-friends |
| Wandering recipient is random; 3 per day; phone verified; moderated at send | `sendWandering` |
| 12 free postage every Sunday, capped at 40, whether or not you open the app | `src/server/postage.ts` |
| Design and stamp are frozen on the card at send time | `Card.designId`, `Card.stampId` |
| Reported wandering lines are stripped; the card keeps moving | `reportHop` |
| Unactioned wandering cards return to the pool after 7 days | `src/server/cron.ts` |

## Layout

```
prisma/          schema, migrations, seed
src/lib/         pure logic: cities, distance formulas, catalogue, clock, formatting
src/server/      auth, cards, friends, store, catalogue, storage, admin, cron, email, moderation, phone (server-only)
src/server/actions.ts   server actions used by the pages
src/components/  postcard faces, artwork, seal reveal, map, shell
src/app/         routes: mailbox, wall, write, store, account, p/[handle], card/[id], login, onboarding, api/*
```
