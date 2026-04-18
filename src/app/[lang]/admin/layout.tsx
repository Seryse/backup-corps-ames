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
  Mail,
  Users,
  Info
} from 'lucide-react';
import { Dictionary, getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { cn } from '@/lib/utils';
import React, { useState, useEffect, use } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';

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
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  useEffect(() => {
    getDictionary(lang).then(d => setDictionary(d));
  }, [lang]);

  if (!dictionary) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
      </div>
    );
  }

  const adminDict = dictionary.admin;

  const navItems = [
    { href: `/${lang}/admin`, label: adminDict.dashboard, icon: LayoutDashboard },
    { href: `/${lang}/admin/messages`, label: (dictionary as any).messages?.admin_title || "Messages", icon: Mail },
    { href: `/${lang}/admin/stats`, label: adminDict.stats, icon: BarChart2 },
    { href: `/${lang}/admin/about`, label: adminDict.manage_about_page, icon: Info },
    { href: `/${lang}/admin/news`, label: adminDict.news, icon: Newspaper },
    { href: `/${lang}/admin/formations`, label: adminDict.formations, icon: GraduationCap },
    { href: `/${lang}/admin/session-types`, label: adminDict.sessionTypes, icon: CalendarClock },
    { href: `/${lang}/admin/users`, label: "Utilisateurs", icon: Users },
  ];

  const NavContent = ({ closeMenu }: { closeMenu?: () => void }) => (
    <nav className="flex flex-col gap-2 mt-4">
        <div className="flex h-10 items-center px-2 mb-6 md:mb-0">
            <h2 className="text-xl font-bold font-headline text-amber-800">Admin</h2>
        </div>
      {navItems.map((item) => {
        const isDashboardLink = item.href === `/${lang}/admin`;
        const isActive = isDashboardLink
          ? pathname === item.href
          : pathname.startsWith(item.href);
        
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeMenu}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-amber-700 hover:bg-amber-50',
              isActive && 'bg-amber-100 text-amber-900 font-semibold'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        )}
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50/30">
      {/* Header Mobile */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden backdrop-blur-sm bg-white/80">
        <Sheet open={isAdminMenuOpen} onOpenChange={setIsAdminMenuOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu Admin</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[80%] sm:w-[350px]">
            <SheetTitle className="sr-only">Menu Administration</SheetTitle>
            <SheetDescription className="sr-only">Navigation du tableau de bord</SheetDescription>
            <NavContent closeMenu={() => setIsAdminMenuOpen(false)} />
          </SheetContent>
        </Sheet>
         <h1 className="text-lg font-semibold text-gray-800">Tableau de Bord</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Desktop */}
        <aside className="hidden w-64 flex-shrink-0 border-r bg-white p-4 md:flex flex-col h-screen sticky top-0">
          <NavContent />
        </aside>
        
        {/* Contenu Principal */}
        <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
