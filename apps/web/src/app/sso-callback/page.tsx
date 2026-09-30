import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

export default function SSOCallback() {
  return <AuthenticateWithRedirectCallback forceRedirectUrl="/onboarding" signInForceRedirectUrl="/onboarding" signUpForceRedirectUrl="/onboarding" />
}
