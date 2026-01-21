'use client';

import React, { useEffect, useRef } from 'react';

interface AudioEngineProps {
  introUrl: string | undefined;
  triggerIntro: boolean | undefined;
  playlistUrl: string | undefined;
}

export default function AudioEngine({ introUrl, triggerIntro, playlistUrl }: AudioEngineProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const introPlayedRef = useRef(false);

  // We will use a single audio element and swap its source.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Initialize AudioContext
  useEffect(() => {
    const initAudioContext = () => {
        if (typeof window !== 'undefined' && !audioContextRef.current) {
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              audioContextRef.current = ctx;
              masterGainRef.current = ctx.createGain();
              masterGainRef.current.gain.value = 2.5; // Boost to counteract Apple's ducking effect.
              masterGainRef.current.connect(ctx.destination);
    
              // Create the single audio element and connect it to the graph
              const audio = new Audio();
              audio.crossOrigin = "anonymous"; // This is key for CORS
              audioRef.current = audio;
              mediaSourceNodeRef.current = ctx.createMediaElementSource(audio);
              mediaSourceNodeRef.current.connect(masterGainRef.current);
    
            } catch (e) {
              console.error("Failed to create AudioContext or Audio Element:", e);
            }
        }
    };

    initAudioContext();
  }, []);

  const playUrl = (url: string) => {
    if (!audioRef.current) return;
    
    // Resume context on play, as browsers often require a user gesture.
    if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current?.resume();
    }
    
    audioRef.current.src = url;
    audioRef.current.play().catch(e => {
        console.error(`[AudioEngine] Error playing ${url}:`, e);
    });
  }

  const stop = () => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ""; // Detach source
    }
  }

  useEffect(() => {
    if (triggerIntro && introUrl && !introPlayedRef.current) {
      introPlayedRef.current = true; // Mark as played
      playUrl(introUrl);
    }
  }, [triggerIntro, introUrl]);

  useEffect(() => {
    if (playlistUrl) {
      // When a new playlist is selected, play it. This will automatically stop the previous one.
      introPlayedRef.current = true; // Playing a playlist implies intro is done.
      playUrl(playlistUrl);
    } else {
      // If playlistUrl is cleared, stop playback.
      stop();
    }
  }, [playlistUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        stop();
        mediaSourceNodeRef.current?.disconnect();
    };
  }, []);

  return null;
}
