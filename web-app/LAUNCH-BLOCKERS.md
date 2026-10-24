# Launch blockers — do not publish to production yet

The feature branch is ready for review, but public signup and real candidate/employer data must not be exposed until these decisions are complete.

## 1. Personal-data operator and documents
- Confirm the legal operator of the service and its official details.
- Approve the privacy policy and the exact personal-data processing consent.
- Approve terms for employers and candidates, including the paid verification task, acceptance, dispute and refund rules.
- Add the approved documents and explicit consent/version logging before public registration.

## 2. Data residency
The currently connected Supabase project `utsuzqmzawunqpiguuhk` is hosted in `eu-west-1` (Ireland). If the service collects personal data of Russian citizens, legal counsel must verify the applicable localization requirements before any production collection. If Russian localization is required, move the primary collection/storage path to a compliant Russian-hosted environment before launch. Do not assume the current EU region satisfies that requirement.

## 3. Payments
No payment provider is configured for this web app. Do not represent a draft as funded escrow. Before charging users, confirm provider support, legal settlement model, fee split, receipt/tax treatment, refunds, disputes and webhook security.

## 4. Release gate
Keep the branch and pull request in draft until the above points are resolved. The current app can be tested with fictional demo records and test accounts only. Existing production website files are not modified by this branch.
