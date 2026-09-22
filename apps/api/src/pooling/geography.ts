// Simplified Dhaka zones mapping for OiTesla MVP.
// We define compatibility as: if a pool is heading from pickup -> pool_destination,
// it can accept a new rider going from pickup -> new_destination IF new_destination is compatible.

export const ZONES = ['Banani', 'Gulshan', 'Mohakhali', 'Dhanmondi', 'Mirpur', 'Uttara', 'Farmgate', 'Bashundhara'];

// Mapping: pickupZone -> { existingDestination: [compatibleDestinations] }
export const COMPATIBILITY_MAP: Record<string, Record<string, string[]>> = {
  'Banani': {
    'Mohakhali': ['Mohakhali', 'Gulshan', 'Farmgate'],
    'Gulshan': ['Gulshan', 'Mohakhali', 'Bashundhara'],
    'Farmgate': ['Farmgate', 'Mohakhali', 'Dhanmondi'],
    'Dhanmondi': ['Dhanmondi', 'Farmgate'],
  },
  // Other zones can be added symmetrically or arbitrarily for MVP
};

/**
 * Checks if a new destination is compatible with an existing pool's destinations,
 * given the same pickup zone.
 * 
 * EXACT RULE:
 * 1. Pickup zones must match exactly.
 * 2. The new destination must be in the list of compatible destinations for ALL existing destinations in the pool.
 *    (For MVP, if we check against the primary/first request's destination, that's often enough, but checking all is safer).
 */
export const isDestinationCompatible = (pickupZone: string, existingDestinations: string[], newDestination: string): boolean => {
  const pickupMap = COMPATIBILITY_MAP[pickupZone];
  if (!pickupMap) return existingDestinations.includes(newDestination); // Strict match if no map

  for (const existingDest of existingDestinations) {
    const compatibleWithExisting = pickupMap[existingDest] || [existingDest];
    if (!compatibleWithExisting.includes(newDestination)) {
      return false;
    }
  }
  return true;
};
