import { useEffect, useRef, useState } from 'react';
import { LiveSession } from '@/lib/types'; // Vérifie le chemin
import { Locale } from '@/i18n-config';

// Durée intro
const INTRO_DURATION_SECONDS = 420;

export function useStreamMixer(sessionState: LiveSession | null, lang: Locale) {
  const [mixedStream, setMixedStream] = useState<MediaStreamTrack | null>(null);
  
  // Refs pour l'audio
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Elements Audio (Musique)
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const playlistAudioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Initialisation du Studio (Micro + Sortie)
  useEffect(() => {
    const initStudio = async () => {
      if (typeof window === 'undefined') return;

      // Création du contexte audio
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      // Destination : C'est le "tuyau" qu'on donnera à Daily
      const dest = ctx.createMediaStreamDestination();
      destinationRef.current = dest;

      // --- A. LE MICRO ---
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const micSource = ctx.createMediaStreamSource(micStream);
        micSourceRef.current = micSource;
        // Le micro va DANS le tuyau Daily, mais PAS dans tes enceintes (pour éviter l'écho)
        micSource.connect(dest);
      } catch (err) {
        console.error("Erreur accès micro:", err);
      }

      // --- B. LA MUSIQUE ---
      // Intro
      const introAudio = new Audio();
      introAudio.crossOrigin = "anonymous";
      introAudioRef.current = introAudio;
      const introSource = ctx.createMediaElementSource(introAudio);
      
      // Playlist
      const playlistAudio = new Audio();
      playlistAudio.crossOrigin = "anonymous";
      playlistAudioRef.current = playlistAudio;
      const playlistSource = ctx.createMediaElementSource(playlistAudio);

      // Branchements Musique :
      // 1. Vers Daily (pour que le client entende)
      introSource.connect(dest);
      playlistSource.connect(dest);
      
      // 2. Vers TES enceintes (pour que tu contrôles ce qui se passe)
      introSource.connect(ctx.destination);
      playlistSource.connect(ctx.destination);

      // On sauve la piste audio finale pour Daily
      setMixedStream(dest.stream.getAudioTracks()[0]);
    };

    initStudio();

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // 2. Gestion de la lecture (Copie de la logique AudioEngine mais adaptée)
  useEffect(() => {
    if (!sessionState || !introAudioRef.current || !playlistAudioRef.current) return;

    const intro = introAudioRef.current;
    const playlist = playlistAudioRef.current;
    
    // On réveille le contexte audio si besoin (chrome policy)
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    // URL de l'intro (Statique pour l'exemple, à adapter si dynamique)
    const introUrl = `https://firebasestorage.googleapis.com/v0/b/corps-et-ames-adc60.appspot.com/o/intros%2Fintro_${lang}.mp3?alt=media`;

    switch ((sessionState as any)?.status) {
      case 'INTRO':
        playlist.pause();
        if (intro.src !== introUrl) intro.src = introUrl;
        
        // Calage temporel
        const serverTime = Date.now();
        const elapsed = (serverTime - (sessionState.startTime?.toMillis() || serverTime)) / 1000;
        
        if (elapsed < INTRO_DURATION_SECONDS) {
            intro.currentTime = elapsed > 0 ? elapsed : 0;
            intro.play().catch(e => console.log("Intro play error", e));
        }
        break;

      case 'HEALING':
        intro.pause();
        if (sessionState.activePlaylistUrl) {
            if (playlist.src !== sessionState.activePlaylistUrl) {
                playlist.src = sessionState.activePlaylistUrl;
            }
            playlist.play().catch(e => console.log("Playlist play error", e));
        }
        break;

      default:
        intro.pause();
        playlist.pause();
        break;
    }
  }, [sessionState, lang]);

  return mixedStream;
}