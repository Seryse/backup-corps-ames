import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Corps et Âmes',
  description: 'Sanctuaire de bien-être pour le corps et l\'âme.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
