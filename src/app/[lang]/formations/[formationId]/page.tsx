'use client';

import React, { useState, useEffect, use } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Formation, useCart } from '@/components/providers/cart-provider';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, CheckCircle, PlayCircle, BookOpen } from 'lucide-react';

// Fonction utilitaire pour obtenir l'URL d'intégration de la vidéo
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

export default function FormationDetailPage({ params }: { params: Promise<{ lang: Locale, formationId: string }> }) {
    const { lang, formationId } = use(params);
    const [dict, setDict] = useState<Dictionary | null>(null);
    const firestore = useFirestore();

    const { addToCart, items: cartItems } = useCart();

    useEffect(() => {
        getDictionary(lang).then(setDict);
    }, [lang]);

    const formationRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'formations', formationId);
    }, [firestore, formationId]);

    const { data: formation, isLoading } = useDoc<Formation>(formationRef);

    const isInCart = cartItems.some(item => item.id === formationId);

    const handleAddToCart = () => {
        if (formation) {
            addToCart(formation);
        }
    };

    if (isLoading || !dict) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    if (!formation) {
        notFound();
    }

    const localizedName = formation.name?.[lang] || formation.name?.fr;
    const localizedDescription = formation.description?.[lang] || formation.description?.fr;
    const localizedPageContent = formation.pageContent?.[lang] || formation.pageContent?.fr;
    const embedUrl = formation.videoUrl ? getEmbedUrl(formation.videoUrl) : null;
    const shopDict = dict.shop;

    return (
        <div className="container mx-auto p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <Card>
                    <CardHeader className="p-0">
                        <div className="relative aspect-video">
                            <Image 
                                src={formation.imageUrl || 'https://placehold.co/600x400'} 
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
                        <div className="text-3xl font-bold text-accent">
                            {new Intl.NumberFormat(lang, { style: 'currency', currency: formation.currency }).format(formation.price / 100)}
                        </div>
                        <Button size="lg" onClick={handleAddToCart} disabled={isInCart}>
                            {isInCart ? (
                                <>
                                    <CheckCircle className="mr-2 h-5 w-5" />
                                    {shopDict.addedToCart}
                                </>
                            ) : (
                                <>
                                    <ShoppingCart className="mr-2 h-5 w-5" />
                                    {shopDict.addToCart}
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                {embedUrl && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <PlayCircle />
                                {shopDict.presentationVideo}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative aspect-video">
                                <iframe
                                    src={embedUrl}
                                    title={shopDict.presentationVideo}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                                ></iframe>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {formation.chapters && formation.chapters.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen />
                                {dict.training_page.chapters}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4">
                                {formation.chapters.map(chapter => (
                                    <li key={chapter.id} className="p-4 bg-background rounded-md border">
                                        <h3 className="font-semibold text-lg">{chapter.title?.[lang] || chapter.title?.fr}</h3>
                                        {chapter.description && <p className="text-muted-foreground text-sm mt-1">{chapter.description?.[lang] || chapter.description?.fr}</p>}
                                    </li>
                                ))}
                            </ul>
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
                   <Button size="lg" className="w-full h-16 text-xl" onClick={handleAddToCart} disabled={isInCart}>
                         {isInCart ? (
                            <>
                                <CheckCircle className="mr-2 h-6 w-6" />
                                {shopDict.addedToCart}
                            </>
                        ) : (
                            <>
                                <ShoppingCart className="mr-2 h-6 w-6" />
                                {shopDict.addToCart}
                            </>
                        )}
                    </Button>
               </div>
            </div>
        </div>
    );
}
