# OiTesla (Dhaka Tesla Pool)

Work in progress.


## Fare Calculation & Pool Discount
Passengers sharing a pool should each pay less than they would solo.
The fare formula is: `passengerFare = baseFare + distanceCharge - poolDiscount`

**Example:**
- **Nusrat (Banani to Mohakhali)**: Distance 2 KM. Base: 30 BDT, Dist Charge: 30 BDT. Opting for pool gives a flat 10 BDT discount. Total: `30 + 30 - 10 = 50 BDT`
- **Rafiq (Banani to Gulshan)**: Distance 3 KM. Base: 30 BDT, Dist Charge: 45 BDT. Pool discount: 10 BDT. Total: `30 + 45 - 10 = 65 BDT`
