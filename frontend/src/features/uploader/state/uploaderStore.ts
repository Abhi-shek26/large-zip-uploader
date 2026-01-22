import { create } from 'zustand';
import type { UploadState, Chunk } from './types';
import { calculateFileHash } from '../utils/fingerprint';
import { performUpload } from '../api/uploaderApi';

// Constants
const CHUNK_SIZE = 5 * 1024 * 1024; 

export const useUploaderStore = create<UploadState>((set, get) => ({
  file: null,
  uploadId: null,
  status: 'IDLE',
  totalSize: 0,
  startTime: null,
  uploadedBytes: 0,
  currentSpeed: 0,
  chunks: [],
  finalHash: null,
  filesInZip: [],

  setFile: (file) => {
    // Generate chunk map immediately
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const chunks: Chunk[] = Array.from({ length: totalChunks }, (_, i) => ({
      index: i,
      start: i * CHUNK_SIZE,
      end: Math.min((i + 1) * CHUNK_SIZE, file.size),
      status: 'PENDING',
      progress: 0,
      retryCount: 0,
    }));

    set({ 
      file, 
      totalSize: file.size, 
      chunks, 
      status: 'IDLE',
      uploadedBytes: 0 
    });
  },

  startUpload: async () => {
    const { file } = get();
    if (!file) return;

    set({ status: 'HASHING' });
    
    try {
      // 1. Handshake Hash
      const fileHash = await calculateFileHash(file);
      
      set({ status: 'UPLOADING', startTime: Date.now() });

      // 2. Trigger the upload orchestrator
      await performUpload(file, fileHash, get, set);

    } catch (err) {
      console.error(err);
      set({ status: 'FAILED' });
    }
  },

  pauseUpload: () => set({ status: 'PAUSED' }),
  
  resumeUpload: () => {
    set({ status: 'UPLOADING' });
    const { file, finalHash } = get();
    // Re-trigger upload loop; it will skip Success chunks automatically
    if (file && finalHash) {
        get().startUpload(); 
    }
  },

  updateChunkProgress: (index, loaded) => {
    set((state) => {
      const chunks = [...state.chunks];
      chunks[index].progress = loaded; // Update specific chunk
      
      // Re-calculate global stats
      const totalUploaded = chunks.reduce((acc, c) => acc + (c.status === 'SUCCESS' ? (c.end - c.start) : c.progress), 0);
      
      // Speed calc
      const now = Date.now();
      const timeElapsed = (now - (state.startTime || now)) / 1000;
      const speed = timeElapsed > 0 ? totalUploaded / timeElapsed : 0;

      return { chunks, uploadedBytes: totalUploaded, currentSpeed: speed };
    });
  },

  setChunkStatus: (index, status) => {
    set((state) => {
      const chunks = [...state.chunks];
      chunks[index].status = status;
      return { chunks };
    });
  }
}));
