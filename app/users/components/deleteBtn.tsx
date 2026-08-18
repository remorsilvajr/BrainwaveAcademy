"use client";

import { deleteUser } from "../actions";

export default function DeleteButton({
    id,
    name,
}: {
    id: string;
    name: string;
}) {
    async function handleDelete() {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${name}?`
        );


        if (!confirmed) {
            return;
        }

        await deleteUser(id);
    }

    return (
        <button
            type="button"
            onClick={handleDelete}
            className="rounded bg-red-500 px-3 py-1 text-white"
        >
            Delete
        </button>
    );


}
