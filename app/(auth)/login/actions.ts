"use server";

import { prisma } from "@/lib/prisma";


export async function loginUser(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const user = await prisma.user.findUnique({
        where: {
            email: email,
        },
    });

    if (!user) {
        return { success: false, message: "Invalid email or password" };
    }
    if (user.password !== password) {
        return {
            success: false,
            message: "Invalid email or password"
        };
    }

    return {
        success: true,
        message: "Login successful",
        role: user.role
    };
}