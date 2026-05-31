import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") || String(Math.floor(Date.now() / 1000) - 365 * 86400);
  const end = searchParams.get("end") || String(Math.floor(Date.now() / 1000));

  try {
    const res = await fetch(
      `https://api.coinmarketcap.com/data-api/v3/fear-greed/chart?start=${start}&end=${end}`,
      {
        headers: {
          "accept": "*/*",
          "accept-language": "en-US,en;q=0.9",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (compatible; CryptoSense/1.0)",
        },
      }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "CMC API failed" }, { status: res.status });
    }
    const json = await res.json();
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
