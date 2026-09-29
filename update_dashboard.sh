#!/bin/bash
FILE="apps/web/src/app/driver/dashboard/page.tsx"

# Replace activePools state and add pendingRequests
sed -i '' 's/const \[activePools, setActivePools\] = useState<any\[\]>(\[\]);/const \[activePools, setActivePools\] = useState<any\[\]>(\[\]);\n  const \[pendingRequests, setPendingRequests\] = useState<any\[\]>(\[\]);/' "$FILE"

# Replace fetchPools logic
sed -i '' 's/const \[res, statusRes\] = await Promise\.all(\[/const \[res, reqRes, statusRes\] = await Promise\.all(\[\n        fetch('\''\/api\/driver\/pools'\'', { headers: { Authorization: `Bearer ${token}` } }),\n        fetch('\''\/api\/driver\/requests'\'', { headers: { Authorization: `Bearer ${token}` } }),/g' "$FILE"

sed -i '' '/fetch('\''\/api\/driver\/pools'\'',/d' "$FILE"

sed -i '' 's/if (res\.ok) {/if (res.ok) {\n        const pools = await res.json();\n        setActivePools(pools);\n      }\n      if (reqRes \&\& reqRes.ok) {\n        const requests = await reqRes.json();\n        setPendingRequests(requests);\n      }/' "$FILE"

sed -i '' '/const pools = await res.json();/d' "$FILE"
sed -i '' '/setActivePools(pools);/d' "$FILE"
# It deletes two lines, let's just make sure. Let me just use replace_file_content for these chunks, it's safer.
