'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  BarChart2,
  Newspaper,
  GraduationCap,
  CalendarClock,
  Menu,
} from 'lucide-react';
import { Dictionary, getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { cn } from '@/lib/utils';
import React, { useState, useEffect, use } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function AdminRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = use(params);
  const pathname = usePathname();
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);

  useEffect(() => {
    getDictionary(lang).then(d => setDictionary(d));
  }, [lang]);

  if (!dictionary) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  const adminDict = dictionary.admin;

  const navItems = [
    {
      href: `/${lang}/admin`,
      label: adminDict.dashboard,
      icon: LayoutDashboard,
    },
    {
      href: `/${lang}/admin/stats`,
      label: adminDict.stats,
      icon: BarChart2,
    },
    {
      href: `/${lang}/admin/news`,
      label: adminDict.news,
      icon: Newspaper,
    },
    {
      href: `/${lang}/admin/formations`,
      label: adminDict.formations,
      icon: GraduationCap,
    },
    {
      href: `/${lang}/admin/session-types`,
      label: adminDict.sessionTypes,
      icon: CalendarClock,
    },
  ];

  const NavContent = () => (
    <nav className="flex flex-col gap-2">
        <div className="flex h-16 items-center px-2">
            <h2 className="text-xl font-bold font-headline">Admin</h2>
        </div>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
            pathname === item.href && 'bg-primary/10 text-primary font-semibold'
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Ouvrir le menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <NavContent />
          </SheetContent>
        </Sheet>
         <h1 className="text-xl font-bold font-headline">Panneau Admin</h1>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-64 flex-shrink-0 border-r bg-card p-4 md:flex flex-col">
          <NavContent />
        </aside>
        
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
