import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import AboutPageForm from '@/components/admin/about-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function AdminAboutPage({ params: { lang } }: { params: { lang: Locale } }) {
  const dictionary = await getDictionary(lang);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modifier la page "À Propos"</CardTitle>
      </CardHeader>
      <CardContent>
        <AboutPageForm />
      </CardContent>
    </Card>
  );
}
