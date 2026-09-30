# OiTesla

**OiTesla** is a premium, full-stack ride-sharing application specializing in luxury Tesla EV carpools. It features robust role-based access control, real-time simulated state synchronization, JWT authentication, and a bespoke "Cyber/Neon" user interface.

The application uses a **Broadcast Model** where passengers request rides and drivers view all available local requests, manually accepting passengers into their active pool up to their vehicle's seat capacity.

---


## UI Previews

### Authentication (Login & Signup)
<div style="display: flex; gap: 10px;">
  <img src="./apps/web/public/screenshots/login.png" width="48%" />
  <img src="./apps/web/public/screenshots/signup.png" width="48%" />
</div>


### Passenger Dashboard & Active Ride
![Passenger Active Ride](./apps/web/public/screenshots/passenger-active-ride.png)

### Driver Dashboard & Earnings
![Driver Dashboard](./apps/web/public/screenshots/history.png)

### Post-Ride Rating Popup
![Rating Popup](./apps/web/public/screenshots/rating-popup.png)

### Comprehensive Trip History
![Trip History](./apps/web/public/screenshots/passenger-history.png)


## Features

### Passenger Experience
- **Dynamic Fare Engine**: Fare preview based on fixed zone matrices and requested seats.
- **Real-Time State Tracking**: 1-second polling ensures instant UI updates (with elegant radar ping animations and toast notifications) as the driver changes the ride status.
- **Rating System**: After a ride is completed, passengers can leave a 1-5 star rating and comment.
- **Trip History**: View all completed and cancelled rides, along with given ratings.

### Driver Experience
- **Broadcast Request Pool**: View a live list of all unassigned passenger requests in the city.
- **Manual Acceptance & Capacity Management**: Drivers can accept requests. The system strictly enforces the vehicle's maximum seat capacity.
- **Active Trip Manager**: Seamlessly advance passengers through the lifecycle (`ACCEPTED` -> `DRIVER_ARRIVED` -> `STARTED` -> `COMPLETED`).
- **Earnings & Rating Dashboard**: View total earnings, passenger count, and passenger ratings for past pools.

### System & Architecture
- **Serverless Full-Stack**: Fully unified Next.js 14 App Router application deployed on Vercel.
- **Concurrency & Race Condition Safety**: Transactions ensure that drivers cannot overbook their vehicle's seat capacity when multiple passengers are accepted simultaneously.
- **Integer Currency**: All financial data (fares, wallets) are calculated and stored in integers (`poysha`) to eliminate float precision errors.

---

## System Architecture

```mermaid
flowchart LR
    Browser[Web Browser] -->|HTTP / JSON| NextJS[Next.js 14 Serverless API]
    NextJS -->|Prisma ORM| Postgres[(PostgreSQL)]
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
        enum status "REQUESTED | ACCEPTED | DRIVER_ARRIVED | STARTED | COMPLETED | CANCELLED"
        int fare_amount
        enum payment_method "CASH | TESLA_PAY"
        int rating
        string rating_comment
    }

    USER ||--o{ VEHICLE : "drives"
    USER ||--o{ RIDE_REQUEST : "requests"
    VEHICLE ||--o{ POOL : "hosts"
    POOL ||--o{ RIDE_REQUEST : "contains"
```

---

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS v3, Lucide Icons, Shadcn UI.
- **Backend**: Next.js API Routes (Serverless), TypeScript, JWT.
- **Database**: PostgreSQL 15, Prisma ORM.
- **Email**: Brevo HTTP API for OTP verification.
- **Deployment**: Vercel.

---

## Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/CyberSurgeon01/OiTesla.git
   cd OiTesla/apps/web
   ```

2. **Prepare environment variables**:
   Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Fill in your `DATABASE_URL` (PostgreSQL), `JWT_SECRET`, `BREVO_API_KEY`, and `BREVO_SENDER`.

3. **Install dependencies and setup database**:
   ```bash
   npm install
   npx prisma db push
   npx prisma generate
   ```

4. **Seed the database (Optional)**:
   You can write a custom seed script or manually create users. To manually grant a driver a vehicle, update the database directly.

5. **Start the development server**:
   ```bash
   npm run dev
   ```

### Vercel Deployment
OiTesla is designed to be deployed instantly on Vercel. 
- Set `apps/web` as the Root Directory in Vercel settings.
- Configure all Environment Variables in the Vercel dashboard.
- The Vercel build generates the Prisma client and applies pending Prisma migrations before building the app. No manual migration URL is needed.

---

## Demo Credentials

To test the application locally without verifying emails, check your terminal console logs—the OTP code is printed locally during signup and login if `BREVO_API_KEY` is absent.

---

## API Overview

**Auth**
- `POST /api/auth/signup` & `POST /api/auth/login` - Role-based JWT authentication.
- `POST /api/auth/verify` - OTP verification.
- `GET /api/auth/me` - Validates JWT and retrieves user profile.

**Passenger**
- `POST /api/rides` - Requests a ride and adds it to the broadcast pool.
- `GET /api/passenger/rides/active` - Polls current active ride status.
- `GET /api/passenger/rides/history` - Retrieves past completed/cancelled rides.
- `POST /api/passenger/rides/:id/rate` - Submits a 1-5 star rating and comment for a completed ride.
- `PATCH /api/rides/:id/status` - Cancels an active request.

**Driver**
- `GET /api/driver/requests` - Polls all unassigned ride requests in the system.
- `POST /api/driver/requests/:ride_id/accept` - Accepts a ride request, assigning it to the driver's active pool if seat capacity allows.
- `GET /api/driver/pools` - Retrieves the driver's currently active pool and passengers.
- `GET /api/driver/history` - Retrieves past pools and aggregated earnings/ratings.
- `PATCH /api/driver/pools/:pool_id/status` - Batch advances all active rides in the pool to the next state (`ACCEPTED` -> `DRIVER_ARRIVED` -> `STARTED` -> `COMPLETED`).
- `PATCH /api/driver/status` - Toggles driver online availability.

---

## Key Decisions & Trade-Offs

### 1. Broadcast Model vs. Auto-Dispatch
Initially designed with an Auto-Dispatch algorithm, the architecture was migrated to a Broadcast Model.
- **Why**: Providing drivers with the agency to manually select and accept rides mimics real-world apps (like inDrive) more accurately for the target market. It removes the risk of algorithmic misrouting during edge cases and gives drivers control over their capacity management.

### 2. Serverless Next.js API Routes over Express
Migrated the standalone Express backend directly into Next.js App Router API Routes.
- **Why**: Simplifies the CI/CD pipeline, reduces infrastructure overhead, and allows seamless, zero-config deployment to Vercel's serverless edge network. It removes the need for Docker Compose in production and resolves CORS complexities.

### 3. Passenger/Driver State Sync (1s Polling)
To ensure the passenger and driver views reflect the exact same ride state without lag, the MVP utilizes 1-second interval polling against the database.
- **Limitation**: Introduces higher database read operations compared to WebSockets.
- **Why**: Avoids the complexity and cost of maintaining stateful WebSocket connections or third-party Pub/Sub infrastructure (like Pusher) on a Serverless environment. Vercel's edge network and Prisma's connection pooling handle the read throughput sufficiently for the MVP phase.

---
*OiTesla — The future of premium shared mobility.*
