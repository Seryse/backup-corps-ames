'use client';

import { useEffect, useRef, useState } from 'react';
import { LiveSession } from '@/lib/types';
import { Locale } from '@/i18n-config';

const INTRO_DURATION_SECONDS = 420;

export function useStreamMixer(sessionState: LiveSession | null, lang: Locale) {
  const [mixedStream, setMixedStream] = useState<MediaStreamTrack | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const playlistAudioRef = useRef<HTMLAudioElement | null>(null);

  const fixUrl = (url: string) => {
    if (!url) return "";
    return url.replace('corps-et-ames-adc60.appspot.com', 'corps-et-ames-adc60.firebasestorage.app');
  };

  const startStudio = async () => {
    if (typeof window === 'undefined' || isReady) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      // CONFIGURATION PURISTE : On force le 48kHz et le mode playback (priorité audio sur iOS)
      const ctx = new AudioContextClass({ 
        latencyHint: 'playback', 
        sampleRate: 48000 
      });
      audioContextRef.current = ctx;

      // HACK iOS : Réveil forcé du moteur audio
      if (ctx.state === 'suspended') {
        const osc = ctx.createOscillator();
        const silent = ctx.createGain();
        silent.gain.value = 0;
        osc.connect(silent);
        silent.connect(ctx.destination);
        osc.start();
        await ctx.resume();
      }

      const dest = ctx.createMediaStreamDestination();
      dest.channelCount = 2; 
      dest.channelInterpretation = 'discrete';
      destinationRef.current = dest;

      // CAPTURE RAW : On désactive absolument TOUS les traitements Google/Browser
      const micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: false, 
          noiseSuppression: false, 
          autoGainControl: false,
          // On force les flags Chrome/Android en "false" pour éviter le massacre de la musique
          // @ts-ignore
          googEchoCancellation: false,
          googAutoGainControl: false,
          googNoiseSuppression: false,
          googHighpassFilter: false,
          googTypingNoiseDetection: false,
          channelCount: 2,
          sampleRate: 48000
        } 
      });

      const micSource = ctx.createMediaStreamSource(micStream);
      micSourceRef.current = micSource;
      micSource.connect(dest);

      const musicGain = ctx.createGain();
      musicGain.gain.value = 1.2; 

      const introAudio = new Audio();
      introAudio.crossOrigin = "anonymous";
      introAudioRef.current = introAudio;
      const introSource = ctx.createMediaElementSource(introAudio);
      introSource.connect(musicGain);

      const playlistAudio = new Audio();
      playlistAudio.crossOrigin = "anonymous";
      playlistAudioRef.current = playlistAudio;
      const playlistSource = ctx.createMediaElementSource(playlistAudio);
      playlistSource.connect(musicGain);

      musicGain.connect(dest);
      
      // Monitoring local pour le praticien
      const monitor = ctx.createGain();
      monitor.gain.value = 0.5;
      musicGain.connect(monitor);
      monitor.connect(ctx.destination);

      setMixedStream(dest.stream.getAudioTracks()[0]);
      setIsReady(true);
      console.log("✅ Studio Irisphère Prêt (Mode Audio RAW / Stéréo HD)");
    } catch (err) {
      console.error("❌ Erreur accès micro ou AudioContext:", err);
    }
  };

  useEffect(() => {
    if (!isReady || !sessionState) return;

    const status = sessionState.sessionStatus;
    const intro = introAudioRef.current;
    const playlist = playlistAudioRef.current;
    if (!intro || !playlist) return;

    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const introUrl = fixUrl(`https://firebasestorage.googleapis.com/v0/b/corps-et-ames-adc60.firebasestorage.app/o/intros%2Fintro_${lang}.mp3?alt=media`);

    switch (status) {
      case 'INTRO':
        playlist.pause();
        if (intro.src !== introUrl) {
          intro.src = introUrl;
          intro.load();
        }
        
        // --- LOGIQUE DE SYNCHRO TEMPS RÉEL ---
        const startTime = (sessionState as any)?.startTime;
        const serverTime = Date.now();
        const startMillis = startTime?.toMillis ? startTime.toMillis() : (startTime?.seconds ? startTime.seconds * 1000 : serverTime);
        const elapsed = (serverTime - startMillis) / 1000;
        
        if (elapsed < INTRO_DURATION_SECONDS) {
          if (Math.abs(intro.currentTime - elapsed) > 2) intro.currentTime = elapsed > 0 ? elapsed : 0;
          intro.play().catch(e => console.error("Intro play error:", e));
        }
        break;

      case 'HEALING':
        intro.pause();
        const activeUrl = sessionState.activePlaylistUrl ? fixUrl(sessionState.activePlaylistUrl) : null;
        if (activeUrl) {
          if (playlist.src !== activeUrl) {
            playlist.src = activeUrl;
            playlist.load();
          }
          playlist.play().catch(e => console.error("Playlist play error:", e));
        }
        break;

      default:
        intro.pause();
        playlist.pause();
        break;
    }
  }, [sessionState, isReady, lang]);

  useEffect(() => {
    return () => {
      audioContextRef.current?.close();
      if (micSourceRef.current) {
        (micSourceRef.current.mediaStream as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return { mixedAudioTrack: mixedStream, startStudio, isReady };
}