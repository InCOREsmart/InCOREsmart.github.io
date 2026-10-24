# InCORE Web App (prototype)

Standalone web application prototype for InCORE's result-based hiring flow. This directory is intentionally isolated from the existing website root.

## Open locally
Open `index.html` in a browser. The interface is responsive and has no build step. Google Fonts are optional; system fonts are used as a fallback.

## Implemented in this prototype
- Employer/candidate role switch.
- Business goal editor (business outcome, constraints, hiring direction, timeframe, salary band, skills).
- Candidate selection flow and candidate-side vacancy feed.
- Demo applications and activity history.
- Draft paid-work verification cycle (2–48 hours).
- Transparent calculation: 1,500 RUB/hour and 12% InCORE fee.
- Local browser persistence.
- Responsive desktop and mobile layouts.

## Important limitations
This is an interactive frontend prototype, not a production hiring or payment service:
- The sample candidate/vacancy profiles are fictional demo records.
- Data currently stays in the current browser; accounts and cross-user sync are not connected.
- Similarity percentages are display examples, not computed assessments.
- No funds are reserved, charged, or paid.
- The word “escrow” must not be used as a legal/payment claim until the provider and contract model support it.
- Do not enter real personal, passport, banking, or other sensitive data.

## Backend migration
`schema.sql` proposes isolated `inc_app_*` tables with row-level security. It must be reviewed and applied as a migration only after confirming this is the intended InCORE Supabase project. It does not alter the existing InCORE tables.

## Production checklist
1. Connect Supabase Auth and persist user role/profile.
2. Replace demo profiles with server-backed candidate and vacancy records.
3. Implement server-validated deal state transitions; clients must not update payment statuses.
4. Connect a payment provider only after legal and operational review.
5. Add email/Telegram notifications, moderation, reporting, audit logs, privacy/consent flows and data-retention rules.
6. Test RLS with employer, candidate, anonymous and admin accounts.
7. Deploy to a separate preview URL before linking from the main InCORE site.
