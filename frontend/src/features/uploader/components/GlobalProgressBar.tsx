import { useUploaderStore } from '../state/uploaderStore';
import { clsx } from 'clsx';

export const GlobalProgressBar = () => {
  const { uploadedBytes, totalSize, status, currentSpeed } = useUploaderStore();

  const percentage = totalSize > 0 ? Math.min(100, (uploadedBytes / totalSize) * 100) : 0;
  const speedMBps = (currentSpeed / 1024 / 1024).toFixed(2);

  // Helper to format remaining time
  const remainingBytes = totalSize - uploadedBytes;
  const etaSeconds = currentSpeed > 0 ? remainingBytes / currentSpeed : 0;
  const etaFormatted = etaSeconds < 60 
    ? `${etaSeconds.toFixed(0)}s` 
    : `${(etaSeconds / 60).toFixed(1)}m`;

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 p-4 bg-white rounded-lg shadow-sm border">
      <div className="flex justify-between mb-2">
        <span className="font-semibold text-gray-700">
          Status: <span className={clsx(
            status === 'COMPLETED' && 'text-green-600',
            status === 'FAILED' && 'text-red-600',
            status === 'UPLOADING' && 'text-blue-600'
          )}>{status}</span>
        </span>
        <span className="text-sm text-gray-500">{percentage.toFixed(1)}%</span>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-2">
        <div 
          className={clsx(
            "h-full transition-all duration-300 ease-out",
            status === 'COMPLETED' ? "bg-green-500" : "bg-blue-600",
            status === 'FAILED' && "bg-red-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Metrics */}
      {status === 'UPLOADING' && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>Speed: {speedMBps} MB/s</span>
          <span>ETA: {etaFormatted}</span>
        </div>
      )}
    </div>
  );
};
