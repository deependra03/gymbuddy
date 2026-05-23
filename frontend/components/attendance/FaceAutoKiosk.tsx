'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, ScanFace, X, LogIn, LogOut } from 'lucide-react';
import { captureFaceDescriptor, loadFaceModels } from '@/lib/faceRecognition';

export type KioskEvent = {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  memberName?: string;
  action?: 'punch-in' | 'punch-out';
  time: Date;
};

type FaceAutoKioskProps = {
  active: boolean;
  fullscreen?: boolean;
  onDetect: (descriptor: number[]) => Promise<{
    success: boolean;
    memberId?: string;
    memberName?: string;
    action?: 'punch-in' | 'punch-out';
    error?: string;
    skipped?: boolean;
  }>;
  onClose: () => void;
};

const SCAN_INTERVAL_MS = 1200;
const STABLE_FRAMES = 2;
const MEMBER_COOLDOWN_MS = 45000;

export default function FaceAutoKiosk({
  active,
  fullscreen = false,
  onDetect,
  onClose,
}: FaceAutoKioskProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);
  const readyRef = useRef(false);
  const stableFramesRef = useRef(0);
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'error'>('loading');
  const [hint, setHint] = useState('Initializing...');
  const [events, setEvents] = useState<KioskEvent[]>([]);
  const [lastSuccess, setLastSuccess] = useState<{
    name: string;
    action: 'punch-in' | 'punch-out';
  } | null>(null);

  const pushEvent = useCallback((event: Omit<KioskEvent, 'id' | 'time'>) => {
    setEvents((prev) => [
      { ...event, id: `${Date.now()}-${Math.random()}`, time: new Date() },
      ...prev.slice(0, 7),
    ]);
  }, []);

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    processingRef.current = false;
    readyRef.current = false;
    stableFramesRef.current = 0;
  }, []);

  const runScan = useCallback(async () => {
    if (!videoRef.current || processingRef.current || !readyRef.current) return;

    try {
      const descriptor = await captureFaceDescriptor(videoRef.current);
      if (!descriptor) {
        stableFramesRef.current = 0;
        setHint('Waiting for face...');
        return;
      }

      stableFramesRef.current += 1;
      if (stableFramesRef.current < STABLE_FRAMES) {
        setHint('Hold still...');
        return;
      }
      stableFramesRef.current = 0;
      processingRef.current = true;
      setStatus('processing');
      setHint('Recognizing...');

      const result = await onDetectRef.current(descriptor);

      if (result.skipped) {
        setHint('Waiting for next person...');
        return;
      }

      if (result.success && result.memberId && result.memberName && result.action) {
        setLastSuccess({ name: result.memberName, action: result.action });
        pushEvent({
          type: 'success',
          message:
            result.action === 'punch-in'
              ? `${result.memberName} checked in`
              : `${result.memberName} checked out`,
          memberName: result.memberName,
          action: result.action,
        });
        setHint(`${result.memberName} — ${result.action === 'punch-in' ? 'checked in' : 'checked out'}`);
      } else if (result.error) {
        pushEvent({ type: 'error', message: result.error });
        setHint(result.error);
      }
    } catch {
      pushEvent({ type: 'error', message: 'Scan failed. Retrying...' });
      setHint('Scan failed. Retrying...');
    } finally {
      processingRef.current = false;
      setStatus('ready');
      setTimeout(() => {
        if (!processingRef.current) setHint('Look at the camera — auto check-in/out');
      }, 2000);
    }
  }, [pushEvent]);

  const startKiosk = useCallback(async () => {
    setStatus('loading');
    setHint('Loading face models...');
    try {
      await loadFaceModels();
      setHint('Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      readyRef.current = true;
      setStatus('ready');
      setHint('Look at the camera — auto check-in/out');
      scanTimerRef.current = setInterval(runScan, SCAN_INTERVAL_MS);
    } catch {
      setStatus('error');
      setHint('Camera unavailable. Allow camera permission and retry.');
    }
  }, [runScan]);

  useEffect(() => {
    if (active) {
      setEvents([]);
      setLastSuccess(null);
      startKiosk();
    } else {
      stopCamera();
      setStatus('loading');
    }
    return () => stopCamera();
  }, [active, startKiosk, stopCamera]);

  if (!active) return null;

  const shellClass = fullscreen
    ? 'fixed inset-0 z-50 bg-zinc-950 flex flex-col'
    : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80';

  const panelClass = fullscreen
    ? 'flex flex-col flex-1 min-h-0'
    : 'w-full max-w-4xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]';

  return (
    <div className={shellClass}>
      <div className={panelClass}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <ScanFace className="w-5 h-5 text-brand-500" />
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Auto Face Kiosk</h3>
              <p className="text-xs text-zinc-500">Members are checked in/out automatically</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
            aria-label="Close kiosk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`flex flex-col lg:flex-row flex-1 min-h-0 ${fullscreen ? '' : ''}`}>
          <div className="relative flex-1 bg-zinc-950 min-h-[240px] lg:min-h-[360px]">
            <video
              ref={videoRef}
              className="w-full h-full object-cover mirror"
              playsInline
              muted
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-64 rounded-[50%] border-2 border-dashed border-emerald-400/70 animate-pulse" />
            </div>
            {(status === 'loading' || status === 'processing') && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </div>
            )}
            {lastSuccess && status === 'ready' && (
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-emerald-500/95 text-white shadow-lg">
                <p className="text-lg font-bold">{lastSuccess.name}</p>
                <p className="text-sm flex items-center gap-1.5 mt-1">
                  {lastSuccess.action === 'punch-in' ? (
                    <>
                      <LogIn className="w-4 h-4" /> Checked in
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" /> Checked out
                    </>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{hint}</p>
              <p className="text-xs text-zinc-500 mt-1">
                Stand in front of the camera. No button needed.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide px-1">
                Recent activity
              </p>
              {events.length === 0 ? (
                <p className="text-xs text-zinc-500 px-1 py-4">No scans yet</p>
              ) : (
                events.map((ev) => (
                  <div
                    key={ev.id}
                    className={`text-xs px-3 py-2 rounded-lg ${
                      ev.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : ev.type === 'error'
                          ? 'bg-red-500/10 text-red-600'
                          : 'bg-zinc-500/10 text-zinc-600'
                    }`}
                  >
                    <span className="opacity-60">
                      {ev.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="ml-2">{ev.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}

export { MEMBER_COOLDOWN_MS };
