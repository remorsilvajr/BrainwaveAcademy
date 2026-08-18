"use client";

import { useState } from "react";
import { updateUser } from "../actions";

type User = {
    id: string;
    userId: string;
    name: string;
    email: string;
    enrolled: boolean;
    role: "ADMIN" | "USER" | "TEACHER";
};

export default function EditButton({ user }: { user: User }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="rounded bg-yellow-500 px-3 py-1 text-white"
            >
                Edit
            </button>

            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded bg-white p-6">
                        <h2 className="mb-4 text-xl font-bold">
                            Edit User
                        </h2>

                        <form
                            action={async (formData) => {
                                await updateUser(user.id, formData);
                                setIsOpen(false);
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block">
                                    Name
                                </label>

                                <input
                                    name="name"
                                    defaultValue={user.name}
                                    className="w-full rounded border px-3 py-2"
                                />
                            </div>

                            <div>
                                <label className="block">
                                    Email
                                </label>

                                <input
                                    name="email"
                                    type="email"
                                    defaultValue={user.email}
                                    className="w-full rounded border px-3 py-2"
                                />
                            </div>

                            <div>
                                <label className="block">
                                    Password
                                </label>

                                <input
                                    name="password"
                                    type="password"
                                    placeholder="Enter new password"
                                    className="w-full rounded border px-3 py-2"
                                />
                            </div>

                            <div>
                                <label className="block">
                                    Role
                                </label>

                                <select
                                    name="role"
                                    defaultValue={user.role}
                                    className="w-full rounded border px-3 py-2"
                                >
                                    <option value="ADMIN">
                                        Admin
                                    </option>

                                    <option value="USER">
                                        User
                                    </option>

                                    <option value="TEACHER">
                                        Teacher
                                    </option>
                                </select>
                            </div>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="enrolled"
                                    defaultChecked={user.enrolled}
                                />

                                Enrolled
                            </label>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="rounded border px-3 py-1"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="rounded bg-blue-500 px-3 py-1 text-white"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
