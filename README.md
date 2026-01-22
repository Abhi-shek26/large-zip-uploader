# Large ZIP Uploader

A resilient, distributed system for uploading large ZIP files (>1GB) with chunking, resumability, and graceful failure recovery.

---

## 🎯 Overview

This project implements a production-grade file upload system capable of handling multi-gigabyte ZIP files without crashing the server or overwhelming the client. The system:

- **Slices** large files into 5MB chunks on the frontend
- **Streams** chunks directly to disk on the backend (no memory loading)
- **Tracks** every chunk's state in a MySQL database
- **Resumes** interrupted uploads seamlessly
- **Validates** file integrity using MD5 hashing
- **Peeks** inside ZIP files without full extraction

---
## 📹 Demo


https://github.com/user-attachments/assets/11b2c782-295b-483b-a063-d6babf617631


### Normal Upload Flow
1. Select a 1GB+ ZIP file
2. Watch global progress bar and chunk grid
3. Observe 3 concurrent uploads (highlighted in grid)
4. See live MB/s and ETA metrics
5. Upon completion, view file contents extracted from ZIP

### Network Disconnect Simulation
1. Start uploading a large file
2. Open browser DevTools → Network tab
3. Switch to "Offline" mode mid-upload
4. Observe chunks failing and retrying
5. Re-enable network
6. Watch upload resume from exact point of interruption

### Server Crash Recovery
1. Start upload
2. Stop backend server (`Ctrl+C`)
3. Restart backend (`npm run dev`)
4. Refresh frontend page
5. Click "Resume" button
6. Upload continues from last successful chunk

---
## ✨ Features

### Frontend (Smart Uploader)
- ✅ **Chunking**: Files split into 5MB chunks using `Blob.slice()`
- ✅ **Concurrency Control**: Maximum 3 simultaneous uploads using `p-limit`
- ✅ **Resumability**: Handshake API retrieves partial upload state
- ✅ **Progress Visualization**:
  - Global progress bar (0-100%)
  - Chunk status grid (Pending, Uploading, Success, Error)
  - Live metrics (MB/s, ETA)
- ✅ **Retry Logic**: Failed chunks retry up to 3 times with exponential backoff

### Backend (Resilient Receiver)
- ✅ **Streaming I/O**: Uses `fs.write()` with byte offsets—zero memory buffering
- ✅ **Idempotency**: Duplicate chunk uploads are handled safely
- ✅ **Atomic Finalization**: Mutex locks prevent double-finalization race conditions
- ✅ **File Integrity**: MD5 hashing validates complete file assembly
- ✅ **ZIP Peek**: Lists top-level contents using `yauzl-promise` streaming
- ✅ **Database Tracking**: PostgreSQL/MySQL tracks upload and chunk states

### Database (Source of Truth)
- ✅ **Uploads Table**: `id`, `filename`, `totalSize`, `totalChunks`, `status`, `finalHash`
- ✅ **Chunks Table**: `uploadId`, `index`, `status`, `receivedAt`
- ✅ **Unique Constraints**: Prevents duplicate chunk entries for the same index

---

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend  │────────>│   Backend    │────────>│   Database   │
│  (React +   │  HTTPS  │  (Node.js +  │  MySQL  │   (MySQL)    │
│   Zustand)  │         │   Express)   │         │              │
└─────────────┘         └──────────────┘         └──────────────┘
      │                        │
      │ 1. Handshake           │ 2. Stream Chunks to Disk
      │ 2. Upload Chunks       │ 3. Track in DB
      │ 3. Finalize            │ 4. Merge & Validate
      │                        │ 5. Peek ZIP Contents
      │<───────────────────────┘
```

### Key Components

**Frontend:**
- `uploaderStore.ts` - Zustand state management
- `uploaderApi.ts` - API communication with retry logic
- `fingerprint.ts` - MD5 hash calculation using SparkMD5
- `ChunkGrid.tsx` - Visual chunk status display

**Backend:**
- `uploads.ts` (Controller) - API endpoints
- `uploadSession.ts` - Session initialization
- `chunkWriter.ts` - Streaming chunk writes to disk
- `finalize.ts` - File assembly, hashing, and validation
- `zipPeek.ts` - ZIP content inspection
- `locks.ts` - Mutex-based concurrency control

---

## 🛠️ Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 19, TypeScript, Zustand, TailwindCSS     |
| Backend    | Node.js, Express, Prisma ORM                    |
| Database   | MySQL 8.0                                       |
| Hashing    | SparkMD5 (client), crypto (server)              |
| ZIP Peek   | yauzl-promise                                   |
| Deployment | Docker Compose                                  |

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- 2GB+ free disk space for testing

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/large-zip-uploader.git
cd large-zip-uploader
```

### 2. Start Database
```bash
docker-compose up -d
```

### 3. Setup Backend
```bash
cd backend
npm install
npx prisma db push  # Create database schema
npm run dev         # Start server on port 3000
```

### 4. Setup Frontend
```bash
cd frontend
npm install
npm run dev         # Start Vite dev server on port 5173
```

### 5. Access Application
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔍 How It Works

### Phase 1: Handshake (Upload Initialization)
```typescript
POST /api/uploads/handshake
Body: { filename, totalSize, totalChunks, fileHash }
```

**What Happens:**
1. Frontend calculates MD5 hash of entire file
2. Backend creates `Upload` record in database
3. Returns `uploadId` for subsequent chunk uploads
4. Frontend checks for existing chunks (for resume capability)

### Phase 2: Chunk Upload
```typescript
PUT /api/uploads/:uploadId/chunk
Headers:
  - X-Chunk-Index: 0
  - X-Chunk-Offset: 0
Body: <binary chunk data>
```

**What Happens:**
1. Frontend sends 5MB chunks (max 3 concurrent)
2. Backend streams chunk directly to disk at calculated offset:
   ```typescript
   await fs.write(fd, chunkData, 0, chunkData.length, startOffset);
   ```
3. Database marks chunk as `SUCCESS`
4. Frontend updates progress bar and chunk grid

**Retry Logic:**
- Failed chunks retry up to 3 times
- Exponential backoff: 2s, 4s, 8s
- Network simulation: Can inject 30% failure rate for testing

### Phase 3: Finalization
```typescript
POST /api/uploads/:uploadId/finalize
Body: { fileHash }
```

**What Happens:**
1. Backend calculates server-side MD5 hash
2. Compares with client hash for integrity validation
3. Moves file from `temp/` to `uploads/` directory
4. Uses `yauzl-promise` to peek inside ZIP:
   ```typescript
   const zipFile = await yauzl.open(filePath);
   let entry = await zipFile.readEntry();
   while (entry) {
     filenames.push(entry.filename);
     entry = await zipFile.readEntry();
   }
   ```
5. Updates database status to `COMPLETED`

### Phase 4: Resume After Disconnect
```typescript
GET /api/uploads/:uploadId/status
```

**What Happens:**
1. Frontend retrieves list of successfully uploaded chunks
2. Filters out completed chunks from upload queue
3. Resumes only pending/failed chunks
4. Maintains same chunk indices and offsets

---

## 🧪 Technical Implementation

### 1. File Integrity (Hashing)

**Client-Side (Frontend):**
```typescript
// Uses SparkMD5 for incremental hashing
const calculateFileHash = async (file: File): Promise<string> => {
  const spark = new SparkMD5.ArrayBuffer();
  // Read file in 10MB chunks to avoid memory issues
  for (let i = 0; i < totalChunks; i++) {
    const chunk = file.slice(start, end);
    const buffer = await chunk.arrayBuffer();
    spark.append(buffer);
  }
  return spark.end(); // Returns hex hash
};
```

**Server-Side (Backend):**
```typescript
// Streams file for hash calculation
const calculateFileHash = async (filePath: string): Promise<string> => {
  const hash = crypto.createHash('md5');
  const stream = fs.createReadStream(filePath);
  
  stream.on('data', (data) => hash.update(data));
  return new Promise((resolve) => {
    stream.on('end', () => resolve(hash.digest('hex')));
  });
};
```

**Validation:**
- Hash calculated **before** upload starts
- Same hash recalculated **after** assembly
- Finalization fails if hashes mismatch
- Prevents corrupted uploads from being marked complete

---

### 2. Pause/Resume Logic

**State Management (Zustand):**
```typescript
interface Chunk {
  index: number;
  start: number;  // Byte offset in original file
  end: number;    // End byte offset
  status: 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
  progress: number; // Bytes uploaded for this chunk
  retryCount: number;
}
```

**How Resume Works:**
1. **Persistent State**: `uploadId` stored in Zustand (can persist to localStorage)
2. **Chunk Filtering**: Only chunks with status !== 'SUCCESS' are re-uploaded
3. **Offset Preservation**: Each chunk knows its exact byte range
4. **Database Recovery**: Backend queries database for chunk status
5. **No Re-Hashing**: Original file hash is reused

**Resume Flow:**
```typescript
// On page refresh or manual resume
const resumeUpload = () => {
  const pendingChunks = chunks.filter(c => c.status !== 'SUCCESS');
  // Upload only pending chunks, maintaining original indices
  pendingChunks.forEach(chunk => uploadChunk(chunk));
};
```

**Key Innovation:**
- Frontend doesn't need to re-read completed chunks from disk
- Database serves as source of truth for chunk state
- Idempotent chunk uploads prevent corruption on retry

---

## 🛡️ Handling Edge Cases

### 1. Double-Finalize Race Condition
**Problem:** Two "final chunk" requests arrive simultaneously.

**Solution:** Mutex Lock
```typescript
import { Mutex } from 'async-mutex';

const uploadLocks = new Map<string, Mutex>();

export const finalize = async (req, res) => {
  const lock = getUploadLock(uploadId);
  
  await lock.runExclusive(async () => {
    // Check if already completed
    const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
    if (upload?.status === 'COMPLETED') {
      return res.json({ status: 'already_completed' });
    }
    
    // Proceed with finalization
    await finalizeUpload(uploadId);
  });
};
```

**Result:** Only one finalization proceeds; second request gets "already_completed".

---

### 2. Network Flapping (30% Failure Rate)
**Problem:** Intermittent network causes random chunk failures.

**Solution:** Exponential Backoff Retry
```typescript
let attempts = 0;
const maxRetries = 3;

while (attempts < maxRetries) {
  try {
    await uploadChunk(chunk);
    return; // Success
  } catch (err) {
    attempts++;
    if (attempts >= maxRetries) throw err;
    
    // Wait 2^attempts seconds (2s, 4s, 8s)
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts)));
  }
}
```

**Testing:** Inject failures in axios interceptor:
```typescript
if (Math.random() < 0.3) throw new Error('Simulated network failure');
```

---

### 3. Out-of-Order Chunk Delivery
**Problem:** Chunk 10 arrives before Chunk 2.

**Solution:** Offset-Based Writing
```typescript
// Each chunk writes to its pre-calculated position
await fs.write(fd, chunkData, 0, chunkData.length, startOffset);

// Chunk 0: writes at byte 0
// Chunk 1: writes at byte 5242880 (5MB)
// Chunk 10: writes at byte 52428800 (50MB)
```

**Result:** File assembly is **position-based**, not sequence-based. Chunks can arrive in any order.

---

### 4. Server Crash During Upload
**Problem:** Backend process restarts mid-upload.

**Solution:** Database State Recovery
1. Partial file remains in `temp/` directory
2. Database contains chunk status for all received chunks
3. Frontend can resume by querying `/status` endpoint
4. Backend continues writing to existing `.part` file

**Recovery Flow:**
```typescript
// Frontend polls status after reconnection
const status = await axios.get(`/api/uploads/${uploadId}/status`);
const completedChunks = status.data.completedChunkIndexes;

// Mark chunks as complete in local state
completedChunks.forEach(index => {
  setChunkStatus(index, 'SUCCESS');
});

// Resume remaining chunks
resumeUpload();
```

---

## 🚧 Future Enhancements

### 1. **Multi-Part Upload to Cloud Storage**
- Integrate AWS S3 Multipart Upload API
- Offload storage from local disk
- Leverage S3's native resumability

### 2. **WebSocket Progress Streaming**
- Replace HTTP polling with WebSocket
- Real-time progress updates
- Lower latency for status checks

### 3. **Compression Before Upload**
- Add optional gzip compression for non-ZIP files
- Reduce bandwidth usage
- Trade CPU time for network speed

### 4. **Parallel Hashing**
- Use Web Workers for client-side hashing
- Non-blocking UI during hash calculation
- Background hash validation

### 5. **Admin Dashboard**
- View all active/completed uploads
- Monitor system resources
- Manual cleanup of failed uploads

### 6. **Rate Limiting**
- Implement per-IP upload rate limits
- Prevent abuse and DDoS
- Use Redis for distributed rate limiting

### 7. **End-to-End Encryption**
- Encrypt chunks before upload
- Decrypt on server or client-side only
- Zero-knowledge storage

### 8. **Automatic Cleanup Cron**
```typescript
// Delete uploads older than 7 days
cron.schedule('0 2 * * *', async () => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await prisma.upload.deleteMany({
    where: {
      status: { not: 'COMPLETED' },
      createdAt: { lt: cutoff }
    }
  });
});
```

### 9. **Chunk Integrity Verification**
- Calculate MD5 per chunk
- Validate chunks individually before merging
- Early detection of corruption

### 10. **Progressive Upload Preview**
- Show ZIP contents as chunks arrive
- Don't wait for full upload to peek
- Improved UX for large files

---



## 📊 Performance Metrics

| Metric               | Value                          |
|----------------------|--------------------------------|
| Chunk Size           | 5 MB                           |
| Concurrent Uploads   | 3                              |
| Max Retries          | 3 (exponential backoff)        |
| Hash Algorithm       | MD5                            |
| Memory Usage         | ~50 MB (for 10 GB file)        |
| Database Queries/Chunk | 1 INSERT/UPDATE              |
| Network Overhead     | ~0.1% (HTTP headers)           |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


---
