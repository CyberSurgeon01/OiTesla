
const DISTANCE_MAP: Record<string, Record<string, number>> = {
  'Banani': { 'Mohakhali': 2, 'Gulshan': 3, 'Farmgate': 5, 'Dhanmondi': 8, 'Bashundhara': 6 },
  'Gulshan': { 'Mohakhali': 3, 'Bashundhara': 6, 'Banani': 3, 'Dhanmondi': 9, 'Farmgate': 7 },
  'Mohakhali': { 'Farmgate': 3, 'Gulshan': 3, 'Banani': 2, 'Dhanmondi': 6, 'Bashundhara': 8 },
  'Farmgate': { 'Dhanmondi': 3, 'Mohakhali': 3, 'Banani': 5, 'Gulshan': 7, 'Bashundhara': 10 },
  'Dhanmondi': { 'Farmgate': 3, 'Banani': 8, 'Gulshan': 9, 'Mohakhali': 6, 'Bashundhara': 12 },
  'Bashundhara': { 'Banani': 6, 'Gulshan': 6, 'Mohakhali': 8, 'Farmgate': 10, 'Dhanmondi': 12 }
};

export const BASE_FARE_POYSHA = 3000; // 30 BDT
export const PER_KM_CHARGE_POYSHA = 1500; // 15 BDT per KM

export function fareBreakdown(pickup: string, destination: string, seats: number = 1) {
  const distanceKm = DISTANCE_MAP[pickup]?.[destination] || 5;
  const baseFare = BASE_FARE_POYSHA;
  const distanceCharge = distanceKm * PER_KM_CHARGE_POYSHA;
  
  // As per screenshot: Base + Distance = Fare per seat
  const farePerSeat = baseFare + distanceCharge;
  
  // Total is Fare per seat * seats
  const total = farePerSeat * seats;

  return { 
    distanceKm, 
    baseFare, 
    distanceCharge, 
    farePerSeat, 
    total: Math.max(3000, total) // minimum 30 tk
  };
}

export const calculateFare = (pickupZone: string, destinationZone: string, seats: number = 1): number => {
  return fareBreakdown(pickupZone, destinationZone, seats).total;
};
