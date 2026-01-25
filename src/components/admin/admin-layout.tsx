'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  BarChart2,
  Newspaper,
  GraduationCap,
  CalendarClock,
} from 'lucide-react';
import { Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { cn } from '@/lib/utils';

export default function AdminLayout({
  children,
  dictionary,
  lang,
}: {
  children: React.ReactNode;
  dictionary: Dictionary;
  lang: Locale;
}) {
  const pathname = usePathname();
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

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 flex-shrink-0 border-r bg-card p-4">
        <div className="flex h-16 items-center px-2">
            <h2 className="text-xl font-bold font-headline">Admin</h2>
        </div>
        <nav className="flex flex-col gap-2">
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
      </aside>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
