'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserNav } from '@/components/auth/user-nav';
import LanguageSwitcher from './language-switcher';
import { Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ShoppingBag, CalendarDays, Home, Sparkles } from 'lucide-react';
import { CartNav } from './cart-nav';
import { useEffect, useState } from 'react';

export default function Header({ dictionary, lang }: { dictionary: Dictionary['header'], lang: Locale }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
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
            {hasMounted && <>
              {/* Mobile Navigation */}
              <Sheet>
                  <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="md:hidden">
                          <Menu className="h-6 w-6" />
                          <span className="sr-only">Open menu</span>
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="pt-12 flex flex-col">
                      <nav className="grid gap-4 flex-1">
                          {navLinks.map(({href, label, icon: Icon}) => (
                              <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                                  <Icon className="h-5 w-5" />
                                  {label}
                              </Link>
                          ))}
                      </nav>
                      <div className="flex flex-col gap-2">
                          <LanguageSwitcher lang={lang} />
                          <div className="flex items-center gap-2">
                              <UserNav dictionary={dictionary} lang={lang} />
                              <CartNav />
                          </div>
                      </div>
                  </SheetContent>
              </Sheet>

              {/* Desktop items */}
              <div className="hidden md:flex items-center space-x-2">
                  <LanguageSwitcher lang={lang} />
                  <CartNav />
                  <UserNav dictionary={dictionary} lang={lang} />
              </div>
            </>}
        </div>
      </div>
    </header>
  );
}
