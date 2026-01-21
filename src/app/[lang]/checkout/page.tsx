'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useCart } from '@/components/providers/cart-provider';
import { useUser } from '@/firebase';
import { processCheckout } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, ShoppingCart } from 'lucide-react';

export default function CheckoutPage({ params: { lang } }: { params: { lang: Locale } }) {
  const [dict, setDict] = useState<Dictionary['checkout'] | null>(null);
  const { items, removeFromCart, clearCart, itemCount, totalPrice } = useCart();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d.checkout));
  }, [lang]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push(`/${lang}/login`);
    }
  }, [user, isUserLoading, lang, router]);

  const handlePayment = async () => {
    if (!user || items.length === 0) return;

    setIsProcessing(true);
    const result = await processCheckout(user.uid, items);
    setIsProcessing(false);

    if (result.success) {
      toast({
        title: dict?.paymentSuccessTitle,
        description: dict?.paymentSuccessDescription,
      });
      clearCart();
      setTimeout(() => router.push(`/${lang}/dashboard`), 2000);
    } else {
      toast({
        variant: 'destructive',
        title: dict?.paymentErrorTitle,
        description: dict?.paymentErrorDescription,
      });
    }
  };

  if (!dict || isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <h1 className="text-4xl font-headline mb-8">{dict.title}</h1>
      {itemCount > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{dict.yourCart}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {items.map(item => {
                    const localizedName = (item.name && typeof item.name === 'object') ? (item.name[lang] || item.name.en) : item.name;
                    return (
                        <li key={item.id} className="flex items-center gap-4">
                            <Image src={item.imageUrl} alt={localizedName} width={80} height={60} className="rounded-md object-cover aspect-[4/3]" />
                            <div className="flex-grow">
                                <h3 className="font-semibold">{localizedName}</h3>
                                <p className="text-sm text-muted-foreground">{new Intl.NumberFormat(lang, { style: 'currency', currency: item.currency }).format(item.price / 100)}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove</span>
                            </Button>
                        </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>{dict.summary}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>{`${dict.total} (${itemCount} ${itemCount > 1 ? 'items' : 'item'})`}</span>
                  <span className="font-semibold">{new Intl.NumberFormat(lang, { style: 'currency', currency: items[0]?.currency || 'eur' }).format(totalPrice / 100)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handlePayment} disabled={isProcessing}>
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isProcessing ? dict.processingPayment : dict.proceedToPayment}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="mt-6 text-2xl font-headline">{dict.emptyCart}</h2>
          <Button asChild className="mt-8">
            <Link href={`/${lang}/shop`}>{dict.browseFormations}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
