#!/bin/bash
# Update rides.ts to not assign a vehicle
sed -i '' 's/const candidates = await tx.vehicle.findMany({/return { ride: await tx.rideRequest.create({ data: { passenger_id: passengerId, pickup_zone, destination_zone, seats_requested, payment_method, fare_amount, status: "REQUESTED" } }) };\n    const candidates = await tx.vehicle.findMany({/' "apps/web/src/lib/rides.ts"
