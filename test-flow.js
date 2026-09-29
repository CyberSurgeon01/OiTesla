async function main() {
  // 1. Driver Login
  let res = await fetch('https://oi-tesla.vercel.app/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jashim@oitesla.com', password: 'hashedpassword123' })
  });
  const driverData = await res.json();
  if (driverData.error) return console.log("Driver Login Error:", driverData);
  const driverToken = driverData.token;
  console.log("Driver Logged In");

  // 2. Set Driver Online
  res = await fetch('https://oi-tesla.vercel.app/api/driver/status', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverToken}` },
    body: JSON.stringify({ status: 'ONLINE' })
  });
  console.log("Driver Set Online:", await res.json());

  // 3. Passenger Login
  res = await fetch('https://oi-tesla.vercel.app/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nusrat@oitesla.com', password: 'hashedpassword123' })
  });
  const passData = await res.json();
  if (passData.error) return console.log("Passenger Login Error:", passData);
  const passToken = passData.token;
  console.log("Passenger Logged In");

  // 4. Passenger Requests Ride
  res = await fetch('https://oi-tesla.vercel.app/api/rides', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${passToken}` },
    body: JSON.stringify({ pickup_zone: 'Banani', destination_zone: 'Gulshan', seats_requested: 1, payment_method: 'CASH' })
  });
  const rideRes = await res.json();
  console.log("Passenger Ride Request:", rideRes);

  // 5. Driver Checks Pools
  res = await fetch('https://oi-tesla.vercel.app/api/driver/pools', {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  console.log("Driver Pools:", JSON.stringify(await res.json(), null, 2));
}
main();
