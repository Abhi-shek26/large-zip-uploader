import { useUploaderStore } from '../state/uploaderStore';
import { clsx } from 'clsx';

export const ChunkGrid = () => {
  const chunks = useUploaderStore((state) => state.chunks);

  if (chunks.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">Chunk Map ({chunks.length} chunks)</h3>
      
      <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-[repeat(auto-fill,minmax(20px,1fr))] gap-1">
        {chunks.map((chunk) => (
          <div
            key={chunk.index}
            className={clsx(
              "h-5 w-full rounded-sm transition-colors duration-200 cursor-help",
              chunk.status === 'PENDING' && "bg-gray-200",
              chunk.status === 'UPLOADING' && "bg-blue-400 animate-pulse",
              chunk.status === 'SUCCESS' && "bg-green-500",
              chunk.status === 'ERROR' && "bg-red-500"
            )}
            title={`Chunk #${chunk.index} - ${chunk.status}`}
          />
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs text-gray-500 justify-center">
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-200 rounded-sm"></div> Pending</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-400 rounded-sm"></div> Uploading</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> Success</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> Error</div>
      </div>
    </div>
  );
};
