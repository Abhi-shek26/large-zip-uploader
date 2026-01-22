import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  UPLOAD_DIR: z.string().default('./storage/uploads'),
  TEMP_DIR: z.string().default('./storage/temp'),
});

export const env = envSchema.parse(process.env);
