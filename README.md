# AI at Work for NGO Teams

A self-paced learning website for NGO staff anywhere in the world: how to use AI tools safely on real work.

- `index.html`: the whole course. It opens on a learning dashboard (progress, next chapter, sector and toolkit cards) and shows one chapter at a time with Previous and Next links.
- `config.js`: your Supabase project URL and public key. Leave it empty to run without accounts.
- `backend.js`: sign-in, progress sync, pilot surveys and the trainer dashboard, using Supabase.
- `supabase/schema.sql`: the database tables and security rules. Run it once in Supabase.
- `course/index.html`: redirects old links to the home page.

Plain HTML, CSS and JavaScript. No build step. Hosted with GitHub Pages from the `main` branch root.

## How saving works

- **Without Supabase** (`config.js` empty): progress is saved only in each visitor's own browser, as before. The Sign in button is hidden and the Pilot surveys page says surveys aren't switched on.
- **With Supabase:** anyone can create an account with their name, email and a password. Their progress follows them across devices. A pilot code from an NGO is optional and can be added later from the account window. They fill in the start and end surveys on the Pilot surveys page. The trainer sees results by organization on `#trainer`.

## Setting up Supabase (about 15 minutes)

1. **Create a project** at supabase.com (free plan). Pick the region closest to most of your learners.
2. **Create the tables.** In the dashboard, open SQL Editor → New query, check the dropdown next to Save says **Database** (not Logs), paste all of `supabase/schema.sql`, and click Run. Projects set up before these features existed also need `supabase/2-individual-signup.sql` and then `supabase/3-recovery-codes.sql`, each run once.
3. **Set the sign-in redirect.** Authentication → URL Configuration:
   - Site URL: your GitHub Pages address, e.g. `https://zionkiwiamarshall-dot.github.io/ai-training-for-ngo-s/`
   - Redirect URLs: add the same address.
4. **Connect the site.** Project Settings → API. Copy the Project URL and the `anon` `public` key into `config.js`, then commit and push. Never put the `service_role` key in this repo.
5. **Make yourself the trainer.** Create an account on the site, then run this in the SQL Editor:
   ```sql
   update profiles set role = 'admin'
   where id = (select id from auth.users where email = 'zion.kiwiamarshall@gmail.com');
   ```
   Reload the site: **Trainer dashboard** now appears in the left menu.
6. **Add each pilot NGO** from the Trainer dashboard (name and pilot code, e.g. `TAMWA-2026`) and give the code to that NGO's staff.

### Email limits

Supabase's built-in email sender is only for testing and allows very few sign-in emails per hour. While testing, you can turn off Authentication → Sign In / Providers → Email → **Confirm email**, so new accounts can sign in straight away. Before a pilot session where 15 people sign up at once, set up your own SMTP under Authentication → Emails → SMTP Settings (Resend, Brevo or your Gmail with an app password all work).

## Forgotten passwords (no email needed)

- At sign-up every learner is shown a one-time **recovery code** (e.g. `XKJ5-HSZN-VLVP-TUMB`) to save. Only a scrambled hash is stored.
- **Forgot password?** asks for email + recovery code + new password. The code works once; a new one is shown right after. Five wrong tries lock recovery for 15 minutes.
- A learner who lost both can ask the trainer: **Trainer dashboard → Learners → Reset password** shows a temporary password to pass on privately.
- Learners can make a new code any time from their account window.

## Data protection

- The database stores only names, work emails, course progress and survey answers. Learners agree to this at sign-up.
- Row level security means each learner can read only their own rows; only the admin can see everyone's.
- Pilot codes can't be read by learners.
- The CSV export from the Trainer dashboard replaces names with references (L1, L2, …) so it can be shared as anonymized results.
- Signing out clears the learner's progress from the browser, for shared office computers.

## Editing

- **Brand colours:** the four `--brand` tokens at the top of the `<style>`.
- **Quizzes, sectors, roles, templates and stories:** data arrays in the `<script>`: `Q`, `SECT`, `FN`, `TPL`, `STRIPS`, `PPL`.
- **Chapter order and titles in the Previous/Next links:** `VIEWS` and `VT`.
- **Survey questions:** `renderSurveys()` in `backend.js`, plus the `surveys` table in `supabase/schema.sql` if you add a field.

## Content notes

Personas and stories are fictional. AI outputs in the examples are illustrative, not recorded sessions. Statistics are sourced in the Glossary and sources chapter.
