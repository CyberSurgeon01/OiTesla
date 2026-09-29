const fs = require('fs');
const file = 'apps/web/src/app/api/rides/route.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  'return NextResponse.json(result, { status: 201 });',
  'console.log("[RIDE ASSIGNED] Ride:", result.ride.id, "Pool:", result.pool_id);\n    return NextResponse.json(result, { status: 201 });'
);
fs.writeFileSync(file, code);
