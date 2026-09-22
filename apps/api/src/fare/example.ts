import { calculateFare, BASE_FARE_POYSHA, PER_KM_CHARGE_POYSHA, POOL_DISCOUNT_POYSHA } from './fare.calculator';

/**
 * Concrete Worked Example for Nusrat and Rafiq
 * 
 * Rules:
 * passengerFare = baseFare + distanceCharge - poolDiscount
 * baseFare = 3000 poysha (30 BDT)
 * distanceCharge = distanceKm * 1500 poysha (15 BDT / KM)
 * poolDiscount = 1000 poysha (10 BDT)
 * 
 * --- NUSRAT ---
 * Route: Banani -> Mohakhali
 * Distance: 2 KM
 * Base Fare: 3000
 * Distance Charge: 2 * 1500 = 3000
 * Pool Discount: -1000
 * Total: 3000 + 3000 - 1000 = 5000 poysha (50 BDT)
 * 
 * --- RAFIQ ---
 * Route: Banani -> Gulshan
 * Distance: 3 KM
 * Base Fare: 3000
 * Distance Charge: 3 * 1500 = 4500
 * Pool Discount: -1000
 * Total: 3000 + 4500 - 1000 = 6500 poysha (65 BDT)
 */

console.log("=== OiTesla Fare Verification Example ===");
console.log("Nusrat (Banani -> Mohakhali):");
const nusratFare = calculateFare('Banani', 'Mohakhali', true);
console.log(`Calculated Fare: ${nusratFare} poysha (${nusratFare / 100} BDT)`);
console.log(`Expected: 50 BDT\n`);

console.log("Rafiq (Banani -> Gulshan):");
const rafiqFare = calculateFare('Banani', 'Gulshan', true);
console.log(`Calculated Fare: ${rafiqFare} poysha (${rafiqFare / 100} BDT)`);
console.log(`Expected: 65 BDT\n`);
