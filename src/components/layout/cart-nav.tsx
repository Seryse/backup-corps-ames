'use client';

import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/components/providers/cart-provider';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function CartNav() {
    const { itemCount } = useCart();
    const pathname = usePathname();
    const lang = pathname?.split('/')[1] || 'fr';

    return (
        <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href={`/${lang}/checkout`}>
                <ShoppingCart className="h-[1.2rem] w-[1.2rem]" />
                {itemCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full flex items-center justify-center p-0">
                        {itemCount}
                    </Badge>
                )}
                <span className="sr-only">Shopping Cart</span>
            </Link>
        </Button>
    )
}
