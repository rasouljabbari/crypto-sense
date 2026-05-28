import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const dbUrl = (process.env.DATABASE_URL ?? "").replace(/:[^:@]+@/, ":****@");
    const directUrl = (process.env.DIRECT_URL ?? "").replace(/:[^:@]+@/, ":****@");

    const userCount = await prisma.user.count();

    return NextResponse.json({
      status: "ok",
      database: "connected",
      userCount,
      env: {
        DATABASE_URL: dbUrl ? `set (${dbUrl.slice(0, 60)}...)` : "NOT SET",
        DIRECT_URL: directUrl ? `set (${directUrl.slice(0, 60)}...)` : "not set",
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || "not set",
        NODE_ENV: process.env.NODE_ENV,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      message: err?.message,
      code: err?.code,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ? "set" : "NOT SET",
        DIRECT_URL: process.env.DIRECT_URL ? "set" : "not set",
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || "not set",
      },
    }, { status: 500 });
  }
}
