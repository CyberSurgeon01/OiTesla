const fs = require('fs');

// Fix buttons to redirect to /onboarding
function fixBtn(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace('redirectUrlComplete: "/sso-callback"', 'redirectUrlComplete: "/onboarding"');
  fs.writeFileSync(path, content);
}
fixBtn('apps/web/src/app/login/page.tsx');
fixBtn('apps/web/src/app/signup/page.tsx');

// Create /sso-callback
fs.mkdirSync('apps/web/src/app/sso-callback', { recursive: true });
fs.writeFileSync('apps/web/src/app/sso-callback/page.tsx', `
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';

export default function SSOCallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0A0D0B]">
      <Loader2 className="w-8 h-8 animate-spin text-[#10B981]" />
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
`);

// Rename old sso-callback to onboarding
if (fs.existsSync('apps/web/src/app/onboarding')) {
  fs.rmSync('apps/web/src/app/onboarding', { recursive: true, force: true });
}
fs.mkdirSync('apps/web/src/app/onboarding', { recursive: true });
let onboardingContent = fs.readFileSync('apps/web/src/app/sso-callback/page.tsx.bak', 'utf8').replace('SSOCallback', 'Onboarding');
fs.writeFileSync('apps/web/src/app/onboarding/page.tsx', onboardingContent);

