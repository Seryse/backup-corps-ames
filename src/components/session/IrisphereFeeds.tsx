'use client';

import { useEffect, useRef } from 'react';
import { Loader2, VideoOff } from 'lucide-react';

// ─── Flux praticien côté client ───────────────────────────────────────────────
interface PractitionerFeedProps {
  stream: MediaStream | null;
  isConnecting: boolean;
  sessionStatus: string | undefined;
}

export function PractitionerFeed({ stream, isConnecting, sessionStatus }: PractitionerFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (stream && stream.getTracks().length > 0) {
      // ✅ Fix vidéo noire — forcer le rechargement si srcObject change
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } else {
      videoRef.current.srcObject = null;
    }
  }, [stream, stream?.id]); // ✅ Réagit aussi au changement d'ID de stream

  if (isConnecting && !stream) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-900">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm font-headline italic">Connexion à l'Irisphère...</p>
        </div>
      </div>
    );
  }

  if (!stream || stream.getTracks().length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-900">
        <div className="flex flex-col items-center gap-3 text-muted-foreground opacity-40">
          <VideoOff className="h-10 w-10" />
          <p className="text-sm">En attente du praticien...</p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-full object-cover bg-black"
    />
  );
}

// ─── Caméra individuelle d'un client ─────────────────────────────────────────
interface ClientCameraFeedProps {
  stream: MediaStream | null;
  clientName?: string;
  isActive: boolean;
}

export function ClientCameraFeed({ stream, clientName, isActive }: ClientCameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (stream && stream.getTracks().length > 0) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } else {
      videoRef.current.srcObject = null;
    }
  }, [stream, stream?.id]);

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-border/30">
      {isActive && stream && stream.getTracks().length > 0 ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <VideoOff className="h-6 w-6 text-muted-foreground opacity-30" />
        </div>
      )}
      {clientName && (
        <div className="absolute bottom-1 left-2 text-xs text-white/70 font-medium bg-black/40 px-2 py-0.5 rounded-full">
          {clientName}
        </div>
      )}
      {isActive && (
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
      )}
    </div>
  );
}

// ─── Grille de caméras clients pour le praticien ──────────────────────────────
interface ClientGridProps {
  clientStreams: Array<{
    id: string;
    name: string;
    stream: MediaStream | null;
    isActive: boolean;
  }>;
}

export function ClientGrid({ clientStreams }: ClientGridProps) {
  if (clientStreams.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-muted-foreground italic opacity-50">
        Aucun client connecté
      </div>
    );
  }

  return (
    <div className={`grid gap-2 ${
      clientStreams.length === 1 ? 'grid-cols-1' :
      clientStreams.length <= 4 ? 'grid-cols-2' :
      clientStreams.length <= 9 ? 'grid-cols-3' :
      'grid-cols-4'
    }`}>
      {clientStreams.map(client => (
        <ClientCameraFeed
          key={client.id}
          stream={client.stream}
          clientName={client.name}
          isActive={client.isActive}
        />
      ))}
    </div>
  );
}