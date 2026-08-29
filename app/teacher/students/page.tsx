// TODO: replace the sample row with a real query against `students`.

export default function TeacherStudentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Students</h1>

      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">Date of Birth</th>
            <th className="p-3">Enrollment Status</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t">
            <td className="p-3">Sample Student</td>
            <td className="p-3">2021-04-12</td>
            <td className="p-3">Active</td>
            <td className="p-3">
              <button className="text-sm underline">Show Student Record</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
