"use server";

import { prisma } from "@/lib/prisma";


export async function loginUser(formData:FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const user = await prisma.user.findUnique({
        where: { 
            email,
         },
    });

    if (!user ){
        return { success: false, message: "Invalid email or password" };
    }
    if (user.password !== password) {
        return { success: false, message: "Invalid email or password" };
    }
    if (user.role == "ADMIN") {
        return { success: true, message: "Login successful" };
        // Redirect to admin dashboard
    }
    if (user.role == "TEACHER") {
        return { success: true, message: "Login successful" };
        // Redirect to teacher dashboard
    }
    if (user.role == "USER") {
        return { success: true, message: "Login successful" };
        // Redirect to parent dashboard
    }

    return { success: true, message: "Login successful" };
}