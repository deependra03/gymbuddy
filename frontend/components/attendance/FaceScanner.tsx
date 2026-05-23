'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { averageDescriptors, captureFaceDescriptor, loadFaceModels } from '@/lib/faceRecognition';

type FaceScannerProps = {
  open: boolean;
  mode: 'enroll' | 'attendance';
  title: string;
  subtitle?: string;
  samplesRequired?: number;
  onCapture: (descriptor: number[]) => void;
  onClose: () => void;
};

export default function FaceScanner({
  open,
  mode,
  title,
  subtitle,
  samplesRequired = mode === 'enroll' ? 3 : 1,
  onCapture,
  onClose,
}: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'capturing' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const samplesRef = useRef<number[][]>([]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setStatus('loading');
    setMessage('Loading face models...');
    try {
      await loadFaceModels();
      setMessage('Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      samplesRef.current = [];
      setProgress(0);
      setStatus('ready');
      setMessage(
        mode === 'enroll'
          ? `Look at the camera. Sample 1 of ${samplesRequired}`
          : 'Position your face in the frame'
      );
    } catch {
      setStatus('error');
      setMessage('Camera access denied or unavailable. Please allow camera permission.');
    }
  }, [mode, samplesRequired]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setStatus('idle');
      setMessage('');
      setProgress(0);
      samplesRef.current = [];
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const handleCapture = async () => {
    if (!videoRef.current || status !== 'ready') return;
    setStatus('capturing');
    setMessage('Detecting face...');

    try {
      const descriptor = await captureFaceDescriptor(videoRef.current);
      if (!descriptor) {
        setStatus('ready');
        setMessage('No face detected. Center your face and try again.');
        return;
      }

      if (mode === 'enroll' && samplesRequired > 1) {
        samplesRef.current.push(descriptor);
        const count = samplesRef.current.length;
        setProgress(count);
        if (count < samplesRequired) {
          setStatus('ready');
          setMessage(`Good! Sample ${count + 1} of ${samplesRequired}`);
          return;
        }
        const averaged = averageDescriptors(samplesRef.current);
        stopCamera();
        onCapture(averaged);
        return;
      }

      stopCamera();
      onCapture(descriptor);
    } catch {
      setStatus('error');
      setMessage('Face detection failed. Please try again.');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
            {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-[4/3] bg-zinc-950">
          <video
            ref={videoRef}
            className="w-full h-full object-cover mirror"
            playsInline
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-60 rounded-[50%] border-2 border-dashed border-white/60" />
          </div>
          {(status === 'loading' || status === 'capturing') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-center text-zinc-600 dark:text-zinc-400 min-h-[40px]">
            {message}
          </p>

          {mode === 'enroll' && samplesRequired > 1 && (
            <div className="flex gap-1 justify-center">
              {Array.from({ length: samplesRequired }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-8 rounded-full ${
                    i < progress ? 'bg-brand-500' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleCapture}
            disabled={status !== 'ready'}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            {mode === 'enroll' ? 'Capture Face' : 'Scan Face'}
          </button>
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
