import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { db } from '@/firebase/server';
import { doc, getDoc } from 'firebase/firestore';
import type { Formation } from '@/components/providers/cart-provider';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import FinalCtaButton from '@/components/shop/final-cta-button';

async function getFormation(id: string): Promise<Formation | null> {
    const docRef = doc(db, 'formations', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return null;
    }

    return { id: docSnap.id, ...docSnap.data() } as Formation;
}

function getEmbedUrl(url: string): string | null {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com')) {
            const videoId = urlObj.searchParams.get('v');
            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        }
        if (urlObj.hostname.includes('youtu.be')) {
            const videoId = urlObj.pathname.slice(1);
            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        }
        if (urlObj.hostname.includes('vimeo.com')) {
            const videoId = urlObj.pathname.split('/').pop();
            return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
        }
    } catch (error) {
        console.error("Invalid video URL:", error);
        return null;
    }
    return null;
}


export default async function FormationDetailPage({ params: { lang, formationId } }: { params: { lang: Locale, formationId: string } }) {
    const dict = await getDictionary(lang);
    const formation = await getFormation(formationId);

    if (!formation) {
        notFound();
    }

    const localizedName = formation.name?.[lang] || formation.name?.fr;
    const localizedDescription = formation.description?.[lang] || formation.description?.fr;
    const localizedPageContent = formation.pageContent?.[lang] || formation.pageContent?.fr;
    const embedUrl = formation.videoUrl ? getEmbedUrl(formation.videoUrl) : null;

    return (
        <div className="container mx-auto p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <Card>
                    <CardHeader className="p-0">
                        <div className="relative aspect-video">
                            <Image 
                                src={formation.imageUrl} 
                                alt={localizedName} 
                                fill 
                                className="object-cover rounded-t-lg"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <h1 className="text-4xl font-headline mb-4">{localizedName}</h1>
                        <p className="text-lg text-muted-foreground">{localizedDescription}</p>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row items-stretch sm:items-center sm:justify-between p-6 bg-muted/50">
                        <div className="text-3xl font-bold text-accent mb-4 sm:mb-0">
                            {new Intl.NumberFormat(lang, { style: 'currency', currency: formation.currency }).format(formation.price / 100)}
                        </div>
                        <FinalCtaButton formation={formation} dict={dict} lang={lang} />
                    </CardFooter>
                </Card>

                {embedUrl && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{dict.shop.presentationVideo}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative aspect-video">
                                <iframe
                                    src={embedUrl}
                                    title={dict.shop.presentationVideo}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                                ></iframe>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {localizedPageContent && (
                     <Card>
                         <CardContent className="p-6">
                            <div className="prose dark:prose-invert mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: localizedPageContent.replace(/\n/g, '<br />') }} />
                        </CardContent>
                     </Card>
                )}

                <div className="text-center py-8">
                    <FinalCtaButton formation={formation} dict={dict} lang={lang} className="w-full h-16 text-xl" />
                </div>
            </div>
        </div>
    );
}
