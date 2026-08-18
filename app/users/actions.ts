"use server";

import { prisma } from "@/lib/prisma";
import { Roles } from "@/app/generated/prisma/client";
import { revalidatePath } from 'next/cache';
import { z } from "zod";

function generateUserId() {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);

    return `${year}${random}`;
};

//zod schema for form validation
const validSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    enrolled: z.boolean(),
    role: z.enum(Roles, { message: "Invalid role" }),
});

const updateSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }).optional(),
    email: z.string().email({ message: "Invalid email address" }).optional(),
    password: z.string().min(6, { message: "Password must be atleast 6 characters" }).optional(),
    enrolled: z.boolean().optional(),
    role: z.enum(["ADMIN", "USER", "TEACHER"], { message: "Invalid role" }).optional()
});

//create a new user
export async function createUser(formData: FormData) {
    const rawData = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        enrolled: formData.get("enrolled") === "on",
        role: formData.get("role") as Roles,
    }
    const checkedData = validSchema.safeParse(rawData);

    if (!checkedData.success) {
        console.log("Zod validation failed:");
        console.log(checkedData.error.issues);

        throw new Error("Invalid form data");
    }
    const userId = generateUserId();

    await prisma.user.create({
        data: {
            userId,
            ...checkedData.data
        },
    });
    revalidatePath("/users");
}

//read all users
export async function readUsers(searchQuery?: string) {
    return await prisma.user.findMany({
        where: searchQuery
            ? {
                OR: [
                    { name: { contains: searchQuery, mode: 'insensitive' } },
                    { email: { contains: searchQuery, mode: 'insensitive' } },
                ],
            }
            : undefined,
        orderBy: { createdAt: 'desc' },
    })
}

//update user by id
export async function updateUser(id: string, formData: FormData) {
    const rawData = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        enrolled: formData.get("enrolled") === "on",
        role: formData.get("role") as Roles,
    };
    const checkedData = updateSchema.safeParse(rawData);
    if (!checkedData.success) {
        console.log("Zod validation failed:");
        console.log(checkedData.error.issues);

        throw new Error("Invalid form data");
    }

    await prisma.user.update({
        where: { id },
        data: checkedData.data
    });

    revalidatePath("/users");
}

// delete user by id
export async function deleteUser(id: string) {
    await prisma.user.delete({
        where: { id }
    });

    revalidatePath("/users");
}


