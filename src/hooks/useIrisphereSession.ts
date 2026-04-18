'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const CF_APP_ID = process.env.NEXT_PUBLIC_CF_APP_ID!;
const CF_API_TOKEN = process.env.NEXT_PUBLIC_CF_API_TOKEN!;
const CF_BASE = `https://rtc.live.cloudflare.com/v1/apps/${CF_APP_ID}`;

export type SessionRole = 'practitioner' | 'client';

type UseIrisphereSessionOptions = {
  role: SessionRole;
  timeSlotId: string;
  mixedAudioTrack?: MediaStreamTrack | null;
  videoTrack?: MediaStreamTrack | null;
  practitionerCfSessionId?: string | null;
};

type UseIrisphereSessionReturn = {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  practitionerStream: MediaStream | null;
  cfSessionId: string | null;
  startBroadcast: () => Promise<void>;
  stopBroadcast: () => void;
  startClientCamera: () => Promise<void>;
  stopClientCamera: () => void;
  clientCameraActive: boolean;
};

async function cfRequest(method: 'POST' | 'PUT', path: string, body: object) {
  const res = await fetch(`${CF_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CF_API_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudflare ${method} ${path} → ${res.status}: ${err}`);
  }
  return res.json();
}

// ✅ Anti-veille iOS — joue un silence toutes les 20s pour garder l'AudioContext actif
// Ne force PAS le haut-parleur — respecte les écouteurs si branchés
function keepAudioAlive(audioContext: AudioContext) {
  const silentBuffer = audioContext.createBuffer(1, 1, 22050);
  const source = audioContext.createBufferSource();
  source.buffer = silentBuffer;
  source.connect(audioContext.destination);
  source.start();
  source.onended = () => {
    setTimeout(() => {
      if (audioContext.state !== 'closed') keepAudioAlive(audioContext);
    }, 20000);
  };
}

export function useIrisphereSession({
  role,
  timeSlotId,
  mixedAudioTrack,
  videoTrack,
  practitionerCfSessionId,
}: UseIrisphereSessionOptions): UseIrisphereSessionReturn {

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [practitionerStream, setPractitionerStream] = useState<MediaStream | null>(null);
  const [clientCameraActive, setClientCameraActive] = useState(false);
  const [cfSessionId, setCfSessionId] = useState<string | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const clientCameraStreamRef = useRef<MediaStream | null>(null);
  const isBroadcastingRef = useRef(false);
  const isClientConnectingRef = useRef(false);
  const keepAliveCtxRef = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (clientCameraStreamRef.current) {
      clientCameraStreamRef.current.getTracks().forEach(t => t.stop());
      clientCameraStreamRef.current = null;
    }
    if (keepAliveCtxRef.current) {
      keepAliveCtxRef.current.close().catch(() => {});
      keepAliveCtxRef.current = null;
    }
    isBroadcastingRef.current = false;
    isClientConnectingRef.current = false;
    setIsConnected(false);
    setClientCameraActive(false);
    setPractitionerStream(null);
    setCfSessionId(null);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const createPeer = useCallback((): RTCPeerConnection => {
    return new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
      bundlePolicy: 'max-bundle',
    });
  }, []);

  const renegotiate = useCallback(async (peer: RTCPeerConnection, sessionId: string) => {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const data = await cfRequest('PUT', `/sessions/${sessionId}/renegotiate`, {
      sessionDescription: { type: offer.type, sdp: offer.sdp },
    });
    await peer.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRATICIEN — Broadcast
  // ═══════════════════════════════════════════════════════════════════════════
  const startBroadcast = useCallback(async () => {
    if (isBroadcastingRef.current) {
      console.log('⚠️ Broadcast déjà en cours, ignoré');
      return;
    }
    if (!mixedAudioTrack || !videoTrack) {
      setError('Mix audio ou caméra non disponible');
      return;
    }
    if (isConnecting || isConnected) return;

    isBroadcastingRef.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      const peer = createPeer();
      peerRef.current = peer;

      const audioTrackName = `${timeSlotId}_audio`;
      const videoTrackName = `${timeSlotId}_video`;

      const audioTransceiver = peer.addTransceiver(mixedAudioTrack, {
        direction: 'sendonly',
        sendEncodings: [{ maxBitrate: 320000, priority: 'high' }],
      });
      const videoTransceiver = peer.addTransceiver(videoTrack, {
        direction: 'sendonly',
        sendEncodings: [{ maxBitrate: 2500000 }],
      });

      // ✅ mid assignés APRÈS setLocalDescription
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const audioMid = audioTransceiver.mid;
      const videoMid = videoTransceiver.mid;
      console.log(`🔍 Mid audio: ${audioMid}, Mid video: ${videoMid}`);

      if (!audioMid || !videoMid) {
        throw new Error(`Mid null — audio: ${audioMid}, video: ${videoMid}`);
      }

      const sessionData = await cfRequest('POST', '/sessions/new', {
        sessionDescription: { type: offer.type, sdp: offer.sdp },
      });

      const sessionId = sessionData.sessionId as string;
      setCfSessionId(sessionId);

      await peer.setRemoteDescription(
        new RTCSessionDescription(sessionData.sessionDescription)
      );

      const tracksData = await cfRequest('POST', `/sessions/${sessionId}/tracks/new`, {
        tracks: [
          { location: 'local', mid: audioMid, trackName: audioTrackName },
          { location: 'local', mid: videoMid, trackName: videoTrackName },
        ],
      });

      console.log(`📦 Tracks response: ${JSON.stringify(tracksData)}`);

      if (tracksData.requiresImmediateRenegotiation) {
        await renegotiate(peer, sessionId);
      }

      setIsConnected(true);
      setIsConnecting(false);
      console.log(`✅ Broadcast actif — timeSlot: ${timeSlotId} — CF session: ${sessionId}`);

    } catch (err: any) {
      setError(`Erreur broadcast: ${err.message}`);
      setIsConnecting(false);
      isBroadcastingRef.current = false;
      cleanup();
    }
  }, [mixedAudioTrack, videoTrack, timeSlotId, isConnecting, isConnected, createPeer, renegotiate, cleanup]);

  const stopBroadcast = useCallback(() => { cleanup(); }, [cleanup]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENT — Pull + anti-veille iOS
  // ═══════════════════════════════════════════════════════════════════════════
  const startClientCamera = useCallback(async () => {
    if (isClientConnectingRef.current) {
      console.log('⚠️ Client déjà en cours de connexion, ignoré');
      return;
    }
    if (!practitionerCfSessionId) {
      console.log('⏳ En attente du sessionId CF du praticien...');
      return;
    }
    if (isConnecting || isConnected) return;

    isClientConnectingRef.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      // ✅ Anti-veille iOS — mode playback, respecte écouteurs/haut-parleur
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx({ latencyHint: 'playback' });
        keepAliveCtxRef.current = ctx;
        if (ctx.state === 'suspended') await ctx.resume();
        keepAudioAlive(ctx);
        console.log('✅ AudioContext keepalive actif (mode playback)');
      } catch(e) {
        console.warn('Keepalive audio non disponible:', e);
      }

      const peer = createPeer();
      peerRef.current = peer;

      const incomingStream = new MediaStream();
      setPractitionerStream(incomingStream);

      peer.ontrack = (event) => {
        console.log(`🎵 Track reçue: ${event.track.kind}`);
        event.streams[0]?.getTracks().forEach(track => incomingStream.addTrack(track));
        setPractitionerStream(new MediaStream(incomingStream.getTracks()));
      };

      const audioRecv = peer.addTransceiver('audio', { direction: 'recvonly' });
      const videoRecv = peer.addTransceiver('video', { direction: 'recvonly' });

      const pullOffer = await peer.createOffer();
      await peer.setLocalDescription(pullOffer);

      const audioMid = audioRecv.mid;
      const videoMid = videoRecv.mid;
      console.log(`🔍 Client mid audio: ${audioMid}, video: ${videoMid}`);

      if (!audioMid || !videoMid) {
        throw new Error(`Mid null côté client — audio: ${audioMid}, video: ${videoMid}`);
      }

      const sessionData = await cfRequest('POST', '/sessions/new', {
        sessionDescription: { type: pullOffer.type, sdp: pullOffer.sdp },
      });

      const clientSessionId = sessionData.sessionId as string;
      setCfSessionId(clientSessionId);

      await peer.setRemoteDescription(
        new RTCSessionDescription(sessionData.sessionDescription)
      );

      // ✅ Délai 3s — laisser le praticien finir de publier ses tracks
      console.log('⏳ Attente publication tracks praticien (3s)...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log(`🔗 Pull depuis session CF praticien: ${practitionerCfSessionId}`);
      const pullData = await cfRequest('POST', `/sessions/${clientSessionId}/tracks/new`, {
        tracks: [
          {
            location: 'remote',
            trackName: `${timeSlotId}_audio`,
            mid: audioMid,
            sessionId: practitionerCfSessionId,
          },
          {
            location: 'remote',
            trackName: `${timeSlotId}_video`,
            mid: videoMid,
            sessionId: practitionerCfSessionId,
          },
        ],
      });

      console.log(`📦 Pull response: ${JSON.stringify(pullData)}`);

      if (pullData.requiresImmediateRenegotiation) {
        if (pullData.sessionDescription?.type === 'offer') {
          await peer.setRemoteDescription(
            new RTCSessionDescription(pullData.sessionDescription)
          );
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          await cfRequest('PUT', `/sessions/${clientSessionId}/renegotiate`, {
            sessionDescription: { type: answer.type, sdp: answer.sdp },
          });
          console.log('✅ Renegociation client terminée');
        }
      }

      // ── Caméra client SANS AUDIO — anti-ducking iOS ───────────────────────
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      clientCameraStreamRef.current = camStream;

      const camTrack = camStream.getVideoTracks()[0];
      const clientVideoTransceiver = peer.addTransceiver(camTrack, {
        direction: 'sendonly',
        sendEncodings: [{ maxBitrate: 500000 }],
      });

      const camOffer = await peer.createOffer();
      await peer.setLocalDescription(camOffer);

      const camMid = clientVideoTransceiver.mid;
      console.log(`🔍 Cam mid: ${camMid}`);

      if (!camMid) throw new Error('Mid caméra null');

      const camData = await cfRequest('POST', `/sessions/${clientSessionId}/tracks/new`, {
        tracks: [{
          location: 'local',
          mid: camMid,
          trackName: `${timeSlotId}_client_${clientSessionId}_video`,
        }],
        sessionDescription: { type: camOffer.type, sdp: camOffer.sdp },
      });

      if (camData.sessionDescription) {
        await peer.setRemoteDescription(
          new RTCSessionDescription(camData.sessionDescription)
        );
      }

      if (camData.requiresImmediateRenegotiation) {
        await renegotiate(peer, clientSessionId);
      }

      setIsConnected(true);
      setIsConnecting(false);
      setClientCameraActive(true);
      console.log(`✅ Client connecté — pull depuis: ${practitionerCfSessionId}`);

    } catch (err: any) {
      setError(`Erreur connexion: ${err.message}`);
      setIsConnecting(false);
      isClientConnectingRef.current = false;
      cleanup();
    }
  }, [timeSlotId, practitionerCfSessionId, isConnecting, isConnected, createPeer, renegotiate, cleanup]);

  const stopClientCamera = useCallback(() => {
    if (clientCameraStreamRef.current) {
      clientCameraStreamRef.current.getTracks().forEach(t => t.stop());
      clientCameraStreamRef.current = null;
    }
    isClientConnectingRef.current = false;
    setClientCameraActive(false);
  }, []);

  return {
    isConnected, isConnecting, error, practitionerStream,
    cfSessionId,
    startBroadcast, stopBroadcast,
    startClientCamera, stopClientCamera, clientCameraActive,
  };
}