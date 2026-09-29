export const ZONES = ['Banani', 'Gulshan', 'Mohakhali', 'Dhanmondi', 'Mirpur', 'Uttara', 'Farmgate', 'Bashundhara'];

// Mapping: pickupZone -> { existingDestination: [compatibleDestinations] }
export const COMPATIBILITY_MAP: Record<string, Record<string, string[]>> = {
  'Banani': {
    'Mohakhali': ['Mohakhali', 'Gulshan', 'Farmgate'],
    'Gulshan': ['Gulshan', 'Mohakhali', 'Bashundhara'],
    'Farmgate': ['Farmgate', 'Mohakhali', 'Dhanmondi'],
    'Dhanmondi': ['Dhanmondi', 'Farmgate'],
  }
};

/**
 * EXACT COMPATIBILITY RULE:
 * 1. The pickup zones must match exactly.
 * 2. For every existing passenger destination in the pool, the new destination must be 
 *    listed as compatible.
 * 
 * HAND-TRACE FOR NUSRAT, RAFIQ, AND SHIRIN:
 * - Nusrat requests: Banani -> Mohakhali. No active pool exists, so Pool 1 is created on Bullet.
 *   Pool 1 destinations: ['Mohakhali'].
 * - Rafiq requests: Banani -> Gulshan. 
 *   Evaluates: isDestinationCompatible('Banani', ['Mohakhali'], 'Gulshan')
 *   `COMPATIBILITY_MAP['Banani']['Mohakhali']` returns `['Mohakhali', 'Gulshan', 'Farmgate']`.
 *   Since 'Gulshan' is in that array, it returns true! Rafiq joins Pool 1.
 *   Pool 1 destinations: ['Mohakhali', 'Gulshan'].
 * - Shirin requests: Banani -> Dhanmondi (let's assume she tries this).
 *   Evaluates: isDestinationCompatible('Banani', ['Mohakhali', 'Gulshan'], 'Dhanmondi')
 *   Checks 'Mohakhali' array -> 'Dhanmondi' is NOT in it. Returns false.
 *   Shirin cannot join Pool 1, so she spawns Pool 2 (if a vehicle is free) or fails.
 */
export const isDestinationCompatible = (pickupZone: string, existingDestinations: string[], newDestination: string): boolean => {
  const pickupMap = COMPATIBILITY_MAP[pickupZone];
  if (!pickupMap) return existingDestinations.includes(newDestination);

  for (const existingDest of existingDestinations) {
    const compatibleWithExisting = pickupMap[existingDest] || [existingDest];
    if (!compatibleWithExisting.includes(newDestination)) {
      return false;
    }
  }
  return true;
};
