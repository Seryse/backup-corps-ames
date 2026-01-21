'use client';

import Image from 'next/image';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useCart, Formation } from '@/components/providers/cart-provider';
import { useToast } from '@/hooks/use-toast';

export function FormationCard({ formation, dict, lang }: { formation: Formation, dict: Dictionary['shop'], lang: Locale }) {
    const formationImage = PlaceHolderImages.find(p => p.id === formation.imageId);
    const { addToCart, items } = useCart();
    const { toast } = useToast();

    const isAlreadyInCart = items.some(item => item.id === formation.id);

    const handleAddToCart = () => {
        if (isAlreadyInCart) {
            toast({
                title: "Déjà dans le panier",
                description: `${formation.name} est déjà dans votre panier.`,
            });
            return;
        }
        addToCart(formation);
        toast({
            title: dict.formationAdded,
            description: `${formation.name} ${dict.addedToCart}`,
        });
    }
    
    return (
        <Card className="flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-xl">
            <CardHeader className="p-0">
                {formationImage && (
                    <div className="relative aspect-[4/3]">
                        <Image
                            src={formationImage.imageUrl}
                            alt={formationImage.description}
                            fill
                            className="object-cover"
                            data-ai-hint={formationImage.imageHint}
                        />
                    </div>
                )}
            </CardHeader>
            <CardContent className="flex-1 p-4">
                <h3 className="text-xl font-headline font-semibold tracking-tight">{formation.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    {formation.description}
                </p>
            </CardContent>
            <CardFooter className="p-4 flex justify-between items-center bg-muted/50">
                <p className="text-lg font-semibold text-accent-foreground">
                    {new Intl.NumberFormat(lang, { style: 'currency', currency: formation.currency }).format(formation.price / 100)}
                </p>
                <Button size="sm" onClick={handleAddToCart} disabled={isAlreadyInCart}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {isAlreadyInCart ? "Déjà ajouté" : dict.addToCart}
                </Button>
            </CardFooter>
        </Card>
    );
}
