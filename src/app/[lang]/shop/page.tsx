import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { ShoppingBag } from 'lucide-react';
import type { Product } from '@/components/providers/cart-provider';
import { ProductCard } from '@/components/shop/product-card';

const products: Product[] = [
    { id: '1', nameKey: 'meditationStoneName', descriptionKey: 'meditationStoneDescription', price: 25, currency: 'EUR', imageId: 'product-meditation-stone'},
    { id: '2', nameKey: 'essentialOilName', descriptionKey: 'essentialOilDescription', price: 15, currency: 'EUR', imageId: 'product-essential-oil' },
    { id: '3', nameKey: 'yogaMatName', descriptionKey: 'yogaMatDescription', price: 40, currency: 'EUR', imageId: 'product-yoga-mat' },
];

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
                <ProductCard key={product.id} product={product} dict={dict.shop} lang={lang} />
            ))}
        </div>
    </div>
  );
}
