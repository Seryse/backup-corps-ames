'use client';

import { Button } from "@/components/ui/button";
import { useCart, Formation } from "@/components/providers/cart-provider";
import { useToast } from "@/hooks/use-toast";
import { Dictionary } from "@/lib/dictionaries";
import { Locale } from "@/i18n-config";
import { Check, ShoppingCart } from "lucide-react";

interface FinalCtaButtonProps {
    formation: Formation;
    dict: Dictionary;
    lang: Locale;
}

export default function FinalCtaButton({ formation, dict, lang }: FinalCtaButtonProps) {
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
         <Button size="lg" className="w-full h-16 text-xl" onClick={handleAddToCart} disabled={isAlreadyInCart}>
            {isAlreadyInCart ? (
                <>
                    <Check className="mr-2 h-6 w-6" />
                    {shopDict.inCart}
                </>
            ) : (
                <>
                    <ShoppingCart className="mr-2 h-6 w-6" />
                    {shopDict.finalCta}
                </>
            )}
        </Button>
    )
}
