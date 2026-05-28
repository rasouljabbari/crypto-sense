import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { name, family, email, password } = await request.json();

    if (!name || !family || !email || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { name, family, email, password: hashed },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("=== REGISTER ERROR ===");
    console.error("Message:", err?.message);
    console.error("Stack:", err?.stack);
    console.error("======================");
    if (err?.name === "PrismaClientValidationError") {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
