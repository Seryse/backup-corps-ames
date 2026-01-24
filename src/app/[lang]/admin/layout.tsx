import AdminLayout from '@/components/admin/admin-layout';
import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';

export default async function AdminRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: Locale };
}) {
  const dictionary = await getDictionary(params.lang);

  return (
    <AdminLayout dictionary={dictionary} lang={params.lang}>
        {children}
    </AdminLayout>
  );
}
