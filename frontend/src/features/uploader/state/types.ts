export type ChunkStatus = 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'ERROR';

export interface Chunk {
  index: number;
  start: number;
  end: number;
  status: ChunkStatus;
  progress: number;
  retryCount: number;
}

export interface UploadState {
  file: File | null;
  uploadId: string | null;
  status: 'IDLE' | 'HASHING' | 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  
  // Stats
  totalSize: number;
  startTime: number | null;
  uploadedBytes: number;
  currentSpeed: number; // bytes per second
  
  // The Grid
  chunks: Chunk[];
  
  // Final Result
  finalHash: string | null;
  filesInZip: string[];

  // Actions
  setFile: (file: File) => void;
  startUpload: () => Promise<void>;
  pauseUpload: () => void;
  resumeUpload: () => void;
  updateChunkProgress: (index: number, loaded: number) => void;
  setChunkStatus: (index: number, status: ChunkStatus) => void;
}
