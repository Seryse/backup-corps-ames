'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserNav } from '@/components/auth/user-nav';
import LanguageSwitcher from './language-switcher';
import { Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ShoppingBag, CalendarDays, Home, Sparkles } from 'lucide-react';
import { CartNav } from './cart-nav';
import { useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';

export default function Header({ dictionary, lang }: { dictionary: Dictionary['header'], lang: Locale }) {
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navLinks = [
      { href: `/${lang}/home`, label: dictionary.home, icon: Home },
      { href: `/${lang}/soins`, label: dictionary.soins, icon: Sparkles },
      { href: `/${lang}/shop`, label: dictionary.shop, icon: ShoppingBag },
      { href: `/${lang}/agenda`, label: dictionary.agenda, icon: CalendarDays },
  ]
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <Link href={`/${lang}/home`} className="mr-6 flex items-center space-x-2">
            <Image src="/icone.png" alt="Corps et Âmes logo" width={24} height={24} className="h-6 w-6" />
            <span className="font-bold font-headline text-lg">Corps et Âmes</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
             {navLinks.map(({href, label}) => (
                <Link key={href} href={href} className="text-foreground/60 transition-colors hover:text-foreground/80">{label}</Link>
            ))}
        </nav>
        
        <div className="flex flex-1 items-center justify-end space-x-2">
           {/* This container will only render on the client, preventing hydration errors */}
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
                            <SheetTitle className="sr-only">Menu</SheetTitle>
                          </SheetHeader>
                          <nav className="grid gap-4 flex-1">
                              {navLinks.map(({href, label, icon: Icon}) => (
                                  <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>
                                      <Icon className="h-5 w-5" />
                                      {label}
                                  </Link>
                              ))}
                          </nav>
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center px-4 py-2 border-t">
                                  <LanguageSwitcher lang={lang} />
                                  <div className="flex items-center gap-2">
                                      <CartNav />
                                      <UserNav dictionary={dictionary} lang={lang} />
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
            // Skeletons for both mobile and desktop to maintain layout consistency
            <>
              <div className="md:hidden">
                <Skeleton className="h-10 w-10" />
              </div>
              <div className="hidden md:flex items-center space-x-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-10" />
                  <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
