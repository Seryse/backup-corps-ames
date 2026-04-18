'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import {
  collection, doc, setDoc, deleteDoc,
  onSnapshot, serverTimestamp
} from 'firebase/firestore';

export type Participant = {
  userId: string;
  displayName: string;
  trackName: string;
  cfSessionId: string;
  stream: MediaStream | null;
  isActive: boolean;
};

type UseParticipantsOptions = {
  sessionId: string;
  timeSlotId: string;
  isAdmin: boolean;
  userId: string | null;
  displayName: string;
};

const CF_APP_ID = process.env.NEXT_PUBLIC_CF_APP_ID!;
const CF_API_TOKEN = process.env.NEXT_PUBLIC_CF_API_TOKEN!;
const CF_BASE = `https://rtc.live.cloudflare.com/v1/apps/${CF_APP_ID}`;

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
    throw new Error(`CF ${method} ${path} → ${res.status}: ${err}`);
  }
  return res.json();
}

export function useParticipants({
  sessionId,
  timeSlotId,
  isAdmin,
  userId,
  displayName,
}: UseParticipantsOptions) {
  const firestore = useFirestore();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const streamsRef = useRef<Map<string, MediaStream>>(new Map());

  // ── CLIENT : publier sa caméra dans Firestore ──────────────────────────────
  const publishCamera = useCallback(async (cfSessionId: string, trackName: string) => {
    if (!firestore || !userId) return;
    await setDoc(
      doc(firestore, 'sessions', sessionId, 'participants', userId),
      {
        userId,
        displayName,
        trackName,
        cfSessionId,
        isActive: true,
        joinedAt: serverTimestamp(),
      }
    );
    console.log(`✅ Caméra publiée dans Firestore — track: ${trackName}`);
  }, [firestore, sessionId, userId, displayName]);

  // ── CLIENT : se retirer de Firestore au départ ─────────────────────────────
  const unpublishCamera = useCallback(async () => {
    if (!firestore || !userId) return;
    await deleteDoc(doc(firestore, 'sessions', sessionId, 'participants', userId));
  }, [firestore, sessionId, userId]);

  // ── PRATICIEN : écouter les participants et pull leurs caméras ─────────────
  useEffect(() => {
    if (!isAdmin || !firestore) return;

    const participantsRef = collection(firestore, 'sessions', sessionId, 'participants');

    const unsubscribe = onSnapshot(participantsRef, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        const data = change.doc.data() as Omit<Participant, 'stream'>;

        if (change.type === 'added' || change.type === 'modified') {
          // Éviter de re-puller si déjà connecté
          if (peersRef.current.has(data.userId)) continue;

          try {
            // Créer une session CF pour recevoir ce participant
            const peer = new RTCPeerConnection({
              iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
              bundlePolicy: 'max-bundle',
            });

            const incomingStream = new MediaStream();
            streamsRef.current.set(data.userId, incomingStream);
            peersRef.current.set(data.userId, peer);

            peer.ontrack = (event) => {
              event.streams[0]?.getTracks().forEach(t => incomingStream.addTrack(t));
              setParticipants(prev => prev.map(p =>
                p.userId === data.userId
                  ? { ...p, stream: new MediaStream(incomingStream.getTracks()) }
                  : p
              ));
            };

            // Ajouter le participant à la liste
            setParticipants(prev => {
              const exists = prev.find(p => p.userId === data.userId);
              if (exists) return prev;
              return [...prev, { ...data, stream: null }];
            });

            const videoRecv = peer.addTransceiver('video', { direction: 'recvonly' });
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);

            const sessionData = await cfRequest('POST', '/sessions/new', {
              sessionDescription: { type: offer.type, sdp: offer.sdp },
            });

            const adminSessionId = sessionData.sessionId as string;
            await peer.setRemoteDescription(
              new RTCSessionDescription(sessionData.sessionDescription)
            );

            const pullData = await cfRequest('POST', `/sessions/${adminSessionId}/tracks/new`, {
              tracks: [{
                location: 'remote',
                trackName: data.trackName,
                mid: videoRecv.mid,
                sessionId: data.cfSessionId,
              }],
            });

            if (pullData.requiresImmediateRenegotiation) {
              await peer.setRemoteDescription(
                new RTCSessionDescription(pullData.sessionDescription)
              );
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              await cfRequest('PUT', `/sessions/${adminSessionId}/renegotiate`, {
                sessionDescription: { type: answer.type, sdp: answer.sdp },
              });
            }

            console.log(`✅ Caméra client ${data.displayName} connectée`);

          } catch (e: any) {
            console.error(`Erreur pull caméra ${data.userId}:`, e.message);
          }

        } else if (change.type === 'removed') {
          // Nettoyer quand le client part
          const peer = peersRef.current.get(data.userId);
          if (peer) { peer.close(); peersRef.current.delete(data.userId); }
          streamsRef.current.delete(data.userId);
          setParticipants(prev => prev.filter(p => p.userId !== data.userId));
        }
      }
    });

    return () => {
      unsubscribe();
      peersRef.current.forEach(p => p.close());
      peersRef.current.clear();
      streamsRef.current.clear();
    };
  }, [isAdmin, firestore, sessionId]);

  return { participants, publishCamera, unpublishCamera };
}