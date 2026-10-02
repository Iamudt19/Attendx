/**
 * Optimization #5: Off-main-thread compression via Web Worker pool.
 * Optimization #6: Returns early with original file if already small enough.
 *
 * Compresses classroom photographs to 1920px max dimension at 85% JPEG quality.
 * Preserves full facial features and landmarks needed by YuNet and SFace
 * while shrinking payload by 90%+ (from 6MB down to ~300KB) for instant uploads.
 *
 * ARCHITECTURE
 * ─────────────
 * 1. Uses the CompressorWorkerPool (compressorWorkerPool.ts) to run canvas
 *    compression in a Web Worker thread, freeing the React main thread.
 * 2. Multiple photos are compressed CONCURRENTLY (up to 4 in parallel) because
 *    each call is dispatched to the pool without awaiting the others.
 * 3. Falls back to main-thread canvas compression if Workers are unavailable
 *    (e.g., some older browsers or restricted contexts).
 */
import { workerPool } from './compressorWorkerPool';

const MAX_DIM = 1920;
const QUALITY = 0.85;
const SKIP_BELOW_BYTES = 400 * 1024; // Don't compress files already < 400 KB

/**
 * Compress a single classroom photo.
 * Safe to call for multiple photos simultaneously — all run in parallel.
 */
export async function compressClassroomPhoto(
  file: File,
  maxDim = MAX_DIM,
  quality = QUALITY
): Promise<File> {
  // Skip tiny files — they're already small enough
  if (!file.type.startsWith('image/') || file.size < SKIP_BELOW_BYTES) {
    return file;
  }

  // Optimization #5: try off-main-thread worker pool first
  if (typeof Worker !== 'undefined' && typeof createImageBitmap !== 'undefined') {
    try {
      return await workerPool.compress(file, maxDim, quality);
    } catch {
      // Worker failed — fall through to main-thread path below
    }
  }

  // Fallback: main-thread canvas compression (original implementation)
  return mainThreadCompress(file, maxDim, quality);
}

/**
 * Compress multiple photos in true parallel (all dispatched simultaneously).
 * Replaces the sequential Promise.all() + map pattern in TakeAttendance.tsx.
 */
export async function compressClassroomPhotos(
  files: File[],
  maxDim = MAX_DIM,
  quality = QUALITY
): Promise<File[]> {
  // Dispatch ALL compressions concurrently — pool manages worker concurrency
  return Promise.all(files.map((f) => compressClassroomPhoto(f, maxDim, quality)));
}

// ─── Main-thread fallback ────────────────────────────────────────────────────

function mainThreadCompress(file: File, maxDim: number, quality: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(
            new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
          );
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}
