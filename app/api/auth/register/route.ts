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

    const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
    const middleName = typeof body?.middleName === "string" ? body.middleName.trim() : "";
    const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });

      if (existingUser) {
        return NextResponse.json(
          { success: false, message: "An account with this email already exists." },
          { status: 409 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          firstName: firstName || "Parent",
          middleName,
          lastName: lastName || "User",
          email,
          password: hashedPassword,
          role: "Parent",
        },
      });

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

      const existingFallbackUser = fallbackUsers.get(email);
      if (existingFallbackUser) {
        return NextResponse.json(
          { success: false, message: "An account with this email already exists." },
          { status: 409 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      fallbackUsers.set(email, {
        email,
        password: hashedPassword,
        firstName: firstName || "Parent",
        middleName,
        lastName: lastName || "User",
        role: "Parent",
      });

      return NextResponse.json({
        success: true,
        user: {
          firstName: firstName || "Parent",
          middleName,
          lastName: lastName || "User",
          email,
          role: "Parent",
        },
      });
    }
  } catch (error) {
    console.error("Register error:", error);

    if (error instanceof Error) {
      console.error("Register error details:", error.message);
    }

    return NextResponse.json(
      { success: false, message: "Unable to create your account right now." },
      { status: 500 }
    );
  }
}
