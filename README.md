# Cardpost

Slow mail. You write a card, it takes real days to arrive, and the recipient cannot see it until it lands.

Two kinds of card: **sealed** (private, one recipient from your address book) and **wandering** (public, passed hand to hand between strangers, ranked on the wall by distance travelled).

The delay is the product. There is no deliver-now.

## Stack

- Next.js 15 (App Router) + TypeScript
- Supabase Postgres via Prisma 6 (any Postgres works)
- Supabase Storage for uploaded postcard and stamp artwork; the catalogue lives in the database and is managed at `/admin`
- Sign-in with Supabase Auth: email + password, email magic link, and Google (optional). Users appear under Authentication in Supabase and as profile rows in the User table
- A maintenance job flips arrived cards to delivered and sends the one email this app sends. It runs from a daily Vercel cron (the Hobby plan limit) and opportunistically after page loads, at most every 15 minutes
- Stripe Checkout for postage books and OpenAI moderation for wandering text — both optional, gated on env vars
- Installable PWA. The API surface lives in `src/server/*` behind thin server actions, so a React Native / Expo app can share it later.

## Run locally

```bash
cp .env.example .env         # fill in DATABASE_URL and DIRECT_URL
npm install
npx prisma migrate deploy    # or: npx prisma migrate dev
npm run db:seed              # optional: demo holders + wandering cards so the wall has life
npm run dev
```

With no Supabase keys set locally, a built-in dev sign-in shows the link on the login screen. In production, sign-in always goes through Supabase Auth.
With `DEV_TIME_TRAVEL=1`, a clock bar at the top lets you jump days ahead to watch cards arrive.

To run the maintenance job by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/deliver
```

## Deploy to Vercel with Supabase

1. Push this repo and import it in Vercel.
2. Connect Supabase to the Vercel project through the **Supabase integration** (Vercel → Integrations, or Supabase → Project settings → Integrations). It injects `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, and the app reads those directly. Nothing to copy.
   Without the integration, set `DATABASE_URL` (transaction pooler, port 6543, with `?pgbouncer=true&connection_limit=1`) and `DIRECT_URL` (session pooler or direct, port 5432) from **Project settings → Database**, and `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from **Project settings → API**.
3. In Supabase, open **Authentication → URL Configuration**. Set **Site URL** to your Vercel URL and add `https://your-app.vercel.app/auth/callback` under **Redirect URLs**. Sign-in links bounce without this.
   Password sign-in needs no email at all. To let people create accounts without a confirmation email while you're testing, turn off **Confirm email** under **Authentication → Providers → Email**; turn it back on once you've added a real sender under **Authentication → SMTP Settings** (Resend works: host `smtp.resend.com`, port 465, user `resend`, password your API key). Supabase's built-in mailer allows only a few emails an hour.
   For Google sign-in: create an OAuth client in Google Cloud Console (Web application, authorised redirect URI `https://PROJECT.supabase.co/auth/v1/callback`), paste its client ID and secret into **Authentication → Providers → Google** in Supabase. The button is always shown; set `GOOGLE_SIGNIN=0` to hide it.
4. The `artwork` Storage bucket is created automatically, public, on the first upload.
5. Set `ADMIN_EMAILS` to your sign-in email so you can reach `/admin`.
6. Set `CRON_SECRET` to any long random string. Optionally set `RESEND_API_KEY` + `EMAIL_FROM` so arrival notifications go out; sign-in works without them.
7. Deploy. The build runs `prisma migrate deploy` before `next build`, so the schema is applied automatically. The seven built-in designs are inserted on first use.
8. The cron in `vercel.json` runs `/api/cron/deliver` once a day (Hobby plan limit). Vercel sends the `CRON_SECRET` bearer header itself. The same job also runs in the background after page loads, so arrivals and emails don't wait for the cron. On Pro you can change the schedule to `0 * * * *`.
9. Optional: seed demo holders once with `DATABASE_URL=... npm run db:seed`, and set `DEMO_BOTS=1` so they keep wandering cards moving.

Leave `DEV_TIME_TRAVEL` unset in production.

### Later

- **Stripe**: set `STRIPE_SECRET_KEY` and add a webhook for `checkout.session.completed` pointing at `/api/stripe/webhook`; put its signing secret in `STRIPE_WEBHOOK_SECRET`.
- **Moderation**: set `OPENAI_API_KEY` to use the moderation endpoint instead of the built-in word list.

## Invite links

Every account has a link like `https://your-app/i/abc1234` under **Account → Invite friends**. Someone who joins through it is placed in the inviter's address book at once, and both receive `INVITE_BONUS` postage (default 5; the inviter is rewarded for at most `INVITE_REWARD_CAP` sign-ups). A signed-in person who opens someone's link is simply linked as a friend.

## People

The admin page lists everyone with an account. **Delete** removes their sign-in from Supabase Auth and retires their profile here. Deleting a user directly in Supabase's Authentication page also works: the maintenance job notices within the hour and retires the profile.

## Adding postcards and stamps

Profile pictures are uploaded from Account, squared and shrunk to 256px in the browser, and stored in the same Supabase bucket under `avatars/`.

Sign in with an email listed in `ADMIN_EMAILS`, open **Account → Manage catalogue** (`/admin`), and upload the artwork file with a name, artist, cost and orientation. It appears in the store immediately. From the same page you can feature, retire, reprice, or gift a design to every existing account.

- Postcard art: SVG, PNG, JPEG or WebP under 4 MB. Landscape 3:2 (say 1500×1000) or portrait 2:3. The card front is filled edge to edge; thumbnails letterbox.
- Stamp art: roughly square. It is placed inside the perforated frame, tinted by the hue you choose, and cancelled by the postmark on the card.
- Retiring a design hides it from the store but every card already carrying it keeps rendering, because the design id is frozen on the card.
- The seven built-in designs are drawn in code (`src/components/art.tsx`) and seeded as rows; you can retire or reprice them like any other.

## Rules that are decisions, not suggestions

| Rule | Where it lives |
|---|---|
| Delivery days = distance / 1100, clamped 2–14 | `src/lib/geo.ts` |
| Posting city is any city with 100,000+ people (GeoNames via all-the-cities), searched in a typeahead | `src/lib/cities.ts`, `src/app/api/cities` |
| Postage = ceil(distance / 1500), clamped 1–8 | `src/lib/geo.ts` |
| Recipient sees nothing before arrival | every recipient query filters `arrivesAt <= now` (`src/server/cards.ts`) |
| Sealed cards only to your address book | `sendSealed` refuses non-friends |
| Wandering recipient is random; 3 per day; moderated at send | `sendWandering` |
| 12 free postage every Sunday, capped at 40, whether or not you open the app | `src/server/postage.ts` |
| Design and stamp are frozen on the card at send time | `Card.designId`, `Card.stampId` |
| Reported wandering lines are stripped; the card keeps moving | `reportHop` |
| A sender can recall a card until it lands; postage refunded. After that it belongs to the recipient | `recallCard` |
| Deleting a person anonymises their profile ("Deleted account") so delivered cards keep rendering; undelivered ones are destroyed | `src/server/people.ts` |
| Unactioned wandering cards return to the pool after 7 days | `src/server/cron.ts` |

## Layout

```
prisma/          schema, migrations, seed
src/lib/         pure logic: cities (generated dataset in cities-data.ts), distance formulas, catalogue, clock, formatting
src/server/      auth, cards, friends, store, catalogue, storage, admin, cron, email, moderation, phone (server-only)
src/server/actions.ts   server actions used by the pages
src/components/  postcard faces, artwork, seal reveal, map, shell
src/app/         routes: mailbox, wall, write, store, account, p/[handle], card/[id], login, onboarding, api/*
```
