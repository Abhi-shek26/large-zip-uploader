import { prisma } from '../db/prisma';
import { UploadStatus } from '@prisma/client';

export const initUploadSession = async (
  filename: string,
  totalSize: number, 
  totalChunks: number,
  fileHash: string 
) => {
  const existing = await prisma.upload.findFirst({
    where: { 
      totalSize: BigInt(totalSize),
      finalHash: fileHash
    }
  });
  
  const upload = await prisma.upload.create({
    data: {
      filename,
      totalSize: BigInt(totalSize),
      totalChunks,
      status: UploadStatus.UPLOADING,
    }
  });

  return upload;
};

export const getUploadStatus = async (uploadId: string) => {
  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
    include: { chunks: true }
  });
  
  if (!upload) return null;

  const completedChunkIndexes = upload.chunks
    .filter(c => c.status === 'SUCCESS')
    .map(c => c.index);

  return {
    ...upload,
    completedChunkIndexes,
    totalSize: upload.totalSize.toString()
  };
};
