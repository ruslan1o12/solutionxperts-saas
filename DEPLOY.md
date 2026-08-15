# Deploying SolutionXperts

This is a real multi-user web app — login, shared customer/lead database,
quoting, Stripe payments, and a door-knock map. Three free/cheap services
host it: GitHub (code), Supabase (database + login), Vercel (hosting).

## 1. Push the code to GitHub

1. Unzip this project.
2. Go to https://github.com/new — create a repo named `solutionxperts-saas`, Public or Private, don't initialize with anything.
3. On the empty repo page, use "uploading an existing file" and upload everything
   EXCEPT the `node_modules` folder and `.next` folder (they shouldn't be in
   the zip, but double check) — or if you're on a computer, use the command
   line:
   ```
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/solutionxperts-saas.git
   git push -u origin main
   ```

## 2. Set up Supabase (free database + login system)

1. Go to https://supabase.com → sign up → **New project**
2. Name it `solutionxperts`, set a database password (save it somewhere), pick a region close to you (e.g. Canada Central)
3. Once it's created, go to **SQL Editor** (left sidebar) → **New query**
4. Open `supabase-schema.sql` from this project, copy all of it, paste it in, click **Run**
   — this creates all your tables and security rules in one shot
5. Go to **Settings → API** (left sidebar) — you'll need two values from here in a minute:
   - **Project URL**
   - **anon public** key

## 3. Deploy to Vercel

1. Go to https://vercel.com → sign up (use "Continue with GitHub" — easiest)
2. Click **Add New → Project**
3. Import your `solutionxperts-saas` GitHub repo
4. Before clicking Deploy, expand **Environment Variables** and add:
   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | (Project URL from Supabase step 2.5) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (anon public key from Supabase step 2.5) |
   | `STRIPE_SECRET_KEY` | (from Stripe Dashboard → Developers → API keys — use the **test** key first, `sk_test_...`) |
5. Click **Deploy**. Takes about a minute.
6. You'll get a live URL like `https://solutionxperts-saas.vercel.app`

## 4. Try it

1. Open your Vercel URL → **Sign in** → **Create an account** (this is your first team login — anyone who signs up joins the same shared workspace, up to your team size)
2. Add a customer, create a quote, tap "Save & generate payment link" — with the test Stripe key, this makes a real payment link in **test mode** (won't charge anyone for real)
3. Go to the Map tab, allow location access, tap "Log door here" to test a pin

## 5. Go live with real payments

In Stripe Dashboard, toggle out of test mode, copy your **live** secret key
(`sk_live_...`), and replace the `STRIPE_SECRET_KEY` value in Vercel
(Project → Settings → Environment Variables) → redeploy.

## Notes

- Every signed-in team member sees the same shared customers/quotes/map data — like Homebase.
- The `middleware.ts` deprecation warning during build is safe to ignore — it still works, Next.js is just renaming the convention in a future version.
- Custom domain: Vercel → Project → Settings → Domains, point your domain's DNS at Vercel, free SSL included.
