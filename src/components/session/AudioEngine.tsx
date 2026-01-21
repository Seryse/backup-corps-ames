'use client';

import { useEffect, useRef } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import { useUser } from '@/firebase';
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
    const audioContextRef = useRef<AudioContext | null>(null);
    const introPlayedRef = useRef(false); // Ensure intro only plays once

    const sessionRef = useMemoFirebase(() => {
        if (!firestore || !sessionId) return null;
        return doc(firestore, 'sessions', sessionId) as DocumentReference<LiveSession>;
    }, [firestore, sessionId]);

    const { data: sessionState } = useDoc<LiveSession>(sessionRef);

    // Effect for handling the anti-ducking intro
    useEffect(() => {
        if (
            sessionState?.triggerIntro &&
            !introPlayedRef.current &&
            remoteAudioStream &&
            user?.uid !== sessionState.hostId // Only run for clients, not the host
        ) {
            introPlayedRef.current = true; // Mark as played
            console.log(`[AudioEngine] Triggering intro for lang: ${lang}`);

            // Initialize Web Audio API context
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const audioContext = audioContextRef.current;
            
            // --- This is where the Web Audio API graph logic would go ---
            const playIntro = async () => {
                try {
                    // TODO: Replace with actual Firebase Storage download URL logic.
                    // This requires getting a download URL for `/intros/intro_${lang}.mp3`
                    // For now, this will fail, but it demonstrates the structure.
                    const introUrl = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/intros%2Fintro_${lang}.mp3?alt=media`;
                    console.log(`[AudioEngine] Fetching intro from: ${introUrl}`);

                    const response = await fetch(introUrl);
                    if(!response.ok) throw new Error(`Failed to fetch intro audio: ${response.statusText}`);

                    const audioData = await response.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(audioData);

                    // 1. Create source for remote stream (Admin's voice)
                    const remoteSource = audioContext.createMediaStreamSource(remoteAudioStream);
                    
                    // 2. Create source for local intro file
                    const introSource = audioContext.createBufferSource();
                    introSource.buffer = audioBuffer;

                    // 3. Create a GainNode to control volume and mix
                    const gainNode = audioContext.createGain();
                    gainNode.gain.value = 1.0; // Keep volume at 100%

                    // 4. Connect both sources to the GainNode
                    remoteSource.connect(gainNode);
                    introSource.connect(gainNode);

                    // 5. Connect the GainNode to the final destination (speakers)
                    gainNode.connect(audioContext.destination);

                    // 6. Start playing the intro
                    introSource.start(0);
                    console.log("[AudioEngine] Intro playback started.");

                    introSource.onended = () => {
                        console.log("[AudioEngine] Intro playback finished.");
                        // Disconnect to clean up the graph. The remote stream continues.
                        remoteSource.disconnect();
                        gainNode.disconnect();
                    };

                } catch (error) {
                    console.error("[AudioEngine] Error setting up or playing intro:", error);
                    // If it fails, just connect the remote stream directly to ensure user hears the admin
                    const remoteSource = audioContext.createMediaStreamSource(remoteAudioStream);
                    remoteSource.connect(audioContext.destination);
                }
            };

            playIntro();
            // --- End of Web Audio API logic ---
        }
    }, [sessionState, remoteAudioStream, lang, user]);

    // This component does not render anything to the DOM
    return null;
}
