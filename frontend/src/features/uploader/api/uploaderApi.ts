import axios from 'axios';
import pLimit from 'p-limit';
import type { UploadState } from '../state/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/uploads';

export const performUpload = async (
  file: File,
  fileHash: string,
  get: () => UploadState,
  set: (state: Partial<UploadState>) => void
) => {
  const { chunks, totalSize } = get();

  // 1. Handshake
  const { data: session } = await axios.post(`${API_URL}/handshake`, {
    filename: file.name,
    totalSize: totalSize,
    totalChunks: chunks.length,
    fileHash
  });

  const uploadId = session.uploadId;
  set({ uploadId }); // Save ID for resume

  // 2. Filter pending chunks
  const pendingChunks = chunks.filter(c => c.status !== 'SUCCESS');

  // 3. Concurrency Limit
  const limit = pLimit(3); // "Limit of 3 concurrent uploads"

  const uploadPromises = pendingChunks.map(chunk => {
    return limit(async () => {
      // Check for PAUSE
      if (get().status === 'PAUSED') return;

      const chunkData = file.slice(chunk.start, chunk.end);
      
      // Retry Logic Loop
      let attempts = 0;
      const maxRetries = 3;
      
      while (attempts < maxRetries) {
        try {
          get().setChunkStatus(chunk.index, 'UPLOADING');
          
          await axios.put(`${API_URL}/${uploadId}/chunk`, chunkData, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-Chunk-Index': chunk.index,
              'X-Chunk-Offset': chunk.start,
            },
            onUploadProgress: (e) => {
              if (e.total) {
                // Calculate bytes loaded for this chunk
                get().updateChunkProgress(chunk.index, e.loaded);
              }
            }
          });

          get().setChunkStatus(chunk.index, 'SUCCESS');
          return; // Success, exit retry loop

        } catch (err) {
          attempts++;
          console.warn(`Chunk ${chunk.index} failed (attempt ${attempts})`);
          
          if (attempts >= maxRetries) {
             get().setChunkStatus(chunk.index, 'ERROR');
             throw err;
          }
          
          // Exponential backoff
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts)));
        }
      }
    });
  });

  try {
    await Promise.all(uploadPromises);
    
    // 4. Finalize
    const allSuccess = get().chunks.every(c => c.status === 'SUCCESS');
    if (allSuccess) {
        const { data: result } = await axios.post(`${API_URL}/${uploadId}/finalize`, { fileHash })
        console.log("Finalize Response:", result);
        set({ 
            status: 'COMPLETED', 
            filesInZip: result.fileContents || [],
            finalHash: result.finalHash
        });
    } else {
        set({ status: 'FAILED' });
    }

  } catch (err) {
    set({ status: 'FAILED' });
  }
};
