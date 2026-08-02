import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const fallbackUsers = new Map<string, { email: string; password: string; firstName: string; middleName: string; lastName: string; role: string }>();

export async function POST(request: Request) {
  try {
    let body: any;

    try {
      const rawBody = await request.text();
      if (!rawBody.trim()) {
        throw new Error("Empty request body");
      }
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return NextResponse.json(
          { success: false, message: "No account found. Please create an account first." },
          { status: 404 }
        );
      }

      const passwordMatches = await bcrypt.compare(password, user.password);

      if (!passwordMatches) {
        return NextResponse.json(
          { success: false, message: "Email or password is incorrect." },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const shouldFallback = /ECONNREFUSED|connect|database|prisma|timeout|fetch/i.test(message);

      if (!shouldFallback) {
        throw error;
      }

      const fallbackUser = fallbackUsers.get(email);

      if (!fallbackUser) {
        return NextResponse.json(
          { success: false, message: "No account found. Please create an account first." },
          { status: 404 }
        );
      }

      const passwordMatches = await bcrypt.compare(password, fallbackUser.password);

      if (!passwordMatches) {
        return NextResponse.json(
          { success: false, message: "Email or password is incorrect." },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          firstName: fallbackUser.firstName,
          middleName: fallbackUser.middleName,
          lastName: fallbackUser.lastName,
          email: fallbackUser.email,
          role: fallbackUser.role,
        },
      });
    }
  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof Error) {
      console.error("Login error details:", error.message);
    }

    return NextResponse.json(
      { success: false, message: "Unable to sign you in right now." },
      { status: 500 }
    );
  }
}
