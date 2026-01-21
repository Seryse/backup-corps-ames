'use client';

import React, { useEffect, useRef } from 'react';

interface AudioEngineProps {
  introUrl: string | undefined;
  triggerIntro: boolean | undefined;
  playlistUrl: string | undefined;
}

export default function AudioEngine({ introUrl, triggerIntro, playlistUrl }: AudioEngineProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const introSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playlistSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const introPlayedRef = useRef(false);

  // Initialize AudioContext on first user interaction or prop change
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = ctx;
          masterGainRef.current = ctx.createGain();
          masterGainRef.current.connect(ctx.destination);
        } catch (e) {
          console.error("Failed to create AudioContext:", e);
        }
      }
      // Ensure context is running to prevent ducking
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };
    initAudioContext();
  }, [triggerIntro, playlistUrl]);

  const playAudio = async (url: string, sourceRef: React.MutableRefObject<AudioBufferSourceNode | null>) => {
    const ctx = audioContextRef.current;
    if (!ctx || !masterGainRef.current) return;

    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
      sourceRef.current = null;
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(masterGainRef.current);
      source.start(0);
      sourceRef.current = source;

      source.onended = () => {
        if (sourceRef.current === source) {
            sourceRef.current = null;
        }
      }
    } catch(error) {
        console.error("[AudioEngine] Error playing audio from URL:", url, error);
    }
  };

  useEffect(() => {
    if (triggerIntro && introUrl && !introPlayedRef.current) {
      introPlayedRef.current = true;
      if (playlistSourceRef.current) {
        try { playlistSourceRef.current.stop(); } catch(e) {}
        playlistSourceRef.current = null;
      }
      playAudio(introUrl, introSourceRef);
    }
  }, [triggerIntro, introUrl]);

  useEffect(() => {
    if (playlistUrl) {
      if (introSourceRef.current) {
        try { introSourceRef.current.stop(); } catch(e) {}
        introSourceRef.current = null;
      }
      playAudio(playlistUrl, playlistSourceRef);
    } else {
        if (playlistSourceRef.current) {
            try { playlistSourceRef.current.stop(); } catch(e) {}
            playlistSourceRef.current = null;
        }
    }
  }, [playlistUrl]);

  return null;
}
