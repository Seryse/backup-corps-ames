'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { Volume2, VolumeX } from 'lucide-react';

interface HeroSectionProps {
  lang: string;
  // 👇 C'est ici qu'on ajoute les nouvelles "entrées" pour le texte
  title: string;
  highlight: string;
  subtitle: string;
  cta: string;
}

export default function HeroSection({ lang, title, highlight, subtitle, cta }: HeroSectionProps) {
  const { user } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
        setIsTimeUp(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  const ctaHref = user ? `/${lang}/dashboard` : `/${lang}/login`;

  const showOverlay = isTimeUp || isHovered;

  const toggleAudio = () => {
    if (videoRef.current) {
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(!isMuted);
    }
  };

  return (
    <div 
        className="relative h-[85vh] w-full overflow-hidden group bg-slate-900"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
    >
      {/* --- VIDÉO DE FOND --- */}
      <video 
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
        autoPlay 
        loop 
        muted={isMuted}
        playsInline
      >
        <source src="/videos/HeroHeaderVideo.mp4" type="video/mp4" />
        Votre navigateur ne supporte pas la vidéo.
      </video>

      {/* --- OVERLAY SOMBRE --- */}
      <div 
        className={`absolute inset-0 bg-black/45 z-10 transition-opacity duration-1000 ease-in-out ${showOverlay ? 'opacity-100' : 'opacity-0'}`} 
      />
      
      {/* Dégradé bas */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10 opacity-60" />

      {/* --- CONTENU TEXTE --- */}
      <div 
        className={`relative z-20 container mx-auto px-4 h-full flex flex-col justify-center items-center text-center text-white transition-all duration-1000 ease-out transform ${showOverlay ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}`}
      >
        <div className="space-y-8 max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-sans font-extrabold tracking-tighter uppercase leading-[0.9] drop-shadow-lg">
            {/* 👇 Ici, on utilise les variables reçues au lieu du texte dur */}
            <span className="block">{title}</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-100 italic font-light lowercase">
              {highlight}
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto font-sans font-medium opacity-90 leading-snug drop-shadow-md">
            {subtitle}
          </p>

          <div className="pt-4">
            <Link href={ctaHref}>
              <Button size="lg" className="text-xl font-sans font-bold px-12 py-9 rounded-full bg-white text-black hover:bg-amber-50 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-105 border-none">
                {cta}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* --- BOUTON SON --- */}
      <button 
        onClick={toggleAudio}
        className="absolute bottom-10 right-10 z-[100] p-4 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 shadow-2xl transition-all duration-300 hover:scale-110 group cursor-pointer"
        title={isMuted ? "Activer le son" : "Couper le son"}
      >
        {isMuted ? (
            <VolumeX className="w-8 h-8 text-white" />
        ) : (
            <Volume2 className="w-8 h-8 text-amber-200" />
        )}
      </button>

    </div>
  );
}