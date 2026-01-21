import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';

export default async function AgendaPage({ params: { lang } }: { params: { lang: Locale } }) {
  const dict = await getDictionary(lang);

  return (
    <div className="container mx-auto p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
            <CalendarDays className="h-10 w-10 text-accent" />
            <h1 className="text-4xl font-headline">{dict.agenda.title}</h1>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>{dict.agenda.description}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    {/* Placeholder for calendar implementation */}
                    Coming soon...
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
