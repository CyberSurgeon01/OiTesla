# OiTesla (Dhaka Tesla Pool)

OiTesla is a ride-pooling MVP built for Dhaka's three-wheeled "Tesla" rickshaws. Passengers request a ride with a pickup and destination; when two riders' routes overlap closely enough, the system pools them into the same Tesla, tracks each passenger's status and fare independently, and lets the driver manage the whole trip from acceptance to drop-off. The goal isn't route-optimization — it's a clean, production-minded slice of the real problem: matching, capacity enforcement, individual fares, and a ride lifecycle that holds up under concurrent requests.

## Fare Calculation & Pool Discount
Passengers sharing a pool should each pay less than they would solo.
The fare formula is: `passengerFare = baseFare + distanceCharge - poolDiscount`

**Example:**
- **Nusrat (Banani to Mohakhali)**: Distance 2 KM. Base: 30 BDT, Dist Charge: 30 BDT. Opting for pool gives a flat 10 BDT discount. Total: `30 + 30 - 10 = 50 BDT`
- **Rafiq (Banani to Gulshan)**: Distance 3 KM. Base: 30 BDT, Dist Charge: 45 BDT. Pool discount: 10 BDT. Total: `30 + 45 - 10 = 65 BDT`

## Local Development (Cold Boot)
The entire monorepo is containerized and wired to boot sequentially. On a cold boot, the API container will automatically generate the Prisma client, deploy migrations, and run the idempotent seed script.

```bash
# Clone the repository
# Copy environment variables
cp .env.example .env

# Spin up the containers
docker compose up --build
```
Once healthy, the Web UI is available at `http://localhost:3000` and the API at `http://localhost:3001`.

## Public Deployment Constraint Document
Deploying a multi-tier application (Next.js SSR Frontend, Express API, PostgreSQL Database) completely for free has become challenging since Heroku eliminated free tiers, and platforms like Railway and Render heavily restricted their free plans (often requiring credit card verification, pausing instances after 15 minutes of inactivity, or dropping free databases entirely). 

As an autonomous AI agent, I cannot create user accounts, solve CAPTCHAs, or supply a credit card for identity verification to provision these cloud resources on platforms like Render, Fly.io, or Vercel. Thus, a true zero-touch public deployment from this sandbox is not possible.

**If you wish to deploy this manually for free, here is the recommended architecture:**
1. **Frontend (Vercel)**: Connect your GitHub repository to Vercel and set the Root Directory to `apps/web`. Vercel's free tier natively supports Next.js. You must set `NEXT_PUBLIC_API_URL` to your deployed API url.
2. **Backend API (Render Free Web Service)**: Connect the repository to Render. Use the Docker environment pointing to `apps/api/Dockerfile`. Note: Render's free tier sleeps after 15 minutes of inactivity, which will cause a 50-second cold start delay.
3. **Database (Supabase or Neon Free Tier)**: Render no longer offers permanent free PostgreSQL databases (they expire after 90 days). You should provision a free PostgreSQL instance on Supabase or Neon.tech, and paste the connection string into the `DATABASE_URL` environment variable on Render.
