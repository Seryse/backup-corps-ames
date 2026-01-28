'use client';

import React, { useEffect, useRef } from 'react';
import { LiveSession } from '@/lib/types';
import { Locale } from '@/i18n-config';

interface AudioEngineProps {
  sessionState: LiveSession | null;
  lang: Locale;
  isAdmin: boolean;
}

const INTRO_DURATION_SECONDS = 420; // 7 minutes

export default function AudioEngine({ sessionState, lang, isAdmin }: AudioEngineProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const playlistAudioRef = useRef<HTMLAudioElement | null>(null);
  const introSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const playlistSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const preloadedIntroBlobUrl = useRef<string | null>(null);
  const isPreloading = useRef(false);

  // Initialize AudioContext and nodes once
  useEffect(() => {
    const initAudio = async () => {
      if (typeof window !== 'undefined' && !audioContextRef.current) {
        try {
          const context = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = context;
          masterGainRef.current = context.createGain();
          masterGainRef.current.gain.value = 2.5; // Boost volume to help counteract ducking
          masterGainRef.current.connect(context.destination);

          // Setup Intro Audio Element
          const introAudio = new Audio();
          introAudio.crossOrigin = "anonymous";
          introAudioRef.current = introAudio;
          introSourceNodeRef.current = context.createMediaElementSource(introAudio);
          introSourceNodeRef.current.connect(masterGainRef.current);

          // Setup Playlist Audio Element
          const playlistAudio = new Audio();
          playlistAudio.crossOrigin = "anonymous";
          playlistAudioRef.current = playlistAudio;
          playlistSourceNodeRef.current = context.createMediaElementSource(playlistAudio);
          playlistSourceNodeRef.current.connect(masterGainRef.current);
          
        } catch (e) {
          console.error("Failed to create AudioContext:", e);
        }
      }
    };
    initAudio();
  }, []);

  // Preload Intro Audio
  useEffect(() => {
    const preload = async () => {
      if (!lang || preloadedIntroBlobUrl.current || isPreloading.current || isAdmin) return;
      isPreloading.current = true;
      console.log(`[AudioEngine] Preloading intro for lang: ${lang}`);
      try {
        const audioUrl = `https://firebasestorage.googleapis.com/v0/b/corps-et-ames-adc60.appspot.com/o/intros%2Fintro_${lang}.mp3?alt=media`;
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        preloadedIntroBlobUrl.current = URL.createObjectURL(blob);
        console.log("✨ [AudioEngine] Intro preloaded and cached!");
      } catch (e) {
        console.error("[AudioEngine] Preload error", e);
      } finally {
        isPreloading.current = false;
      }
    };
    preload();
  }, [lang, isAdmin]);

  // Main state machine for audio playback
  useEffect(() => {
    if (isAdmin) return; // Client-side audio logic only

    const introAudio = introAudioRef.current;
    const playlistAudio = playlistAudioRef.current;
    if (!introAudio || !playlistAudio || !sessionState) return;

    // Resume context on any state change that might lead to playback
    const resumeContext = () => {
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
    }

    switch (sessionState.status) {
      case 'INTRO':
        playlistAudio.pause();
        if (preloadedIntroBlobUrl.current && sessionState.startTime) {
          resumeContext();
          const serverTime = Date.now(); // Consider using a server time offset for more accuracy
          const elapsedSeconds = (serverTime - sessionState.startTime.toMillis()) / 1000;
          
          if (elapsedSeconds >= 0 && elapsedSeconds < INTRO_DURATION_SECONDS) {
            introAudio.src = preloadedIntroBlobUrl.current;
            introAudio.currentTime = elapsedSeconds;
            introAudio.play().catch(e => console.error("[AudioEngine] Playback failed:", e));
            // Optional fade-in
            introAudio.volume = 0;
            let vol = 0;
            const fadeIn = setInterval(() => {
              if (vol >= 1) clearInterval(fadeIn);
              vol += 0.1;
              if(introAudio) introAudio.volume = Math.min(vol, 1);
            }, 200);
          } else {
            console.log("[AudioEngine] Intro already finished.");
          }
        }
        break;
      
      case 'HEALING':
        introAudio.pause();
        if (sessionState.activePlaylistUrl) {
          resumeContext();
          if (playlistAudio.src !== sessionState.activePlaylistUrl) {
            playlistAudio.src = sessionState.activePlaylistUrl;
          }
          playlistAudio.play().catch(e => console.error("[AudioEngine] Playlist playback failed:", e));
        }
        break;

      case 'WAITING':
      case 'OUTRO':
      default:
        introAudio.pause();
        playlistAudio.pause();
        break;
    }

  }, [sessionState, isAdmin]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      introAudioRef.current?.pause();
      playlistAudioRef.current?.pause();
      if (preloadedIntroBlobUrl.current) {
        URL.revokeObjectURL(preloadedIntroBlobUrl.current);
      }
    };
  }, []);

  return null;
}
