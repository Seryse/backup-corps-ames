'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart, Formation } from "@/components/providers/cart-provider";
import { useToast } from "@/hooks/use-toast";
import { Dictionary } from "@/lib/dictionaries";
import { Locale } from "@/i18n-config";
import { Check, PlusCircle } from "lucide-react";

interface FormationDetailClientProps {
    formation: Formation;
    dict: Dictionary;
    lang: Locale;
}

export default function FormationDetailClient({ formation, dict, lang }: FormationDetailClientProps) {
    const { addToCart, items } = useCart();
    const { toast } = useToast();
    const shopDict = dict.shop;

    const isAlreadyInCart = items.some(item => item.id === formation.id);

    const handleAddToCart = () => {
        if (isAlreadyInCart) {
            toast({
                title: shopDict.alreadyInCart,
                description: `${formation.name[lang] || formation.name.fr} ${shopDict.alreadyInCartDescription}`,
            });
            return;
        }
        addToCart(formation);
        toast({
            title: shopDict.formationAdded,
            description: `${formation.name[lang] || formation.name.fr} ${shopDict.addedToCart}`,
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">{formation.name[lang] || formation.name.fr}</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="text-3xl font-bold text-accent">
                    {new Intl.NumberFormat(lang, { style: 'currency', currency: formation.currency }).format(formation.price / 100)}
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={handleAddToCart} disabled={isAlreadyInCart}>
                    {isAlreadyInCart ? (
                        <>
                            <Check className="mr-2 h-4 w-4" />
                            {shopDict.inCart}
                        </>
                    ) : (
                        <>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {shopDict.addToCart}
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
