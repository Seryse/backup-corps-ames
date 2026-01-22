import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { db } from '@/firebase/server';
import { doc, getDoc } from 'firebase/firestore';
import type { SessionType } from '@/components/admin/session-type-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

    return (
        <div className="container mx-auto p-4 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
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
                            {localizedPageContent && (
                                <div className="prose dark:prose-invert mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: localizedPageContent.replace(/\n/g, '<br />') }} />
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-1">
                     <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">{localizedName}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-3xl font-bold text-accent">
                                {new Intl.NumberFormat(lang, { style: 'currency', currency: sessionType.currency }).format(sessionType.price / 100)}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Users className="h-5 w-5" />
                                <span>{modelLabel} ({sessionType.maxParticipants} max)</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full">
                                <Link href={`/${lang}/agenda`}>
                                    <CalendarCheck className="mr-2 h-4 w-4" />
                                    {dict.home.bookASession}
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
