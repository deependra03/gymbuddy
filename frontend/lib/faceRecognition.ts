const MODEL_BASE =
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const faceapi = await import('@vladmandic/face-api');
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_BASE),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_BASE),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_BASE),
    ]);
    modelsLoaded = true;
  })();

  return loadingPromise;
}

export async function captureFaceDescriptor(
  video: HTMLVideoElement
): Promise<number[] | null> {
  await loadFaceModels();
  const faceapi = await import('@vladmandic/face-api');

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;
  return Array.from(detection.descriptor);
}

export function averageDescriptors(descriptors: number[][]): number[] {
  if (descriptors.length === 0) return [];
  const len = descriptors[0].length;
  const result = new Array(len).fill(0);
  for (const d of descriptors) {
    for (let i = 0; i < len; i++) result[i] += d[i];
  }
  return result.map((v) => v / descriptors.length);
}
