import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { initUploadSession, getUploadStatus } from '../services/uploadSession';
import { writeChunk } from '../services/chunkWriter';
import { finalizeUpload } from '../services/finalize';
import { getUploadLock } from '../utills/locks';

export const handshake = async (req: Request, res: Response) => {
  try {
    const { filename, totalSize, totalChunks, fileHash } = req.body; 
    const session = await initUploadSession(filename, totalSize, totalChunks, fileHash);
    
    res.json({ 
      uploadId: session.id,
      existingChunks: []
    });
  } catch (error) {
    console.error('Handshake error:', error);
    res.status(500).json({ error: 'Failed to start upload session' });
  }
};

export const uploadChunk = async (req: Request, res: Response) => {
  let { uploadId } = req.params;
  if (Array.isArray(uploadId)) {
    uploadId = uploadId[0];
  }
  const chunkIndex = parseInt(req.headers['x-chunk-index'] as string);
  const chunkOffset = parseInt(req.headers['x-chunk-offset'] as string);
  
  if (isNaN(chunkIndex) || isNaN(chunkOffset)) {
    res.status(400).json({ error: 'Missing Chunk Headers' });
    return
  }

  try {
    await writeChunk(uploadId, chunkIndex, req.body, chunkOffset);

    // 2. Mark in DB
    await prisma.chunk.upsert({
      where: {
        uploadId_index: { uploadId, index: chunkIndex }
      },
      update: { status: 'SUCCESS', receivedAt: new Date() },
      create: {
        uploadId,
        index: chunkIndex,
        size: req.body.length,
        status: 'SUCCESS',
        receivedAt: new Date()
      }
    });

    res.status(200).json({ status: 'uploaded' });

  } catch (error) {
    console.error(`Chunk ${chunkIndex} failed:`, error);
    res.status(500).json({ error: 'Chunk write failed' });
  }
};

export const finalize = async (req: Request, res: Response) => {
  let { uploadId } = req.params;
  const { fileHash } = req.body; 

  if (Array.isArray(uploadId)) {
    uploadId = uploadId[0];
  }

  const lock = getUploadLock(uploadId);
  
  await lock.runExclusive(async () => {
    const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
    if (upload?.status === 'COMPLETED') {
      res.json({ status: 'already_completed', upload });
      return;
    }

    try {
      // 1. Merge & Validate
      const result = await finalizeUpload(uploadId, fileHash);

      // 2. Update DB
      const updated = await prisma.upload.update({
        where: { id: uploadId },
        data: {
          status: result.isValid ? 'COMPLETED' : 'FAILED',
          finalHash: result.finalHash,
        }
      });

      // 3. Serialize BigInt
      const responseData = {
        ...updated,
        totalSize: updated.totalSize.toString(),
        fileContents: result.fileList 
      };

      res.json(responseData);

    } catch (error) {
      console.error('Finalize failed:', error);
      res.status(500).json({ error: 'Finalization failed' });
    }
  });
};

export const status = async (req: Request, res: Response) => {
  let { uploadId } = req.params;
  if (Array.isArray(uploadId)) {
    uploadId = uploadId[0];
  }
  const data = await getUploadStatus(uploadId);
  
  if (!data) {
     res.status(404).json({ error: 'Not found' });
     return
  }
  
  res.json(data);
};
