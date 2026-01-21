import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, PlusCircle } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';

type Product = {
  id: string;
  nameKey: keyof Dictionary['shop']['products'];
  descriptionKey: keyof Dictionary['shop']['products'];
  price: number;
  currency: string;
  imageId: string;
};

const products: Product[] = [
    { id: '1', nameKey: 'meditationStoneName', descriptionKey: 'meditationStoneDescription', price: 25, currency: 'EUR', imageId: 'product-meditation-stone'},
    { id: '2', nameKey: 'essentialOilName', descriptionKey: 'essentialOilDescription', price: 15, currency: 'EUR', imageId: 'product-essential-oil' },
    { id: '3', nameKey: 'yogaMatName', descriptionKey: 'yogaMatDescription', price: 40, currency: 'EUR', imageId: 'product-yoga-mat' },
];

function ProductCard({ product, dict }: { product: Product, dict: Dictionary['shop'] }) {
    const productImage = PlaceHolderImages.find(p => p.id === product.imageId);
    
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
                <CardTitle className="text-xl font-headline">{dict.products[product.nameKey]}</CardTitle>
                <CardDescription className="mt-2 text-sm text-muted-foreground">
                    {dict.products[product.descriptionKey]}
                </CardDescription>
            </CardContent>
            <CardFooter className="p-4 flex justify-between items-center bg-muted/50">
                <p className="text-lg font-semibold text-accent-foreground">
                    {new Intl.NumberFormat(dict.locale, { style: 'currency', currency: product.currency }).format(product.price)}
                </p>
                <Button size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {dict.addToCart}
                </Button>
            </CardFooter>
        </Card>
    );
}


export default async function ShopPage({ params: { lang } }: { params: { lang: Locale } }) {
  const dict = await getDictionary(lang);

  return (
    <div className="container mx-auto p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
            <ShoppingBag className="h-10 w-10 text-accent" />
            <h1 className="text-4xl font-headline">{dict.shop.title}</h1>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map(product => (
                <ProductCard key={product.id} product={product} dict={{...dict.shop, locale: lang}} />
            ))}
        </div>
    </div>
  );
}
