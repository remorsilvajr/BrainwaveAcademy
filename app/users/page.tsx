import { readUsers } from "./actions";
import AddButton from "./components/addBtn";
import EditButton from "./components/editBtn";
import DeleteButton from "./components/deleteBtn";

export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string }>;
}) {
    const params = await searchParams;
    const search = params.search ?? "";
    const users = await readUsers(search);

    return (
        <main className="p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                    Users Page
                </h1>

                <AddButton />
            </div>

            {/* Search */}
            <form className="my-4 flex items-center gap-4">
                <input
                    type="text"
                    name="search"
                    defaultValue={search}
                    placeholder="Search users..."
                    className="rounded border px-3 py-2"
                />

                <button
                    type="submit"
                    className="rounded bg-blue-500 px-4 py-2 text-white"
                >
                    Search
                </button>
            </form>

            {/* Table */}
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b">
                        <th className="p-2 text-left">User ID</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Enrolled</th>
                        <th className="p-2 text-left">Role</th>
                        <th className="p-2 text-left">Created At</th>
                        <th className="p-2 text-left">Actions</th>
                    </tr>
                </thead>

                <tbody>
                    {users.map((user) => (
                        <tr key={user.id} className="border-b">
                            <td className="p-2">{user.userId}</td>
                            <td className="p-2">{user.name}</td>
                            <td className="p-2">{user.email}</td>

                            <td className="p-2">
                                {user.enrolled
                                    ? "Enrolled"
                                    : "Not Enrolled"}
                            </td>

                            <td className="p-2">
                                {user.role}
                            </td>

                            <td className="p-2">
                                {user.createdAt.toLocaleString()}
                            </td>

                            <td className="p-2">
                                <div className="flex gap-2">
                                    <EditButton user={user} />

                                    <DeleteButton
                                        id={user.id}
                                        name={user.name}
                                    />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {users.length === 0 && (
                <p className="mt-4 text-gray-500">
                    No users found.
                </p>
            )}
        </main>
    );


}
