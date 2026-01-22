import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';
import { peekZipContents } from './zipPeek';

interface FinalizeResult {
  finalHash: string;
  fileList: string[];
  isValid: boolean;
}

export const finalizeUpload = async (
  uploadId: string,
  originalHash: string 
): Promise<FinalizeResult> => {
  const tempPath = path.join(env.TEMP_DIR, `${uploadId}.part`);
  const finalPath = path.join(env.UPLOAD_DIR, `${uploadId}.zip`);

  const serverHash = await calculateFileHash(tempPath);

  if (serverHash !== originalHash) {
    console.error(`Hash mismatch! Client: ${originalHash}, Server: ${serverHash}`);
    return { finalHash: serverHash, fileList: [], isValid: false };
  }

  await fs.move(tempPath, finalPath, { overwrite: true });

  const fileList = await peekZipContents(finalPath);

  return { finalHash: serverHash, fileList, isValid: true };
};

const calculateFileHash = async (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5'); 
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
};
