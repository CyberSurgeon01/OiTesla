import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">
            OiTesla
          </h1>
          <p className="text-muted-foreground">
            Dhaka's premier Tesla Rickshaw ride-pooling service
          </p>
        </div>

        <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
          <Button asChild variant="electric" size="lg" className="w-full">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/signup">Create Account</Link>
          </Button>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Demo Credentials</CardTitle>
            <CardDescription>Use these to test the application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Driver</span>
              <code className="rounded bg-muted px-2 py-1 text-sm text-muted-foreground">
                jashim@oitesla.com
              </code>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Passengers</span>
              <code className="rounded bg-muted px-2 py-1 text-sm text-muted-foreground">
                nusrat@oitesla.com
              </code>
              <code className="rounded bg-muted px-2 py-1 text-sm text-muted-foreground">
                rafiq@oitesla.com
              </code>
            </div>
            <p className="text-xs text-muted-foreground mt-4 border-t pt-4">
              Password for all accounts: <strong className="text-foreground">hashedpassword123</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
