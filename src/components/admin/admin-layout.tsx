'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { SidebarProvider, Sidebar, SidebarInset, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  BarChart2,
  Newspaper,
  GraduationCap,
  CalendarClock,
} from 'lucide-react';
import { Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';

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
    <SidebarProvider>
        <div className="flex flex-1">
            <Sidebar>
                <SidebarContent>
                    <SidebarMenu>
                        {navItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton
                            asChild
                            isActive={pathname === item.href}
                            tooltip={item.label}
                            >
                            <Link href={item.href}>
                                <item.icon />
                                <span>{item.label}</span>
                            </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
            </Sidebar>
            <SidebarInset>
                {children}
            </SidebarInset>
        </div>
    </SidebarProvider>
  );
}
