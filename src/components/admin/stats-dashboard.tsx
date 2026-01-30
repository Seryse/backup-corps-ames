'use client';

import { useMemo } from 'react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection, query, Query, collectionGroup } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Loader2,
  Users,
  Euro,
  BookDown,
  BarChart2,
} from 'lucide-react';
import { Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import type { SessionType } from './session-type-manager';
import type { Formation } from '../providers/cart-provider';
import type { LiveSession } from '@/lib/types';

// Simplified types for this component
type UserProfile = { id: string };
type UserFormation = { id: string; formationId: string };

export default function StatsDashboard({
  dictionary,
  lang,
}: {
  dictionary: Dictionary;
  lang: Locale;
}) {
  const firestore = useFirestore();
  const statsDict = dictionary.stats_page;

  // --- Data Fetching ---
  const usersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') as Query<UserProfile> : null),
    [firestore]
  );
  const sessionsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sessions') as Query<LiveSession> : null),
    [firestore]
  );
  // Correctly query the 'formations' subcollection across all 'users'
  const userFormationsQuery = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'formations') as Query<UserFormation> : null),
    [firestore]
  );
  const sessionTypesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sessionTypes') as Query<SessionType> : null),
    [firestore]
  );
  const allFormationsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'formations') as Query<Formation> : null),
    [firestore]
  );

  const { data: users, isLoading: loadingUsers } = useCollection<UserProfile>(usersQuery);
  const { data: sessions, isLoading: loadingSessions } = useCollection<LiveSession>(sessionsQuery);
  const { data: userFormations, isLoading: loadingUserFormations } = useCollection<UserFormation>(userFormationsQuery);
  const { data: sessionTypes, isLoading: loadingSessionTypes } = useCollection<SessionType>(sessionTypesQuery);
  const { data: allFormations, isLoading: loadingAllFormations } = useCollection<Formation>(allFormationsQuery);

  const stats = useMemo(() => {
    if (
      !users ||
      !sessions ||
      !userFormations ||
      !sessionTypes ||
      !allFormations
    ) {
      return null;
    }

    const sessionTypeMap = new Map(sessionTypes.map((st) => [st.id, st]));
    const formationMap = new Map(allFormations.map((f) => [f.id, f]));

    const sessionsRevenue = sessions.reduce((acc, session) => {
      const sessionType = sessionTypeMap.get(session.sessionTypeId);
      return acc + (sessionType?.price || 0);
    }, 0);

    const formationsRevenue = userFormations.reduce((acc, userFormation) => {
      const formation = formationMap.get(userFormation.formationId);
      return acc + (formation?.price || 0);
    }, 0);

    const totalRevenue = (sessionsRevenue + formationsRevenue) / 100;
    const totalUsers = users.length;
    const grimoireDownloads = sessions.filter(
      (s) => s.reportStatus === 'available'
    ).length;

    // Revenue breakdown for chart
    const revenueByProduct: { name: string; revenue: number }[] = [];

    // By Session Type
    sessions.forEach((session) => {
      const sessionType = sessionTypeMap.get(session.sessionTypeId);
      if (sessionType) {
        const name = sessionType.name[lang] || sessionType.name.en;
        const price = sessionType.price / 100;
        const existing = revenueByProduct.find((item) => item.name === name);
        if (existing) {
          existing.revenue += price;
        } else {
          revenueByProduct.push({ name, revenue: price });
        }
      }
    });

    // By Formation
    userFormations.forEach((userFormation) => {
      const formation = formationMap.get(userFormation.formationId);
      if (formation) {
        const name = formation.name[lang] || formation.name.en;
        const price = formation.price / 100;
        const existing = revenueByProduct.find((item) => item.name === name);
        if (existing) {
          existing.revenue += price;
        } else {
          revenueByProduct.push({ name, revenue: price });
        }
      }
    });

    return {
      totalRevenue,
      totalUsers,
      grimoireDownloads,
      revenueByProduct: revenueByProduct.sort((a,b) => b.revenue - a.revenue),
    };
  }, [
    users,
    sessions,
    userFormations,
    sessionTypes,
    allFormations,
    lang,
  ]);

  const isLoading =
    loadingUsers ||
    loadingSessions ||
    loadingUserFormations ||
    loadingSessionTypes ||
    loadingAllFormations;
  
  const chartConfig = {
    revenue: {
      label: statsDict.totalRevenue,
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;

  if (isLoading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format(
      value
    );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <BarChart2 className="h-8 w-8 text-accent" />
        <h1 className="text-4xl font-headline">{statsDict.title}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {statsDict.totalRevenue}
            </CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {statsDict.totalUsers}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {statsDict.grimoireDownloads}
            </CardTitle>
            <BookDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.grimoireDownloads}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{statsDict.revenueBreakdown}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <BarChart data={stats.revenueByProduct} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={formatCurrency} />
              <YAxis dataKey="name" type="category" width={200} interval={0} tick={{ fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                content={<ChartTooltipContent />}
              />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
