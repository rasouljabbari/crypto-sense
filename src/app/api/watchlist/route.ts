import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/watchlist — return user's watchlist items
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ items: [] });
  const items = await prisma.watchlistItem.findMany({
    where: { userId: session.user.id },
    select: { symbol: true, name: true },
  });
  return NextResponse.json({ items });
}

// POST /api/watchlist — add item (requires auth)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { symbol, name } = await request.json();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  const existing = await prisma.watchlistItem.findUnique({
    where: { userId_symbol: { userId: session.user.id, symbol } },
  });
  if (existing) return NextResponse.json({ ok: true });
  await prisma.watchlistItem.create({
    data: { userId: session.user.id, symbol, name: name || symbol },
  });
  return NextResponse.json({ ok: true });
}

// DELETE /api/watchlist — remove item (requires auth)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  await prisma.watchlistItem.deleteMany({
    where: { userId: session.user.id, symbol },
  });
  return NextResponse.json({ ok: true });
}
