'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Participant } from '@/hooks/useParticipants';
import { VideoOff, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Composant vidéo individuel ───────────────────────────────────────────────
function ParticipantVideo({
  participant,
  onClick,
  className = '',
}: {
  participant: Participant;
  onClick?: () => void;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer hover:border-accent/40 transition-all ${className}`}
      onClick={onClick}
    >
      {participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center min-h-[80px]">
          <VideoOff className="h-5 w-5 text-white/20" />
        </div>
      )}
      <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between">
        <span className="text-xs text-white/70 bg-black/40 px-2 py-0.5 rounded-full truncate max-w-[80%]">
          {participant.displayName}
        </span>
        {participant.stream && (
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
        )}
      </div>
    </div>
  );
}

// ─── Grille principale ────────────────────────────────────────────────────────
const PAGE_SIZE = 16; // 4x4
const ROTATION_INTERVAL = 20000; // 20 secondes
const SIDEBAR_SIZE = 8;

export default function ParticipantGrid({
  participants,
}: {
  participants: Participant[];
}) {
  const [page, setPage] = useState(0);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [sidebarPage, setSidebarPage] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalPages = Math.ceil(participants.length / PAGE_SIZE);

  // ── Rotation automatique ───────────────────────────────────────────────────
  const startRotation = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!focusedId) {
        setPage(prev => (prev + 1) % Math.max(totalPages, 1));
      } else {
        setSidebarPage(prev => {
          const sidebarParticipants = participants.filter(p => p.userId !== focusedId);
          const sidebarPages = Math.ceil(sidebarParticipants.length / SIDEBAR_SIZE);
          return (prev + 1) % Math.max(sidebarPages, 1);
        });
      }
    }, ROTATION_INTERVAL);
  }, [focusedId, totalPages, participants]);

  useEffect(() => {
    startRotation();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startRotation]);

  // Reset page si participants changent
  useEffect(() => {
    if (page >= totalPages && totalPages > 0) setPage(totalPages - 1);
  }, [participants.length, totalPages, page]);

  if (participants.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm italic opacity-50">
        En attente des participants...
      </div>
    );
  }

  // ── MODE FOCUS ─────────────────────────────────────────────────────────────
  if (focusedId) {
    const focused = participants.find(p => p.userId === focusedId);
    const sidebar = participants.filter(p => p.userId !== focusedId);
    const sidebarPages = Math.ceil(sidebar.length / SIDEBAR_SIZE);
    const sidebarVisible = sidebar.slice(
      sidebarPage * SIDEBAR_SIZE,
      (sidebarPage + 1) * SIDEBAR_SIZE
    );

    return (
      <div className="flex gap-2 h-full">
        {/* Vidéo principale */}
        <div className="flex-1">
          {focused && (
            <ParticipantVideo
              participant={focused}
              onClick={() => setFocusedId(null)}
              className="h-full"
            />
          )}
          <p className="text-xs text-muted-foreground text-center mt-1 opacity-50">
            Cliquer pour revenir à la grille
          </p>
        </div>

        {/* Sidebar */}
        <div className="w-32 flex flex-col gap-1.5">
          <div className="flex-1 flex flex-col gap-1.5">
            {sidebarVisible.map(p => (
              <ParticipantVideo
                key={p.userId}
                participant={p}
                onClick={() => setFocusedId(p.userId)}
                className="flex-1"
              />
            ))}
          </div>
          {sidebarPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => setSidebarPage(prev => (prev - 1 + sidebarPages) % sidebarPages)}
                className="p-1 rounded bg-white/5 hover:bg-white/10"
              >
                <ChevronLeft className="h-3 w-3 text-white/50" />
              </button>
              <span className="text-xs text-white/30">{sidebarPage + 1}/{sidebarPages}</span>
              <button
                onClick={() => setSidebarPage(prev => (prev + 1) % sidebarPages)}
                className="p-1 rounded bg-white/5 hover:bg-white/10"
              >
                <ChevronRight className="h-3 w-3 text-white/50" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── MODE GRILLE 4x4 ────────────────────────────────────────────────────────
  const visible = participants.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const cols = visible.length <= 4 ? 2 :
               visible.length <= 9 ? 3 : 4;

  return (
    <div className="flex flex-col gap-2 h-full">
      <div
        className="flex-1 grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {visible.map(p => (
          <ParticipantVideo
            key={p.userId}
            participant={p}
            onClick={() => { setFocusedId(p.userId); setSidebarPage(0); }}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-1">
          <button
            onClick={() => setPage(prev => (prev - 1 + totalPages) % totalPages)}
            className="p-1 rounded bg-white/5 hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4 text-white/50" />
          </button>
          <span className="text-xs text-white/40">
            {page + 1} / {totalPages}
            <span className="ml-2 opacity-50">↻ auto</span>
          </span>
          <button
            onClick={() => setPage(prev => (prev + 1) % totalPages)}
            className="p-1 rounded bg-white/5 hover:bg-white/10"
          >
            <ChevronRight className="h-4 w-4 text-white/50" />
          </button>
        </div>
      )}
    </div>
  );
}