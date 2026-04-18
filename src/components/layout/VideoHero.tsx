'use client';

import React, { useState, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface VideoHeroProps {
  videoUrl: string;
  buttonPosition?: string;
}

export default function VideoHero({ videoUrl, buttonPosition = 'bottom-10 right-10' }: VideoHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  const toggleAudio = () => {
    if (videoRef.current) {
      const newMutedState = !videoRef.current.muted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  // Ne rien afficher si aucune URL de vidéo n'est fournie.
  if (!videoUrl) {
    return null;
  }

  return (
    <div className="relative h-[85vh] w-full overflow-hidden bg-slate-900">
      {/* --- VIDÉO DE FOND --- */}
      <video 
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
        autoPlay 
        loop 
        muted={isMuted} // L'état initial est géré par React
        playsInline
        key={videoUrl} // Important pour forcer le re-rendu si l'URL change
      >
        <source src={videoUrl} type="video/mp4" />
        Votre navigateur ne supporte pas la vidéo.
      </video>

      {/* --- Dégradé bas --- */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10 opacity-60" />

      {/* --- BOUTON SON --- */}
      <button 
        onClick={toggleAudio}
        className={`absolute z-20 p-4 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 shadow-2xl transition-all duration-300 hover:scale-110 group cursor-pointer ${buttonPosition}`}
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
