'use client'

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { User, GraduationCap, CalendarCheck, Users, ChevronRight, Shield } from 'lucide-react';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { adminEmails } from '@/lib/config';

export default function DashboardPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const [dict, setDict] = useState<Dictionary | null>(null);
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    getDictionary(lang).then(setDict);
  }, [lang]);

  if (isUserLoading || !dict || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  const dashboardDict = dict.dashboard_page;
  const isAdmin = user && user.email && adminEmails.includes(user.email);
  const greeting = dashboardDict.subtitle.replace('{name}', user.displayName || 'Belle Âme');

  const dashboardItems = [
    {
      href: `/${lang}/account`,
      title: dashboardDict.account.title,
      description: dashboardDict.account.description,
      icon: User,
    },
    {
      href: `/${lang}/trainings`,
      title: dashboardDict.trainings.title,
      description: dashboardDict.trainings.description,
      icon: GraduationCap,
    },
    {
      href: `/${lang}/bookings`,
      title: dashboardDict.bookings.title,
      description: dashboardDict.bookings.description,
      icon: CalendarCheck,
    },
    {
      href: `/${lang}/hub`,
      title: dashboardDict.hub.title,
      description: dashboardDict.hub.description,
      icon: Users,
    },
  ];

  if (isAdmin) {
    dashboardItems.push({
        href: `/${lang}/admin`,
        title: dashboardDict.admin.title,
        description: dashboardDict.admin.description,
        icon: Shield,
    });
  }

  return (
    <div className="container mx-auto p-4 sm:p-8">
        <div className="mb-8">
            <h1 className="text-4xl font-headline mb-2">{dashboardDict.title}</h1>
            <p className="text-lg text-muted-foreground">{greeting}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dashboardItems.map((item) => (
                <Link href={item.href} key={item.href} className="flex">
                    <Card className="w-full flex flex-col justify-between transition-transform transform hover:-translate-y-1 hover:shadow-lg">
                        <CardHeader className="flex flex-row items-start gap-4">
                            <div className="bg-accent/20 p-3 rounded-full">
                                <item.icon className="h-6 w-6 text-accent" />
                            </div>
                            <div>
                                <CardTitle>{item.title}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <p className="text-muted-foreground">{item.description}</p>
                        </CardContent>
                        <div className="flex justify-end p-4">
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </Card>
                </Link>
            ))}
        </div>
    </div>
  );
}
