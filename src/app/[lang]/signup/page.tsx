import { AuthForm } from '@/components/auth/auth-form';
import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';

export default async function SignupPage({ params: { lang } }: { params: { lang: Locale } }) {
  const dict = await getDictionary(lang);
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-background p-4">
      <AuthForm mode="signup" dictionary={dict.auth} lang={lang} />
    </div>
  );
}
