/**
 * Optimization #5: Web Worker for off-main-thread image compression
 * ================================================================
 * Runs canvas-based JPEG compression in a dedicated background thread
 * so the main thread / React UI is never blocked, and multiple photos
 * can be compressed concurrently (browser spawns one worker per photo,
 * up to _MAX_CONCURRENT_WORKERS in parallel).
 *
 * HOW IT WORKS
 * ─────────────
 * The worker receives an ImageBitmap (transferred, zero-copy) plus
 * target dimensions and quality. It draws onto an OffscreenCanvas and
 * returns the compressed Blob back to the main thread via postMessage.
 *
 * USAGE (see compressClassroomPhoto in imageCompressor.ts)
 * ─────────────────────────────────────────────────────────
 * Workers are created inline via a Blob URL so no extra build config is needed.
 */

const WORKER_SCRIPT = `
self.onmessage = async function(e) {
  const { bitmap, width, height, quality, jobId } = e.data;
  try {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    self.postMessage({ jobId, blob, error: null });
  } catch (err) {
    self.postMessage({ jobId, blob: null, error: String(err) });
  }
};
`;

// Singleton worker pool — reuse workers across calls to avoid spawn overhead
const _MAX_CONCURRENT_WORKERS = 4;
let _workerBlobUrl: string | null = null;

function getWorkerBlobUrl(): string {
  if (!_workerBlobUrl) {
    const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
    _workerBlobUrl = URL.createObjectURL(blob);
  }
  return _workerBlobUrl;
}

interface WorkerJob {
  jobId: string;
  resolve: (blob: Blob) => void;
  reject: (err: Error) => void;
}

class CompressorWorkerPool {
  private workers: Worker[] = [];
  private queue: Array<{ file: File; maxDim: number; quality: number; resolve: (f: File) => void; reject: (e: Error) => void }> = [];
  private activeCount = 0;

  private ensureWorkers() {
    while (this.workers.length < _MAX_CONCURRENT_WORKERS) {
      try {
        const w = new Worker(getWorkerBlobUrl());
        w.onmessage = null; // will be set per-job
        this.workers.push(w);
      } catch {
        break; // Web Workers not supported — fall back gracefully
      }
    }
  }

  compress(file: File, maxDim: number, quality: number): Promise<File> {
    return new Promise((resolve, reject) => {
      this.queue.push({ file, maxDim, quality, resolve, reject });
      this.drain();
    });
  }

  private drain() {
    this.ensureWorkers();
    while (this.activeCount < this.workers.length && this.queue.length > 0) {
      const job = this.queue.shift()!;
      const worker = this.workers[this.activeCount % this.workers.length];
      this.activeCount++;
      this.runJob(worker, job).finally(() => {
        this.activeCount--;
        this.drain();
      });
    }
  }

  private async runJob(
    worker: Worker,
    { file, maxDim, quality, resolve, reject }: typeof this.queue[0]
  ) {
    try {
      const bitmap = await createImageBitmap(file);
      let { width, height } = bitmap;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const jobId = `${Date.now()}-${Math.random()}`;

      const resultBlob = await new Promise<Blob>((res, rej) => {
        const handler = (e: MessageEvent) => {
          if (e.data.jobId !== jobId) return;
          worker.removeEventListener('message', handler);
          if (e.data.error) rej(new Error(e.data.error));
          else res(e.data.blob as Blob);
        };
        worker.addEventListener('message', handler);
        // Transfer bitmap ownership to worker (zero-copy)
        worker.postMessage({ bitmap, width, height, quality, jobId }, [bitmap as any]);
      });

      const compressed = new File(
        [resultBlob],
        file.name.replace(/\.[^/.]+$/, '') + '.jpg',
        { type: 'image/jpeg', lastModified: Date.now() }
      );
      resolve(compressed);
    } catch (err) {
      // Worker failed — fall through to main-thread compression
      reject(err as Error);
    }
  }
}

// Singleton pool
const workerPool = new CompressorWorkerPool();

export { workerPool };
