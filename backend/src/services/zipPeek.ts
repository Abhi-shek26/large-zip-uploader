import yauzl from 'yauzl-promise';
import { env } from '../config/env';

export const peekZipContents = async (filePath: string): Promise<string[]> => {
  const filenames: string[] = [];
  let zipFile;

  try {
    // Open the zip file (reads only central directory initially)
    zipFile = await yauzl.open(filePath);
    
    // Iterate through entries
    let entry = await zipFile.readEntry();
    while (entry) {
      // Only capture top-level files/folders to keep the list clean
      filenames.push(entry.filename);
      entry = await zipFile.readEntry();
    }

    await zipFile.close();
    return filenames;
  } catch (error) {
    console.error('Error peeking zip:', error);
    return ['<Error: Not a valid ZIP file or corrupted>'];
  }
};
