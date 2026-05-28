interface Props {
  rows?: number;
}

export function Skeleton({ rows = 5 }: Props) {
  return (
    <div className="divide-y divide-gray-800/50">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="min-w-[640px] grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1.2fr_0.5fr] gap-2 items-center px-4 py-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="w-5" />
            <div className="w-6 h-6 rounded-full bg-gray-800 animate-pulse" />
            <div className="h-3 w-20 bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="h-3 w-16 bg-gray-800 rounded animate-pulse ml-auto" />
          <div className="h-3 w-14 bg-gray-800 rounded animate-pulse ml-auto" />
          <div className="h-3 w-12 bg-gray-800 rounded animate-pulse ml-auto" />
          <div className="h-3 w-10 bg-gray-800 rounded animate-pulse ml-auto" />
          <div className="h-5 w-16 bg-gray-800 rounded animate-pulse mx-auto" />
          <div className="h-5 w-12 bg-gray-800 rounded animate-pulse mx-auto" />
        </div>
      ))}
    </div>
  );
}
