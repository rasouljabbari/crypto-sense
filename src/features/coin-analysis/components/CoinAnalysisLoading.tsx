"use client";

export function CoinAnalysisLoading() {
  return (
    <div className="space-y-5">
      {/* Score + Trade Setup row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Market + Indicators row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* AI Summary full width */}
      <CardSkeleton tall />
    </div>
  );
}

function CardSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="h-4 bg-gray-800 rounded animate-pulse w-1/3 mb-5" />
      <div className={`space-y-3 ${tall ? "space-y-4" : ""}`}>
        <div className="h-3 bg-gray-800 rounded animate-pulse w-full" />
        <div className="h-3 bg-gray-800 rounded animate-pulse w-5/6" />
        <div className="h-3 bg-gray-800 rounded animate-pulse w-4/6" />
        {tall && (
          <>
            <div className="h-3 bg-gray-800 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-800 rounded animate-pulse w-2/3" />
          </>
        )}
      </div>
    </div>
  );
}
