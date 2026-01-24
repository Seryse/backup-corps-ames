'use client';

import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import AdminNav from '@/components/admin/admin-nav';
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
  return (
    <SidebarProvider>
        <div className="flex flex-1">
            <Sidebar>
                <AdminNav dictionary={dictionary} lang={lang} />
            </Sidebar>
            <SidebarInset>
                {children}
            </SidebarInset>
        </div>
    </SidebarProvider>
  );
}
