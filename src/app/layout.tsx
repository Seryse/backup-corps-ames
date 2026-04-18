import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Corps et Âmes',
  description: "Sanctuaire de bien-être pour le corps et l'âme.",
  icons: {
    icon: '/icone64.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;700&family=PT+Sans:wght@400;700&family+Source+Code+Pro&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
