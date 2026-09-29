import { ZONES } from '../pooling/geography';

// For MVP, arbitrary base distances in KM between adjacent zones.
// We'll build a simple map. Since we don't have real routing, 
// we will just define direct pairwise distances.

// Distance in KM (approximate mock data for MVP)
const DISTANCE_MAP: Record<string, Record<string, number>> = {
  'Banani': { 'Mohakhali': 2, 'Gulshan': 3, 'Farmgate': 5, 'Dhanmondi': 8 },
  'Gulshan': { 'Mohakhali': 3, 'Bashundhara': 6, 'Banani': 3 },
  'Mohakhali': { 'Farmgate': 3, 'Gulshan': 3, 'Banani': 2 },
  'Farmgate': { 'Dhanmondi': 3, 'Mohakhali': 3, 'Banani': 5 },
  'Dhanmondi': { 'Farmgate': 3, 'Banani': 8 }
};

export const BASE_FARE_POYSHA = 3000; // 30 BDT
export const PER_KM_CHARGE_POYSHA = 1500; // 15 BDT per KM
export const POOL_DISCOUNT_POYSHA = 1000; // Flat 10 BDT discount for opting into a pool

/**
 * Calculates the fare for a passenger based on the formula:
 * passengerFare = baseFare + distanceCharge - poolDiscount
 * 
 * @param pickupZone - Start zone
 * @param destinationZone - End zone
 * @param isPooled - True if the passenger opted for pool (always true for this MVP app)
 * @returns Total fare in poysha (integer)
 */
export const calculateFare = (pickupZone: string, destinationZone: string, isPooled: boolean = true): number => {
  // If no mapped distance, default to 5 km.
  const distanceKm = DISTANCE_MAP[pickupZone]?.[destinationZone] || 5;

  const baseFare = BASE_FARE_POYSHA;
  const distanceCharge = distanceKm * PER_KM_CHARGE_POYSHA;
  const poolDiscount = isPooled ? POOL_DISCOUNT_POYSHA : 0;

  let passengerFare = baseFare + distanceCharge - poolDiscount;
  
  // Safety check, fare can never be less than base fare minus discount
  if (passengerFare < 2000) {
    passengerFare = 2000;
  }

  return Math.floor(passengerFare);
};
