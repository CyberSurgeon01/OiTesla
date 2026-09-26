import { calculateFare } from '../fare/fare.calculator';

describe('Fare Calculation', () => {
  it('calculates Nusrat and Rafiq fares correctly as documented', () => {
    // Nusrat: Banani -> Mohakhali (2 KM)
    // base: 3000, distance: 2*1500 = 3000, poolDiscount: -1000
    // Total = 5000 poysha
    const nusratFare = calculateFare('Banani', 'Mohakhali', true);
    expect(nusratFare).toBe(5000);

    // Rafiq: Banani -> Gulshan (3 KM)
    // base: 3000, distance: 3*1500 = 4500, poolDiscount: -1000
    // Total = 6500 poysha
    const rafiqFare = calculateFare('Banani', 'Gulshan', true);
    expect(rafiqFare).toBe(6500);
  });
});
