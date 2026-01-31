import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/header';
import { getDictionary } from '@/lib/dictionaries';
import { Locale, i18n } from '@/i18n-config';
import { CartProvider } from '@/components/providers/cart-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }))
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: Locale }>; 
}) {
  const { lang } = await params;
  
  const dictionary = await getDictionary(lang);

  return (
    <FirebaseClientProvider>
      <CartProvider>
        <Header dictionary={dictionary.header} lang={lang} />
        <main className="flex-1">
          {children}
        </main>
        <Toaster />
      </CartProvider>
    </FirebaseClientProvider>
  );
}
