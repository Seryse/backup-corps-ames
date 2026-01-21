import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { ShoppingBag } from 'lucide-react';
import type { Product } from '@/components/providers/cart-provider';
import { ProductCard } from '@/components/shop/product-card';

const products: Product[] = [
    { id: 'formation-reiki-1', name: 'Reiki Level 1', description: 'Unlock your potential as a healer. This course covers the basics of Reiki energy healing.', price: 150, currency: 'EUR', imageId: 'reiki-formation'},
    { id: 'formation-divination', name: 'Divination Mastery', description: 'Learn the ancient art of divination using various tools like tarot, runes, and pendulums.', price: 200, currency: 'EUR', imageId: 'divination-mastery' },
    { id: 'formation-runes', name: 'Rune Crafting & Reading', description: 'Discover how to create your own set of runes and interpret their meanings.', price: 120, currency: 'EUR', imageId: 'rune-crafting' },
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
