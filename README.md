# OiTesla (Dhaka Tesla Pool)

**Demo Video Link:** [Insert 6-minute demo video link here]

## Summary & Problem Statement
During Banani rush hour, three-wheeled battery-powered rickshaws (locally called "Teslas") are in incredibly high demand. Currently, if Nusrat books a Tesla from Banani to Mohakhali, she occupies the entire vehicle, leaving its other seats empty. Meanwhile, Rafiq is stranded on the same street corner trying to get to Gulshan. 

**OiTesla** is a ride-pooling MVP built to solve this exact capacity mismatch. When Nusrat requests a ride, Jashim (the driver of a 3-seat Tesla named "Bullet") accepts it. When Rafiq requests a ride heading in a compatible direction, OiTesla's matching engine dynamically pools him into Jashim's active ride. Both passengers receive a pooled fare discount, and Jashim maximizes his vehicle's capacity. When Shirin tries to claim the last seat simultaneously with Rafiq, the engine uses strict transactional row-locking to guarantee the vehicle is never overbooked.

## Features Implemented
- **Role-Based Auth**: Secure signup/login for both Drivers and Passengers using JWTs.
- **Dynamic Pooling Engine**: Matches passenger requests to an active pool if the pickup zone is identical and the destination zone is directionally compatible (e.g. Banani → Mohakhali and Banani → Gulshan).
- **Concurrency-Safe Capacity**: Uses PostgreSQL row-locking to ensure two simultaneous requests for a vehicle's final seat never result in overbooking.
- **Strict State Machine**: Enforces a strict lifecycle (`REQUESTED` → `MATCHED`/`ACCEPTED` → `DRIVER_ARRIVED` → `STARTED` → `COMPLETED`).
- **Idempotent Fares & TeslaPay**: Calculates fares without float precision errors by using integer `poysha`. Supports automated wallet deductions for TeslaPay or Cash on completion.

*(Screenshots / GIF placeholders)*
- `![Passenger Requesting Ride](docs/passenger-request.gif)`
- `![Driver Dashboard Pool View](docs/driver-pool.png)`

## Architecture & Database Design

### System Architecture
```mermaid
flowchart LR
    Browser[Web Browser] -->|HTTP / JSON| NextJS[Next.js App Router]
    NextJS -->|REST API| Express[Express Node.js API]
    Express -->|Prisma Client| Postgres[(PostgreSQL 15)]
```

### Entity-Relationship Diagram
```mermaid
erDiagram
    USER {
        int id PK
        enum role "PASSENGER | DRIVER"
        string name
        string email
        string password_hash
        int wallet_balance "Stored in poysha"
    }
    VEHICLE {
        int id PK
        int driver_id FK
        string name
        int seat_capacity
        enum status "ONLINE | OFFLINE"
    }
    POOL {
        int id PK
        int vehicle_id FK
        enum status "ACTIVE | COMPLETED"
    }
    RIDE_REQUEST {
        int id PK
        int passenger_id FK
        int pool_id FK
        string pickup_zone
        string destination_zone
        int seats_requested
        enum status "Lifecycle Enum"
        int fare_amount
        enum payment_method "CASH | TESLA_PAY"
    }

    USER ||--o{ VEHICLE : "drives"
    USER ||--o{ RIDE_REQUEST : "requests"
    VEHICLE ||--o{ POOL : "hosts"
    POOL ||--o{ RIDE_REQUEST : "contains"
```

## Tech Stack & Project Structure
- **Frontend**: Next.js 14 (App Router), React 18, standard DOM styling (no heavy CSS frameworks to keep the MVP lean).
- **Backend**: Node.js, Express, TypeScript.
- **Database**: PostgreSQL 15, Prisma ORM.
- **Testing**: Jest, Supertest.
- **DevOps**: Docker & Docker Compose.

**Monorepo Structure:**
- `/apps/web` - Frontend Next.js app.
- `/apps/api` - Backend Express API and Prisma schema/migrations.

## Prerequisites
- Node.js 18+ (if running locally without Docker)
- Docker & Docker Compose (Recommended)

## Environment Variables
Environment variables are documented in `.env.example`. No real secrets are committed to the repository.
```env
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/oitesla?schema=public"
JWT_SECRET="supersecretjwtkey123"
WEB_PORT=3000
API_PORT=3001
POSTGRES_PORT=5432
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

## Local Setup & Docker Instructions
OiTesla is fully containerized for a zero-configuration cold boot.
1. Clone the repository and copy the environment variables:
   ```bash
   cp .env.example .env
   ```
2. Spin up the cluster:
   ```bash
   docker compose up --build
   ```
*Note: The `api` container is wired to automatically generate the Prisma client, deploy migrations, and run the idempotent seed script (`apps/api/prisma/seed.ts`) before starting the server.*

## How to Run Tests
The test suite utilizes Jest and Supertest to validate pooling concurrency, capacity constraints, fare logic, and state transition matrices.
```bash
# Executed within the API container or locally
cd apps/api
npm install
npm test
```

## Demo Credentials
The database automatically seeds the primary cast on boot. All passwords are `hashedpassword123`.
- **Driver**: `jashim@oitesla.com`
- **Passenger 1**: `nusrat@oitesla.com`
- **Passenger 2**: `rafiq@oitesla.com`
- **Passenger 3**: `shirin@oitesla.com`

## Deployment Constraint
**Deployment URL:** [N/A - See Below]
Due to recent shifts in cloud provider policies (Heroku, Render, Railway restricting zero-touch free tiers), deploying a multi-tier Dockerized app with a permanent PostgreSQL instance for absolutely free requires manual identity verification/credit cards. 

**Recommended architecture for manual deployment:**
- **Frontend**: Vercel (Free Next.js hosting).
- **Backend**: Render Free Web Service (Expect a 50s cold-start delay after 15 mins of inactivity).
- **Database**: Supabase or Neon.tech (Free PostgreSQL tiers).

## API Overview
- `POST /api/auth/signup` & `POST /api/auth/login` - Role-based JWT authentication.
- `POST /api/rides` - (Passenger) Requests a ride, calculating fare and finding/creating a pool.
- `GET /api/passenger/rides/active` & `/history` - (Passenger) State tracking.
- `PATCH /api/rides/:id/status` - (Passenger) Cancellation endpoint.
- `GET /api/driver/pools` & `/history` - (Driver) Retrieves assigned pooling contexts.
- `PATCH /api/driver/pools/:pool_id/status` - (Driver) Batch advances all ride requests within a pool to the next state (`ACCEPTED` -> `DRIVER_ARRIVED` -> `STARTED` -> `COMPLETED`).

## Key Decisions & Trade-Offs
1. **Integer Currency (`poysha`)**: Chose to avoid floats completely for standard financial safety.
2. **Simplified Geography**: Built a fixed `COMPATIBILITY_MAP` matrix for zones instead of relying on real-world GIS routing, allowing us to focus entirely on the core capacity algorithms and race-condition safety.
3. **Optimistic Locking vs Pessimistic Locking**: Opted for pessimistic locking (`SELECT ... FOR UPDATE` and `SKIP LOCKED`) when booking rides, as it prevents overlapping reads during extreme concurrency bursts (e.g. Nusrat and Shirin clicking "Book" on the exact same millisecond).

## Known Limitations & Next Improvements
- **GIS Routing**: Replacing the static zone matrix with Google Maps/Mapbox for live ETA and dynamic overlapping route calculations.
- **WebSocket / SSE Updates**: Currently, the dashboard relies on 5-second HTTP polling. WebSockets would provide instant state transitions.
- **Payment Gateway**: Integrating a real gateway like SSLCommerz instead of the simulated TeslaPay wallet.

## AI Usage
- **Tools Used**: Antigravity (Google Deepmind AI agent) for end-to-end scaffolding, logic generation, and automated testing.
- **Suggestion Accepted As-Is**: I adopted the AI's suggestion to use `prisma.$transaction` combined with raw Postgres `SELECT * FROM "Vehicle" FOR UPDATE` row locks to safely enforce vehicle capacity bounds during simultaneous booking requests.
- **Suggestion Rejected/Changed**: I rejected storing the database validation for `seats_requested > 0` directly in the Prisma `schema.prisma` file because Prisma doesn't natively support dynamic `CHECK` constraints cleanly without `Unsupported()`. Instead, I wrote a raw SQL migration specifically to attach the `CHECK` constraint at the database layer.
