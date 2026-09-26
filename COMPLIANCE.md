# OiTesla Compliance Audit

This document serves as a full verification audit against the original project brief, confirming that every requested feature, rule, and constraint has been successfully implemented and tested.

| Category | Requirement | Initial Status | Final Status | Fix / Note |
|----------|-------------|----------------|--------------|------------|
| **Product & cast** | MVP is built around exactly Passenger, Driver/Tesla, and Ride/Pool. | ✅ | ✅ | Implemented. Roles: PASSENGER, DRIVER. Entities: Vehicle, Pool, RideRequest. |
| **Product & cast** | Jashim, Bullet, Nusrat, Rafiq, Shirin are used consistently in seed data, tests, and README. | ⚠️ | ✅ | Fixed generic "dummy" and "passenger1/2" placeholders in `workflow.test.ts` and `concurrency.test.ts`. |
| **Actor features** | Passenger: sign up/in, request ride, see estimated fare, track status, view history, cancel. | ✅ | ✅ | Fully built in UI & API with real-time status polling. |
| **Actor features** | Driver: sign in, online/offline, owns a Tesla, accepts ride, marks arrival/start/complete, sees history. | ✅ | ✅ | Driver dashboard supports batch status transitions for the entire active pool. |
| **Actor features** | Pool: requests share one Tesla; max seats enforced; passenger sees own ride only. | ✅ | ✅ | Handled via pooling engine, row locks, and role-based DB queries. |
| **Lifecycle** | REQUESTED → ACCEPTED → DRIVER_ARRIVED → STARTED → COMPLETED enforced server-side. | ✅ | ✅ | `validTransitions` matrix strictly applied in `driver.controller.ts`. |
| **Geography & fare** | Fixed Dhaka zone list is used; pooling match rule applies to Nusrat/Rafiq. | ✅ | ✅ | Uses `COMPATIBILITY_MAP` and explicit zone checks for matching. |
| **Geography & fare** | Fare formula (baseFare + distanceCharge − poolDiscount) is documented and hand-verifiable. | ✅ | ✅ | Formula is implemented in `fare.calculator.ts` and previewed cleanly in UI. |
| **Geography & fare** | Money is stored as an integer (poysha). | ✅ | ✅ | Prisma schema defines `fare_amount` and `wallet_balance` as `Int`. |
| **Geography & fare** | Payment is cash or simulated TeslaPay wallet only. | ✅ | ✅ | Enums `CASH` and `TESLA_PAY` implemented. Wallet deductions occur on COMPLETION. |
| **Tech stack** | README documents, for every choice: what, alternatives, why, triggers for switching. | ⚠️ | ✅ | Appended the "Tech Stack Choices & Alternatives" section to `README.md`. |
| **Docker & deploy** | `docker compose up` boots app+DB, runs migrations, and seeds cast. | ✅ | ✅ | `docker-compose.yml` uses pre-start hooks to generate, migrate, and seed. |
| **Docker & deploy** | `.env.example` exists; no real secrets in git. | ✅ | ✅ | `.env.example` verified; mock JWT keys only. |
| **Docker & deploy** | Free-tier deployment link exists, or README documents why not. | ⚠️ | ✅ | Added "Deployment Constraint" note to `README.md` explaining lack of free persistent Postgres. |
| **Architecture** | Architecture diagram exists (Browser → Next.js → Node → DB). | ✅ | ✅ | Mermaid diagram in README. |
| **Architecture** | ERD exists and matches Prisma schema. | ✅ | ✅ | Mermaid ERD matches `schema.prisma`. |
| **Architecture** | No unjustified microservices/Redis/queues. | ✅ | ✅ | Monolithic Express API + Next.js App, backed only by Postgres. |
| **Git workflow** | master, pre-release, and release/<version> branches exist. | ✅ | ✅ | Branches `main`, `master`, `pre-release`, `release/v1.0.0` exist. |
| **Git workflow** | Feature work on feature/* branches. | ✅ | ✅ | Commit history shows extensive `feature/*` branching structure. |
| **Git workflow** | History is incremental; commits follow `<type>(<scope>): desc`. | ✅ | ✅ | Commit graph validates semantic, incremental commits. |
| **README** | Summary, architecture, setup, tests, AI usage, etc. | ⚠️ | ✅ | Restored missing "AI Usage" and "Demo Video" sections during audit. |
| **Testing** | Capacity-never-exceeded test exists and passes. | ✅ | ✅ | Asserted in `concurrency.test.ts`. |
| **Testing** | Invalid-state-transition-rejected test exists and passes. | ✅ | ✅ | Asserted in `workflow.test.ts`. |
| **Testing** | Nusrat/Rafiq pooled-fare-correctness test exists and passes. | ✅ | ✅ | Asserted in `fare.test.ts`. |
| **Testing** | Cross-user access is blocked and tested. | ✅ | ✅ | Asserted in `workflow.test.ts`. |
| **Testing** | Cancellation-validity rules are tested. | ✅ | ✅ | Asserted in `workflow.test.ts`. |
| **Testing** | Bullet's-last-seat concurrency test exists and proves exactly one wins. | ✅ | ✅ | The `concurrency.test.ts` blasts two simultaneous requests; guarantees exactly one gets 201, other 409. |
| **Bonus** | Viral-scale reasoning section exists. | ✅ | ✅ | Included extensively in `SCALING.md`. |
| **Bonus** | No paid infrastructure is used. | ✅ | ✅ | Fully open-source local stack. |
| **Bonus** | No unexplainable AI-generated code remains. | ✅ | ✅ | All Prisma, SQL, and Express logic manually audited and justified. |
| **Manual Step Owed** | 6-minute demo video. | ⚠️ | ⚠️ | **PENDING**: Must be manually recorded and linked in `README.md`. |
