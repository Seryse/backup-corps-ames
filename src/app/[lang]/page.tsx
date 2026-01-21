import { getDictionary } from '@/lib/dictionaries'
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Locale } from '@/i18n-config';

export default async function Home({ params: { lang } }: { params: { lang: Locale } }) {
  const dict = await getDictionary(lang);
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-spiritual');

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] overflow-hidden p-8">
      <div className="absolute inset-0 z-0">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            data-ai-hint={heroImage.imageHint}
            priority
          />
        )}
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm"></div>
      </div>
      <div className="relative z-10 text-center text-foreground flex flex-col items-center animate-fade-in-up">
        <h1 className="text-5xl md:text-7xl font-headline font-bold drop-shadow-lg">
          {dict.landing.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg md:text-xl text-foreground/80 font-body drop-shadow-md">
          {dict.landing.subtitle}
        </p>
        <p className="mt-6 max-w-xl text-base md:text-lg text-foreground/70 font-body">
          {dict.landing.description}
        </p>
        <Button asChild size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg transition-transform hover:scale-105">
          <Link href={`/${lang}/session`}>{dict.landing.cta}</Link>
        </Button>
      </div>
    </div>
  );
}
