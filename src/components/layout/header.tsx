'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserNav } from '@/components/auth/user-nav';
import LanguageSwitcher from './language-switcher';
import { Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Menu, ShoppingBag, CalendarDays, Home, Sparkles, Users, Mail, LayoutDashboard, Info } from 'lucide-react';
import { CartNav } from './cart-nav';
import { useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';
import { useUser } from '@/firebase';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function Header({ dictionary, lang }: { dictionary: Dictionary['header'], lang: Locale }) {
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navLinks = [
      { href: `/${lang}/home`, label: dictionary.home, icon: Home },
      { href: `/${lang}/about`, label: dictionary.about, icon: Info },
      { href: `/${lang}/soins`, label: dictionary.soins, icon: Sparkles },
      { href: `/${lang}/shop`, label: dictionary.shop, icon: ShoppingBag },
      { href: `/${lang}/agenda`, label: dictionary.agenda, icon: CalendarDays },
      { href: `/${lang}/forum`, label: dictionary.forum, icon: Users },
      { href: `/${lang}/contact`, label: dictionary.contact, icon: Mail },
  ];
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <Link href={`/${lang}/home`} className="mr-6 flex items-center space-x-2">
            <Image src="/icone.png" alt="Corps et Âmes logo" width={24} height={24} className="h-6 w-6" />
            <span className="font-bold font-headline text-lg">Corps & Âmes</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
             {navLinks.map(({href, label}) => (
                <Link 
                    key={label} 
                    href={href} 
                    className={cn(
                        "text-foreground/60 transition-colors hover:text-foreground/80",
                        pathname === href && "text-foreground"
                    )}
                >
                    {label}
                </Link>
            ))}
            {isMounted && !isUserLoading && user && (
                <Link 
                    href={`/${lang}/dashboard`} 
                    className={cn(
                        "text-foreground/60 transition-colors hover:text-foreground/80",
                        (pathname === `/${lang}/dashboard` || pathname.startsWith(`/${lang}/dashboard/`)) && "text-foreground"
                    )}
                >
                    {dictionary.dashboard}
                </Link>
            )}
        </nav>
        
        <div className="flex flex-1 items-center justify-end space-x-2">
          {isMounted ? (
            <>
              {/* Mobile Navigation */}
              <div className="md:hidden">
                  <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                      <SheetTrigger asChild>
                          <Button variant="ghost" size="icon">
                              <Menu className="h-6 w-6" />
                              <span className="sr-only">Open menu</span>
                          </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="pt-12 flex flex-col">
                          <SheetHeader>
                            <SheetTitle className="text-left">Menu</SheetTitle>
                            <SheetDescription className="sr-only">Navigation principale</SheetDescription>
                          </SheetHeader>
                          <nav className="grid gap-4 flex-1 mt-4 h-full overflow-y-auto">
                              {isMounted && !isUserLoading && user && (
                                <Link 
                                  href={`/${lang}/dashboard`} 
                                  className={cn(
                                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                      (pathname === `/${lang}/dashboard` || pathname.startsWith(`/${lang}/dashboard/`)) && 'text-primary font-semibold bg-muted'
                                    )}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <LayoutDashboard className="h-5 w-5" />
                                    {dictionary.dashboard}
                                </Link>
                              )}
                              {navLinks.map(({href, label, icon: Icon}) => (
                                  <Link 
                                    key={label} 
                                    href={href} 
                                    className={cn(
                                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                      pathname === href && 'text-primary font-semibold bg-muted'
                                    )}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                  >
                                      <Icon className="h-5 w-5" />
                                      {label}
                                  </Link>
                              ))}
                          </nav>
                          <div className="flex flex-col gap-2 mt-auto">
                            <div className="flex justify-between items-center px-4 py-4 border-t">
                                  <LanguageSwitcher lang={lang} />
                                  <div className="flex items-center gap-2">
                                      <CartNav />
                                      <UserNav 
                                        dictionary={dictionary} 
                                        lang={lang} 
                                        onLinkClick={() => setIsMobileMenuOpen(false)} 
                                      />
                                  </div>
                              </div>
                          </div>
                      </SheetContent>
                  </Sheet>
              </div>

              {/* Desktop items */}
              <div className="hidden md:flex items-center space-x-2">
                    <LanguageSwitcher lang={lang} />
                    <CartNav />
                    <UserNav dictionary={dictionary} lang={lang} />
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                 <Skeleton className="h-10 w-20" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
