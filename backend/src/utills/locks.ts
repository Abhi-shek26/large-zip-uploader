import { Mutex } from 'async-mutex';

// Global map to hold locks for each upload ID
const uploadLocks = new Map<string, Mutex>();

export const getUploadLock = (uploadId: string): Mutex => {
  if (!uploadLocks.has(uploadId)) {
    uploadLocks.set(uploadId, new Mutex());
  }
  return uploadLocks.get(uploadId)!;
};
