/**
 * Compresses classroom photographs while preserving facial detail for YuNet + SFace.
 *
 * Key constraints:
 *  - JPEG quality ≥ 0.92 — face edges and landmarks must survive compression.
 *    Lower quality causes block artifacts that degrade Laplacian blur scores and
 *    reduce YuNet landmark confidence, triggering the Haar cascade fallback path.
 *  - Max dimension 2048px — enough for a 30-student classroom photo with ~80px
 *    faces, without sending 6 MB originals over the network.
 *  - Skip compression for already-small files to avoid a re-encode quality loss.
 */
export async function compressClassroomPhoto(
  file: File,
  maxDim = 2048,
  quality = 0.92
): Promise<File> {
  // Skip re-compression for small files — a second JPEG encode always loses quality
  if (!file.type.startsWith('image/') || file.size < 600 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Downscale only if larger than maxDim — never upscale
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

      // High-quality bicubic resampling preserves face edge sharpness
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          // If compression didn't reduce size, keep original to avoid quality loss
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, '') + '.jpg',
            { type: 'image/jpeg', lastModified: Date.now() }
          );
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      resolve(file);
    };

    img.src = url;
  });
}
