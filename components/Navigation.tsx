'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Home, Search, LayoutDashboard, Users, User, LogOut, BookMarked, UserCircle } from "lucide-react"
import { useGuestMode } from "./GuestModeProvider"

export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isGuest, enableGuestMode } = useGuestMode()

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/cards", label: "Cards", icon: Search },
    { href: "/collection", label: "Collection", icon: BookMarked },
    { href: "/game", label: "Play", icon: LayoutDashboard },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/trades", label: "Trades", icon: Users },
  ]

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-bold text-red-600">
            OP TCG Trader
          </Link>
          
          <div className="flex items-center gap-6">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
                  pathname === href
                    ? "bg-red-600 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
            
            {session ? (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm hidden md:inline">{session.user?.name || session.user?.email}</span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 text-sm hover:text-red-600 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : isGuest ? (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l dark:border-gray-700">
                <div className="flex items-center gap-2 text-yellow-500">
                  <UserCircle className="w-4 h-4" />
                  <span className="text-sm hidden md:inline">Guest Mode</span>
                </div>
                <Link
                  href="/auth/signin"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Sign In
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3 ml-4">
                <Link
                  href="/auth/signin"
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  Sign In
                </Link>
                <button
                  onClick={enableGuestMode}
                  className="text-sm text-gray-400 hover:text-white transition flex items-center gap-2"
                >
                  <UserCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Continue as Guest</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
