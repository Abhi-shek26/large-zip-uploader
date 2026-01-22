import React from 'react';
import { GlobalProgressBar } from '../features/uploader/components/GlobalProgressBar';
import { ChunkGrid } from '../features/uploader/components/ChunkGrid';
import { useUploaderStore } from '../features/uploader/state/uploaderStore';
import { UploadCloud, FolderCheck } from 'lucide-react';

function App() {
const { setFile, startUpload, pauseUpload, resumeUpload, filesInZip, status } = useUploaderStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-sans">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Resilient Large File Uploader</h1>
        <p className="text-gray-500">Supports files &gt;1GB, Auto-Resume, and Chunk visualization</p>
      </header>

      <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-lg mb-8">
        {/* File Input */}
        <div className="mb-8 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-32 hover:bg-gray-50 transition cursor-pointer relative">
            <input 
              type="file" 
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer" 
            />
            <UploadCloud className="w-10 h-10 text-gray-400 mb-2" />
            <p className="text-gray-600">Drag & drop or click to select file</p>
        </div>

        {/* Actions */}
<div className="flex justify-center gap-4 mb-6">
    {/* Start / Resume Button */}
    {status !== 'UPLOADING' && status !== 'COMPLETED' && (
      <button 
        onClick={() => status === 'PAUSED' ? resumeUpload() : startUpload()}
        className="px-6 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700"
      >
        {status === 'PAUSED' ? 'Resume Upload' : 'Start Upload'}
      </button>
    )}

    {/* Pause Button - Only show when Uploading */}
    {status === 'UPLOADING' && (
      <button 
        onClick={() => pauseUpload()}
        className="px-6 py-2 bg-yellow-500 text-white rounded-md font-semibold hover:bg-yellow-600"
      >
        Pause Upload
      </button>
    )}
</div>


        <GlobalProgressBar />
      </div>

      <ChunkGrid />

      {/* Results / "Peek" View */}
      {status === 'COMPLETED' && filesInZip.length > 0 && (
        <div className="mt-8 w-full max-w-2xl bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center gap-2 mb-4">
             <FolderCheck className="text-green-600" />
             <h3 className="text-lg font-semibold">Upload Complete!</h3>
          </div>
          <p className="text-sm text-gray-600 mb-2">Zip Content Preview (Top Level):</p>
          <ul className="bg-gray-100 p-4 rounded-md text-sm font-mono text-gray-700 max-h-40 overflow-y-auto">
            {filesInZip.map((f, i) => (
              <li key={i} className="border-b border-gray-200 last:border-0 py-1">{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
