'use client';

import Image from 'next/image';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useCart, Product } from '@/components/providers/cart-provider';
import { useToast } from '@/hooks/use-toast';

export function ProductCard({ product, dict, lang }: { product: Product, dict: Dictionary['shop'], lang: Locale }) {
    const productImage = PlaceHolderImages.find(p => p.id === product.imageId);
    const { addToCart } = useCart();
    const { toast } = useToast();

    const handleAddToCart = () => {
        addToCart(product);
        toast({
            title: dict.productAdded,
            description: `${dict.products[product.nameKey]} ${dict.addedToCart}`,
        });
    }
    
    return (
        <Card className="flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-xl">
            <CardHeader className="p-0">
                {productImage && (
                    <div className="relative aspect-[4/3]">
                        <Image
                            src={productImage.imageUrl}
                            alt={productImage.description}
                            fill
                            className="object-cover"
                            data-ai-hint={productImage.imageHint}
                        />
                    </div>
                )}
            </CardHeader>
            <CardContent className="flex-1 p-4">
                <h3 className="text-xl font-headline font-semibold tracking-tight">{dict.products[product.nameKey]}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    {dict.products[product.descriptionKey]}
                </p>
            </CardContent>
            <CardFooter className="p-4 flex justify-between items-center bg-muted/50">
                <p className="text-lg font-semibold text-accent-foreground">
                    {new Intl.NumberFormat(lang, { style: 'currency', currency: product.currency }).format(product.price)}
                </p>
                <Button size="sm" onClick={handleAddToCart}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {dict.addToCart}
                </Button>
            </CardFooter>
        </Card>
    );
}
