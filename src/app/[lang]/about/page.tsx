'use client';

// 1. AJOUT DE L'IMPORT 'use'
import { useState, useEffect, use } from 'react';
import { Locale } from '@/i18n-config';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { AboutPageContent } from '@/components/admin/about-form'; // Vérifie que le chemin d'import est bon chez toi

// Helper component to safely render HTML
const DangerousHTML = ({ content }: { content: string }) => {
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
};

// 2. MODIFICATION DU TYPE DE PARAMS (C'est une Promise maintenant)
export default function AboutPage({ params }: { params: Promise<{ lang: Locale }> }) {
  // 3. DÉBALLAGE DE LA PROMESSE
  const { lang } = use(params);

  const firestore = useFirestore();
  const [content, setContent] = useState<AboutPageContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const docRef = doc(firestore, 'pages', 'about');
        const contentSnap = await getDoc(docRef);

        if (contentSnap.exists()) {
          setContent(contentSnap.data() as AboutPageContent);
        } else {
          console.log('No such document!');
          setContent(null);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données de la page:", error);
        setContent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [firestore]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Page en construction</h1>
          <p className="text-muted-foreground">Le contenu de cette page n'a pas encore été défini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground">
      {/* 1. Hero Header Video */}
      {content.videoUrl && (
        <div className="w-full h-auto max-h-[70vh] overflow-hidden">
            <video 
                key={content.videoUrl} 
                className="w-full h-full object-cover" 
                autoPlay 
                loop 
                muted 
                playsInline
            >
                <source src={content.videoUrl} type="video/mp4" />
                Votre navigateur ne supporte pas la lecture de vidéos.
            </video>
        </div>
      )}

      <main className="container mx-auto px-4 py-16 sm:py-24 space-y-20">
        {/* 2. Birth of Corps & Âmes */}
        {content.birthContent?.[lang] && (
          <section className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">La naissance de Corps & Âmes</h2>
            <div className="prose prose-lg dark:prose-invert mx-auto text-muted-foreground">
              <DangerousHTML content={content.birthContent[lang]} />
            </div>
          </section>
        )}

        {/* 3. Media Block */}
        {content.mediaUrl && (
          <section className="max-w-5xl mx-auto">
             <img src={content.mediaUrl} alt="Média complémentaire" className="rounded-lg shadow-lg w-full h-auto object-cover" />
          </section>
        )}

        {/* 4 & 5. Husband and Wife Presentations */}
        <section className="grid md:grid-cols-2 gap-16 items-start">
            {content.husbandContent?.[lang] && (
                <div className="prose prose-lg dark:prose-invert mx-auto">
                    <h3 className="text-2xl font-bold mb-4">Présentation</h3>
                    <DangerousHTML content={content.husbandContent[lang]} />
                </div>
            )}
            {content.wifeContent?.[lang] && (
                <div className="prose prose-lg dark:prose-invert mx-auto">
                    <h3 className="text-2xl font-bold mb-4">Présentation</h3>
                    <DangerousHTML content={content.wifeContent[lang]} />
                </div>
            )}
        </section>
      </main>
    </div>
  );
}