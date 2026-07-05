# VAVEhub

**Value Engineering · Product Cost Optimisation · Competitive Benchmarking**

A deep, interactive single-page reference covering the complete VAVE discipline:

- The **6-phase SAVE International job plan** (Information → Function Analysis → Creative → Evaluation → Development → Presentation)
- **36 cost-reduction levers** across six families: Design, Materials, Manufacturing, Sourcing, Packaging & Logistics, Complexity & Lifecycle
- **12 idea-generation techniques** — TRIZ, SCAMPER, FAST-driven ideation, Brainwriting 6-3-5, morphological analysis and more
- The **modern cost-engineering technology stack** — AI should-cost, cleansheets, CT-scan teardowns, generative design, LLM copilots
- **Teardown & benchmarking methodology** with an animated cost waterfall
- **8 industry playbooks**: Automotive & EV, Consumer Products, Heavy Machinery, Home Appliances, Aerospace & Defence, Electronics, Medical Devices, Industrial & Energy

Pure HTML/CSS/JS — no frameworks, no build step, no dependencies. Deployed via GitHub Pages.

*Designed & Developed by Avinash Bhosale*

## Activating integrations (5 minutes each)

All integrations live in **`site-config.js`** — fill a value, commit, and the feature switches on:

| Feature | Service (free tier) | What to paste |
|---|---|---|
| Newsletter capture | [buttondown.com](https://buttondown.com) | your username → `buttondownUser` |
| Contact form inbox | [formspree.io](https://formspree.io) | form ID → `formspreeId` |
| Visitor analytics | [goatcounter.com](https://www.goatcounter.com) | site code → `goatcounterCode` |

Until configured, the newsletter and contact form gracefully fall back to opening
a pre-filled email draft.

## Going live with real accounts & certificates (Supabase)

The login page (`auth.html`), cross-device progress sync, and certificate
verification (`verify.html`) all run in **demo mode** until Supabase is connected.
To switch everything to production:

1. **Create a free project** at [supabase.com](https://supabase.com).
2. **Run the schema:** open **SQL Editor → New query**, paste all of
   `supabase-setup.sql`, and click **Run** (creates the profiles / progress /
   certificates tables with row-level security).
3. **Enable email codes:** **Authentication → Providers → Email** — turn on
   "Confirm email" with the **OTP** (6-digit) option.
4. **Add your keys:** **Project Settings → API** — copy the **Project URL** and
   the **anon public** key into `site-config.js`:
   ```js
   supabaseUrl:     "https://YOUR-PROJECT.supabase.co",
   supabaseAnonKey: "eyJ...your anon public key...",
   ```
5. Commit & push. Done — real OTP emails, accounts, cloud progress and public
   certificate verification are now live. (The anon key is public-safe by
   design; the tables are protected by row-level security.)
