"use client"
import { useRouter } from "next/navigation"
import { LogOut, User as UserIcon } from "lucide-react"
import { Button } from "./ui/button"

export function TopBar({ userRole, userName }: { userRole: string; userName: string }) {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <span className="font-bold sm:inline-block">
              OiTesla
            </span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
          </div>
          <nav className="flex items-center space-x-4">
            <div className="hidden text-sm font-medium sm:block text-muted-foreground">
              {userName} <span className="opacity-50">({userRole})</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Logout</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
}
