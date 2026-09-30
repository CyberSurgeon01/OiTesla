import { ZONES } from '../pooling/geography.ts';
import { MAX_SEATS_PER_RIDE } from '../ride-status.ts';

/**
 * Server-side pricing. This module is the single source of truth for every fare the
 * product quotes or charges: the booking estimate route and `requestRide` both call
 * `quoteFare`, so an estimate and the fare that is actually stored can never disagree.
 *
 * All amounts are integer poysha (100 poysha = 1 BDT).
 */

const DISTANCE_MAP: Record<string, Record<string, number>> = {
  'Banani': { 'Mohakhali': 2, 'Gulshan': 3, 'Farmgate': 5, 'Dhanmondi': 8, 'Bashundhara': 6 },
  'Gulshan': { 'Mohakhali': 3, 'Bashundhara': 6, 'Banani': 3, 'Dhanmondi': 9, 'Farmgate': 7 },
  'Mohakhali': { 'Farmgate': 3, 'Gulshan': 3, 'Banani': 2, 'Dhanmondi': 6, 'Bashundhara': 8 },
  'Farmgate': { 'Dhanmondi': 3, 'Mohakhali': 3, 'Banani': 5, 'Gulshan': 7, 'Bashundhara': 10 },
  'Dhanmondi': { 'Farmgate': 3, 'Banani': 8, 'Gulshan': 9, 'Mohakhali': 6, 'Bashundhara': 12 },
  'Bashundhara': { 'Banani': 6, 'Gulshan': 6, 'Mohakhali': 8, 'Farmgate': 10, 'Dhanmondi': 12 },
};

// Mirpur and Uttara have no surveyed distances yet. Naming the fallback keeps it visible
// instead of hiding an unmeasured route behind a magic number.
const FALLBACK_DISTANCE_KM = 5;

export const BASE_FARE_POYSHA = 3000;
export const PER_KM_CHARGE_POYSHA = 1500;
export const MIN_FARE_PER_SEAT_POYSHA = 3000;

export type FareQuote = {
  pickup: string;
  destination: string;
  distanceKm: number;
  /** Charge before distance, per seat. */
  baseFare: number;
  /** Distance component, per seat. */
  distanceCharge: number;
  /** baseFare + distanceCharge, floored at the per-seat minimum. */
  farePerSeat: number;
  seats: number;
  /** Never negative. Zero means no discount is applied and the UI omits the line. */
  discount: number;
  /** Human-readable reason for `discount`, or null when `discount` is zero. */
  discountReason: string | null;
  /** farePerSeat * seats - discount. The amount stored on the ride. */
  total: number;
};

/** Returns a message describing why the request is unpriceable, or null when it is fine. */
export function validateQuoteInput(pickup: unknown, destination: unknown, seats: unknown): string | null {
  if (typeof pickup !== 'string' || !ZONES.includes(pickup)) return 'Choose a valid pickup zone.';
  if (typeof destination !== 'string' || !ZONES.includes(destination)) return 'Choose a valid destination zone.';
  if (pickup === destination) return 'Pickup and destination must be different zones.';
  if (typeof seats !== 'number' || !Number.isInteger(seats) || seats < 1 || seats > MAX_SEATS_PER_RIDE) {
    return `Choose between 1 and ${MAX_SEATS_PER_RIDE} seats.`;
  }
  return null;
}

export function distanceKmBetween(pickup: string, destination: string): number {
  return DISTANCE_MAP[pickup]?.[destination] ?? FALLBACK_DISTANCE_KM;
}

/**
 * Price a ride. Callers must run `validateQuoteInput` first; the estimate route and
 * `requestRide` both do, and both re-derive the total here rather than trusting a
 * client-supplied amount.
 */
export function quoteFare(pickup: string, destination: string, seats: number): FareQuote {
  const distanceKm = distanceKmBetween(pickup, destination);
  const baseFare = BASE_FARE_POYSHA;
  const distanceCharge = distanceKm * PER_KM_CHARGE_POYSHA;
  const farePerSeat = Math.max(MIN_FARE_PER_SEAT_POYSHA, baseFare + distanceCharge);
  const discount = 0;

  return {
    pickup,
    destination,
    distanceKm,
    baseFare,
    distanceCharge,
    farePerSeat,
    seats,
    discount,
    discountReason: null,
    total: Math.max(0, farePerSeat * seats - discount),
  };
}