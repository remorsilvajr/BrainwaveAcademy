"use client";

import { useState } from "react";
import { createUser } from "../actions";

export default function AddButton() {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="rounded bg-green-500 px-3 py-1 text-white"
            >
                Add
            </button>

            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded bg-white p-6">
                        <h2 className="mb-4 text-xl font-bold">
                            Add User
                        </h2>

                        <form
                            action={async (formData) => {
                                await createUser(formData);
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
                                    className="w-full rounded border px-3 py-2"
                                />
                            </div>

                            <div>
                                <label className="block">
                                    Role
                                </label>

                                <select
                                    name="role"
                                    defaultValue="USER"
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
                                    className="rounded bg-green-500 px-3 py-1 text-white"
                                >
                                    Add User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );

}
