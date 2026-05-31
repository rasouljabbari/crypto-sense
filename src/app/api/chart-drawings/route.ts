import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ lines: [] });

  const { searchParams } = new URL(request.url);
  const coinId = searchParams.get("coinId");
  if (!coinId) return NextResponse.json({ lines: [] });

  try {
    const drawing = await prisma.chartDrawing.findUnique({
      where: { userId_coinId: { userId: session.user.id, coinId } },
    });
    return NextResponse.json({ lines: (drawing?.hlines as number[]) ?? [] });
  } catch {
    return NextResponse.json({ lines: [] });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { coinId, lines } = await request.json();
  if (!coinId || !Array.isArray(lines)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  try {
    await prisma.chartDrawing.upsert({
      where: { userId_coinId: { userId: session.user.id, coinId } },
      update: { hlines: lines },
      create: { userId: session.user.id, coinId, hlines: lines },
    });
  } catch {}

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const coinId = searchParams.get("coinId");
  if (!coinId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    await prisma.chartDrawing.deleteMany({
      where: { userId: session.user.id, coinId },
    });
  } catch {}

  return NextResponse.json({ ok: true });
}
