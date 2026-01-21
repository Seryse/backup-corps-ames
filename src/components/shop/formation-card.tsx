'use client';

import Image from 'next/image';
import { PlusCircle, ImageOff } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useCart, Formation } from '@/components/providers/cart-provider';
import { useToast } from '@/hooks/use-toast';

export function FormationCard({ formation, dict, lang }: { formation: Formation, dict: Dictionary['shop'], lang: Locale }) {
    const { addToCart, items } = useCart();
    const { toast } = useToast();

    const isAlreadyInCart = items.some(item => item.id === formation.id);
    
    const localizedName = formation.name[lang] || formation.name.en;
    const localizedDescription = formation.description[lang] || formation.description.en;

    const handleAddToCart = () => {
        if (isAlreadyInCart) {
            toast({
                title: dict.alreadyInCart,
                description: `${localizedName} ${dict.alreadyInCartDescription}`,
            });
            return;
        }
        addToCart(formation);
        toast({
            title: dict.formationAdded,
            description: `${localizedName} ${dict.addedToCart}`,
        });
    }
    
    return (
        <Card className="flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-xl">
            <CardHeader className="p-0">
                <div className="relative aspect-[4/3] bg-muted flex items-center justify-center">
                    {formation.imageUrl ? (
                        <Image
                            src={formation.imageUrl}
                            alt={localizedName}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <ImageOff className="h-12 w-12 text-muted-foreground" />
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-4">
                <h3 className="text-xl font-headline font-semibold tracking-tight">{localizedName}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    {localizedDescription}
                </p>
            </CardContent>
            <CardFooter className="p-4 flex justify-between items-center bg-muted/50">
                <p className="text-lg font-semibold text-accent-foreground">
                    {new Intl.NumberFormat(lang, { style: 'currency', currency: formation.currency }).format(formation.price / 100)}
                </p>
                <Button size="sm" onClick={handleAddToCart} disabled={isAlreadyInCart}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {isAlreadyInCart ? dict.inCart : dict.addToCart}
                </Button>
            </CardFooter>
        </Card>
    );
}
