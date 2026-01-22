import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { db } from '@/firebase/server';
import { doc, getDoc } from 'firebase/firestore';
import type { SessionType } from '@/components/admin/session-type-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Users } from 'lucide-react';

async function getSessionType(id: string): Promise<SessionType | null> {
    const docRef = doc(db, 'sessionTypes', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return null;
    }

    return { id: docSnap.id, ...docSnap.data() } as SessionType;
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

export default async function SessionTypeDetailPage({ params: { lang, sessionTypeId } }: { params: { lang: Locale, sessionTypeId: string } }) {
    const dict = await getDictionary(lang);
    const sessionType = await getSessionType(sessionTypeId);

    if (!sessionType) {
        notFound();
    }

    const localizedName = sessionType.name?.[lang] || sessionType.name?.fr;
    const localizedDescription = sessionType.description?.[lang] || sessionType.description?.fr;
    const localizedPageContent = sessionType.pageContent?.[lang] || sessionType.pageContent?.fr;
    const modelLabel = dict.admin.form.sessionModelOptions[sessionType.sessionModel] || sessionType.sessionModel;
    const embedUrl = sessionType.videoUrl ? getEmbedUrl(sessionType.videoUrl) : null;

    return (
        <div className="container mx-auto p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <Card>
                    <CardHeader className="p-0">
                        <div className="relative aspect-video">
                            <Image 
                                src={sessionType.imageUrl || 'https://placehold.co/600x400'} 
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
                        <div className="space-y-2 mb-4 sm:mb-0">
                            <div className="text-3xl font-bold text-accent">
                                {new Intl.NumberFormat(lang, { style: 'currency', currency: sessionType.currency }).format(sessionType.price / 100)}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Users className="h-5 w-5" />
                                <span>{modelLabel} ({sessionType.maxParticipants} max)</span>
                            </div>
                        </div>
                        <Button asChild size="lg">
                            <Link href={`/${lang}/agenda`}>
                                <CalendarCheck className="mr-2 h-5 w-5" />
                                {dict.home.bookASession}
                            </Link>
                        </Button>
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
                    <Button asChild size="lg" className="w-full h-16 text-xl">
                       <Link href={`/${lang}/agenda`}>
                           <CalendarCheck className="mr-2 h-6 w-6" />
                           {dict.home.bookASession}
                       </Link>
                   </Button>
               </div>
            </div>
        </div>
    );
}
