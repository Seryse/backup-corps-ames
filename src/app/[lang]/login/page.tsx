import { AuthForm } from '@/components/auth/auth-form';
import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';

// 1. On change le type : params est une Promise
export default async function LoginPage({ params }: { params: Promise<{ lang: Locale }> }) {
  
  // 2. On attend (await) que les paramètres soient disponibles
  const { lang } = await params;
  
  const dict = await getDictionary(lang);
  
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-background p-4">
      <AuthForm mode="login" dictionary={dict.auth} lang={lang} />
    </div>
  );
}