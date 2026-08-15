# Westlands Sports Coach

Real backend, Phase 1: Club sign-up/login working end to end against Supabase.

## What's in this phase

- A proper Vite + React project (this is also the foundation the mobile app build
  will use later, so this isn't throwaway setup)
- A real Supabase connection using your project URL + anon key (already filled
  in for you in `.env.local`)
- Club sign-up, log-in, and a placeholder "you're in" screen once authenticated

Nothing else is wired up yet — no Teams/Players/Calendar pages, no Coach or
Parent accounts. Those come next, once this checkpoint is confirmed working.

## Before you run this

Make sure you've already run the three SQL files (`01_schema.sql`,
`02_security.sql`, `03_signup_trigger.sql`) in your Supabase project's SQL
Editor, in that order, if you haven't already.

**Also check your email confirmation setting** — in Supabase, go to
**Authentication → Providers → Email**. If "Confirm email" is switched on
(the default), you'll need to click a confirmation link in your inbox before
you can log in after signing up. For quick testing, you can temporarily turn
this off — just remember to turn it back on before real coaches/parents use
the app.

## Running it

You'll need [Node.js](https://nodejs.org) installed (the LTS version is fine).
Then, in this folder:

```
npm install
npm run dev
```

That'll print a local address (something like `http://localhost:5173`) —
open that in your browser.

## What to test

1. Click **Create club**, fill in a club name, your name, an email, and a
   password (6+ characters), and submit.
2. If email confirmation is on: check your inbox, click the link, then come
   back and log in.
3. You should land on a screen saying "You're logged in ✅" showing your
   name, role, and club name.

## If something goes wrong

Copy the exact error message you see (in the app, or in the browser's
developer console — right click → Inspect → Console tab) and send it back —
that's the fastest way for me to fix it, since I can't run this against your
live project myself to catch it first.
