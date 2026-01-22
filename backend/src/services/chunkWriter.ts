import fs from 'fs-extra';
import path from 'path';
import { env } from '../config/env';

export const writeChunk = async (
  uploadId: string,
  chunkIndex: number,
  chunkData: Buffer,
  startOffset: number
): Promise<void> => {
  const tempFilePath = path.join(env.TEMP_DIR, `${uploadId}.part`);

  if (!(await fs.pathExists(tempFilePath))) {
    await fs.close(await fs.open(tempFilePath, 'w'));
  }

  const fd = await fs.open(tempFilePath, 'r+');

  try {
    await fs.write(fd, chunkData, 0, chunkData.length, startOffset);
  } finally {
    await fs.close(fd);
  }
};
