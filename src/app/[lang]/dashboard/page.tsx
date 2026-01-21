import { getDictionary } from '@/lib/dictionaries';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Locale } from '@/i18n-config';
import { HeartHand } from 'lucide-react';

export default async function DashboardPage({ params: { lang } }: { params: { lang: Locale } }) {
  const dict = await getDictionary(lang);
  const welcomeImage = PlaceHolderImages.find(p => p.id === 'dashboard-welcome');

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="p-0">
            <div className="relative h-48 sm:h-64">
                {welcomeImage && (
                    <Image
                        src={welcomeImage.imageUrl}
                        alt={welcomeImage.description}
                        fill
                        className="object-cover"
                        data-ai-hint={welcomeImage.imageHint}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>
        </CardHeader>
        <CardContent className="p-6">
            <div className="flex items-start gap-4">
                <HeartHand className="h-12 w-12 text-accent mt-1" />
                <div>
                    <CardTitle className="font-headline text-3xl">{dict.dashboard.title}</CardTitle>
                    <CardDescription className="mt-2 text-lg">
                        {dict.dashboard.description}
                    </CardDescription>
                </div>
            </div>
            <div className="mt-6 flex justify-start">
                <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link href={`/${lang}/session`}>{dict.dashboard.startSession}</Link>
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
