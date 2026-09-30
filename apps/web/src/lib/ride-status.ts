export type RideStatus =
  | 'REQUESTED' | 'MATCHED' | 'ACCEPTED' | 'DRIVER_ARRIVED'
  | 'STARTED' | 'COMPLETED' | 'CANCELLED';

export type FareQuoteSnapshot = {
  distanceKm: number | null;
  baseFare: number | null;
  distanceCharge: number | null;
  farePerSeat: number | null;
  seats: number;
  discount: number;
  discountReason: string | null;
  total: number;
};

export type PassengerRide = {
  id: number;
  pickup_zone: string;
  destination_zone: string;
  seats_requested: number;
  status: RideStatus;
  fare_amount: number;
  fare_breakdown?: FareQuoteSnapshot | null;
  requested_at: string;
  completed_at?: string | null;
  cancelled_at?: string | null;
  rating?: number | null;
  rating_comment?: string | null;
  driver_rating?: number | null;
  driver_rating_comment?: string | null;
};

/**
 * A ride as the driver sees it: the same ride row, plus the passenger it belongs to.
 * Used by the driver dashboard and history so rating fields are typed rather than `any`.
 */
export type DriverRide = PassengerRide & {
  passenger: { id: number; name: string };
};

export type DriverPool = {
  id: number;
  status: string;
  createdAt: string;
  rideRequests: DriverRide[];
};

export type StatusMeta = {
  label: string;
  badge: string;
  amount: string;
};

/**
 * Colour and wording per status. Cancelled rides get muted, struck-through amounts so
 * a voided booking is never mistaken for a completed one at a glance.
 */
export const RIDE_STATUS_META: Record<RideStatus, StatusMeta> = {
  REQUESTED: { label: 'Pending', badge: 'border-amber-500/40 bg-amber-500/10 text-amber-300', amount: 'text-amber-200' },
  MATCHED: { label: 'Matched', badge: 'border-amber-500/40 bg-amber-500/10 text-amber-300', amount: 'text-amber-200' },
  ACCEPTED: { label: 'Ongoing', badge: 'border-amber-500/40 bg-amber-500/10 text-amber-300', amount: 'text-amber-200' },
  DRIVER_ARRIVED: { label: 'Ongoing', badge: 'border-amber-500/40 bg-amber-500/10 text-amber-300', amount: 'text-amber-200' },
  STARTED: { label: 'Ongoing', badge: 'border-amber-500/40 bg-amber-500/10 text-amber-300', amount: 'text-amber-200' },
  COMPLETED: { label: 'Completed', badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300', amount: 'text-emerald-300' },
  CANCELLED: { label: 'Cancelled', badge: 'border-[#3F4A44] bg-[#1A211D] text-[#A9B2AC] line-through decoration-[#6B7A72]', amount: 'text-[#8B93A0] line-through decoration-[#6B7A72]' },
};

const UNKNOWN_STATUS: StatusMeta = {
  label: 'Unknown',
  badge: 'border-[#3F4A44] bg-[#1A211D] text-[#A9B2AC]',
  amount: 'text-[#8B93A0]',
};

export function statusMetaFor(status: string | undefined | null): StatusMeta {
  if (!status) return UNKNOWN_STATUS;
  return RIDE_STATUS_META[status as RideStatus] ?? UNKNOWN_STATUS;
}

/** Seats a single booking may request. Shared by the server pricer and the seat selector. */
export const MAX_SEATS_PER_RIDE = 3;

/** A snapshot whose priced components are all known, so it is safe to render line by line. */
export type CompleteFareBreakdown = Omit<
  FareQuoteSnapshot,
  'baseFare' | 'distanceCharge' | 'farePerSeat' | 'total'
> & {
  baseFare: number;
  distanceCharge: number;
  farePerSeat: number;
  total: number;
};

/**
 * Returns the stored breakdown only when every component is present, otherwise null.
 * Rides priced before this column existed are backfilled with a total but NULL components,
 * so a partial snapshot must never be rendered as if it were a full one.
 */
export function completeFareBreakdown(ride: PassengerRide): CompleteFareBreakdown | null {
  const breakdown = ride.fare_breakdown;
  if (!breakdown) return null;
  if (typeof breakdown.baseFare !== 'number') return null;
  if (typeof breakdown.distanceCharge !== 'number') return null;
  if (typeof breakdown.farePerSeat !== 'number') return null;
  if (typeof breakdown.total !== 'number') return null;
  return breakdown as CompleteFareBreakdown;
}