import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { use } from 'react';

export default async function GrimoireRecoveryPage({ params }: { params: { lang: Locale } }) {
  const dict = await getDictionary(params.lang);

  // This is a temporary page to recover from a build error.
  // It intentionally mirrors a simpler page's structure.

  return (
    <div className="container mx-auto p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
            <Users className="h-10 w-10 text-accent" />
            <h1 className="text-4xl font-headline">Page de récupération</h1>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>En attente de résolution</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Cette page est temporairement affichée pour permettre au serveur de démarrer. Le problème de build est en cours de résolution.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
