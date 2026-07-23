const STORAGE_KEY = "cryptosense-watchlist";
const MAX = 12;

export function getWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(list: string[]): string[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function addToWatchlist(symbol: string): string[] {
  const list = getWatchlist();
  if (list.length >= MAX) return list;
  if (list.includes(symbol)) return list;
  return save([...list, symbol]);
}

export function removeFromWatchlist(symbol: string): string[] {
  return save(getWatchlist().filter((s) => s !== symbol));
}

export function isInWatchlist(symbol: string): boolean {
  return getWatchlist().includes(symbol);
}
