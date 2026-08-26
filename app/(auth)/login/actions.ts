"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const ROLE_ROUTES: Record<string, string> = {
    ADMIN: "/admin/dashboard",
    TEACHER: "/teacher/dashboard",
    STUDENT: "/student/dashboard",
    PARENT: "/parent/dashboard",
};

export async function loginUser(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.password !== password) {
        return { success: false, message: "Invalid email or password." };
    }

    // Store user session/role in a cookie
    const cookieStore = await cookies();
    cookieStore.set("user_role", user.role, { httpOnly: true, path: "/" });

    return {
        success: true,
        message: "Login successful!",
        redirectTo: ROLE_ROUTES[user.role] || "/dashboard",
    };
}