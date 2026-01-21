'use client';

import React, { useEffect, useRef } from 'react';

interface AudioEngineProps {
  remoteStream: MediaStream | null;
  introUrl: string | undefined;
  triggerIntro: boolean | undefined;
}

export default function AudioEngine({ remoteStream, introUrl, triggerIntro }: AudioEngineProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const remoteSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const introSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const introPlayedRef = useRef(false); // To ensure intro plays only once

  useEffect(() => {
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
    if (remoteStream && !remoteSourceRef.current) {
        try {
            remoteSourceRef.current = ctx.createMediaStreamSource(remoteStream);
            if (masterGainRef.current) {
                remoteSourceRef.current.connect(masterGainRef.current);
            }
        } catch(e) {
            console.error("Error connecting remote stream to AudioContext:", e);
        }
    }

    // 3. Gestion de l'Intro Locale
    if (triggerIntro && introUrl && !introPlayedRef.current) {
      introPlayedRef.current = true; // Play only once
      playIntro(introUrl);
    }

    async function playIntro(url: string) {
        if (!ctx || !masterGainRef.current) return;
        try {
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

            source.onended = () => {
                introSourceRef.current = null;
            }
        } catch(error) {
            console.error("[AudioEngine] Error playing intro:", error);
        }
    }

  }, [remoteStream, triggerIntro, introUrl]);

  return null; // Ce composant gère le son en arrière-plan
};
