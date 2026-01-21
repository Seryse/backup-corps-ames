import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default async function HubPage({ params: { lang } }: { params: { lang: Locale } }) {
  const dict = await getDictionary(lang);

  return (
    <div className="container mx-auto p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
            <Users className="h-10 w-10 text-accent" />
            <h1 className="text-4xl font-headline">{dict.header.hub}</h1>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Bienvenue dans le Hub Communautaire</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    L'espace de discussion et de partage sera bientôt disponible ici.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
