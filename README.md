# Cardpost

Slow mail. You write a card, it takes real days to arrive, and the recipient cannot see it until it lands.

Two kinds of card: **sealed** (private, one recipient from your address book) and **wandering** (public, passed hand to hand between strangers, ranked on the wall by distance travelled).

The delay is the product. There is no deliver-now.

## Stack

- Next.js 15 (App Router) + TypeScript
- Postgres via Prisma 6 (Neon on Vercel, or any Postgres)
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

## Deploy to Vercel

1. Push this repo and import it in Vercel.
2. Add **Neon** from the Vercel Marketplace (Storage tab). It sets `DATABASE_URL`. Copy the *unpooled* URL into `DIRECT_URL`.
3. Set `APP_URL` to your Vercel URL, `CRON_SECRET` to any long random string, and `RESEND_API_KEY` + `EMAIL_FROM` (a verified sender on Resend).
4. Deploy. The build runs `prisma migrate deploy` before `next build`, so the schema is applied automatically.
5. The cron in `vercel.json` runs `/api/cron/deliver` once a day (Hobby plan limit). Vercel sends the `CRON_SECRET` bearer header itself. The same job also runs in the background after page loads, so arrivals and emails don't wait for the cron. On Pro you can change the schedule to `0 * * * *`.
6. Optional: seed demo holders once with `DATABASE_URL=... npm run db:seed`, and set `DEMO_BOTS=1` so they keep wandering cards moving.

Leave `DEV_TIME_TRAVEL` unset in production.

### Later

- **Stripe**: set `STRIPE_SECRET_KEY` and add a webhook for `checkout.session.completed` pointing at `/api/stripe/webhook`; put its signing secret in `STRIPE_WEBHOOK_SECRET`.
- **Moderation**: set `OPENAI_API_KEY` to use the moderation endpoint instead of the built-in word list.
- **Phone verification**: set the three `TWILIO_*` vars. Without them, verification is a dev toggle (any code passes).

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
src/server/      auth, cards, friends, store, cron, email, moderation, phone (server-only)
src/server/actions.ts   server actions used by the pages
src/components/  postcard faces, artwork, seal reveal, map, shell
src/app/         routes: mailbox, wall, write, store, account, p/[handle], card/[id], login, onboarding, api/*
```
