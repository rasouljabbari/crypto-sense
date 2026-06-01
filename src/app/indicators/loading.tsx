export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950">
      <div className="h-16 border-b border-gray-800 bg-gray-900/50" />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="h-7 w-48 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden divide-y divide-gray-800/50">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4">
              <div className="h-5 w-72 bg-gray-800 rounded animate-pulse" />
              <div className="h-6 w-28 bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
