'use client';

import { useEffect, useRef } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import { Locale } from '@/i18n-config';

// This should match the LiveSession entity in backend.json
interface LiveSession {
    id: string;
    triggerIntro?: boolean;
    activePlaylistUrl?: string;
    hostId: string;
}

interface AudioEngineProps {
    sessionId: string;
    remoteAudioStream: MediaStream | null; // Admin's voice stream from video SDK
    lang: Locale;
}

export default function AudioEngine({ sessionId, remoteAudioStream, lang }: AudioEngineProps) {
    const firestore = useFirestore();
    const { user } = useUser();
    const introPlayedRef = useRef(false);

    // Refs for Web Audio API nodes
    const audioContextRef = useRef<AudioContext | null>(null);
    const remoteSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const introSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const masterGainRef = useRef<GainNode | null>(null);

    const sessionRef = useMemoFirebase(() => {
        if (!firestore || !sessionId) return null;
        return doc(firestore, 'sessions', sessionId) as DocumentReference<LiveSession>;
    }, [firestore, sessionId]);

    const { data: sessionState } = useDoc<LiveSession>(sessionRef);

    useEffect(() => {
        // --- This is the user-provided logic, adapted for this component ---
        
        // 1. Initialisation du contexte au premier clic/interaction (best practice)
        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                masterGainRef.current = audioContextRef.current.createGain();
                masterGainRef.current.connect(audioContextRef.current.destination);
            } catch (e) {
                console.error("Failed to create AudioContext:", e);
                return;
            }
        }

        const ctx = audioContextRef.current;
        if (!ctx) return;

        // Anti-Ducking : On s'assure que le contexte est actif
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        // 2. Branchement du flux de l'Admin (Remote)
        if (remoteAudioStream && !remoteSourceRef.current) {
            remoteSourceRef.current = ctx.createMediaStreamSource(remoteAudioStream);
            if (masterGainRef.current) {
                remoteSourceRef.current.connect(masterGainRef.current);
            }
        }

        // 3. Gestion de l'Intro Locale
        const triggerIntro = sessionState?.triggerIntro;
        // Don't run for admin and only play once
        if (triggerIntro && user?.uid !== sessionState?.hostId && !introPlayedRef.current) {
            introPlayedRef.current = true;
            // The URL is constructed here based on the user's language
            // In a real app, you might want to hide this in an environment variable
            const introUrl = `https://firebasestorage.googleapis.com/v0/b/corps-et-ames-adc60.appspot.com/o/intros%2Fintro_${lang}.mp3?alt=media`;
            playIntro(introUrl);
        }

        async function playIntro(url: string) {
            if (!ctx || !masterGainRef.current) return;
            
            try {
                console.log(`[AudioEngine] Fetching intro from: ${url}`);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to fetch intro audio: ${response.statusText}`);

                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

                // Si une intro joue déjà, on l'arrête
                if (introSourceRef.current) {
                    introSourceRef.current.stop();
                }

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(masterGainRef.current);
                source.start(0);
                introSourceRef.current = source;
                 console.log("[AudioEngine] Intro playback started.");

                source.onended = () => {
                     console.log("[AudioEngine] Intro playback finished.");
                     introSourceRef.current = null;
                }
            } catch(error) {
                console.error("[AudioEngine] Error playing intro:", error);
            }
        }
        
    }, [remoteAudioStream, sessionState, lang, user]);

    return null; // Ce composant gère le son en arrière-plan
}