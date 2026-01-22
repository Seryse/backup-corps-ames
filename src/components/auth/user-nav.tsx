'use client'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser, useAuth } from "@/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Dictionary } from "@/lib/dictionaries"
import { Locale } from "@/i18n-config"
import { Skeleton } from "../ui/skeleton"
import { adminEmails } from "@/lib/config"

export function UserNav({ dictionary, lang }: { dictionary: Dictionary['header'], lang: Locale }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push(`/${lang}`);
  };

  if (isUserLoading) {
    return <Skeleton className="h-10 w-10 rounded-full" />
  }

  if (!user) {
    return (
      <Button asChild>
        <Link href={`/${lang}/login`}>{dictionary.login}</Link>
      </Button>
    )
  }

  const isAdmin = user && user.email && adminEmails.includes(user.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? "User Avatar"} />
            <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`/${lang}/dashboard`}>{dictionary.dashboard}</Link>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild>
                <Link href={`/${lang}/admin`}>{dictionary.admin}</Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          {dictionary.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
