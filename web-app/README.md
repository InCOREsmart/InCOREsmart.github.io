# InCORE Web App

Standalone responsive web app for InCORE's result-based hiring workflow.

## Code layout
- `index.html` — responsive employer/candidate interface and demo flows.
- `backend.js` — Supabase Auth, profiles, vacancies, applications, employer application review, and draft verification deals.
- `schema.sql` — baseline database schema for a new isolated installation.
- `migrations/` — additive migrations applied to the connected InCORE Supabase project.
- `../public/web-app/` — deployable copy used by the existing Vite/GitHub Pages build. CI checks that the deploy copy matches these source files.

## Current functionality
- Employer and candidate account registration/login through Supabase Auth.
- Role-specific profile creation and editing.
- Business goal editor, saved to the InCORE database for employer accounts.
- Employer vacancy creation and publication.
- Candidate vacancy feed with city/salary/employment/experience filters, skill-overlap matching, touch swipe-to-apply, skip and report actions.
- Candidate applications.
- Employer application review, shortlist/decline actions.
- Vacancy filters for city, work format, salary range, employment type, schedule and experience.
- Skill-overlap indicator for matching (a transparent deterministic heuristic, not an AI assessment).
- Interview scheduling with candidate confirmation/decline and employer cancellation.
- Draft paid-work verification cycle created from a candidate application.
- Server-controlled deal actions: both parties accept terms, employer starts, candidate submits, employer accepts or opens a dispute, and employer can cancel before work starts. Every transition is serialized in Postgres and recorded in an event log.
- Transparent draft calculation: 1,500 RUB/hour and 12% InCORE fee.
- Demo dashboard and candidate cards remain available for interface exploration.
- RLS policies restrict profile, vacancy, application, and deal access by role and relationship.

## What is not production-ready
- No payment provider is connected. The app does not reserve, charge, release, or pay money.
- Deal status transitions are deliberately server-only; funding, acceptance, disputes and payouts need validated Edge Functions and payment webhooks.
- Demo candidate cards and demo vacancies are fictional and are not stored as real users.
- Similarity percentages on demo cards are illustrative, not actual candidate scoring.
- Email verification behavior depends on the current Supabase Auth settings.
- A public launch must wait for approved privacy policy, personal-data consent, operator/legal details, terms for paid verification, data-residency review, and payment-provider/legal review. The currently connected Supabase project is in `eu-west-1` (Ireland); verify applicable Russian personal-data localization requirements before collecting real data from Russian users. See `LAUNCH-BLOCKERS.md`. Do not enter sensitive personal, passport, banking, or other confidential data in the prototype.

## Supabase
The `inc_app_*` schema has been added to the existing project `InCOREsmart.github.io` with additive migrations only. Existing InCORE tables were not modified. Row-level security is enabled on all new tables; the Supabase Security Advisor did not report findings for the new `inc_app_*` tables at the time of the latest check. The project still has pre-existing security warnings on unrelated tables/functions.

## Local testing
Open `index.html` in a browser. Supabase account features require internet access. The static demo UI works without registration, and local demo state is saved in the browser.

## Production checklist
1. Approve privacy policy, personal-data consent text, and legal terms.
2. Test sign-up/email verification with separate employer and candidate accounts.
3. Test RLS as anonymous, employer, candidate, and admin.
4. Implement server-validated deal state transitions, audit events and payment webhooks.
5. Connect a suitable payment provider only after legal and operational review.
6. Add notifications, moderation, reporting, retention/deletion workflows, monitoring and backup checks.
7. Deploy publicly only after the above gates are passed.
