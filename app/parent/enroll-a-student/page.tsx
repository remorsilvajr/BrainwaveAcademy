// TODO: wire up as a Server Action that inserts into `applications`,
// reusing the parent's existing profile info instead of asking for it again.

export default function EnrollAStudentPage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-4">Enroll A Student</h1>

      <form className="space-y-4">
        <div>
          <label className="block text-sm mb-1">First Name</label>
          <input className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Middle Name</label>
          <input className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Last Name</label>
          <input className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Date of Birth</label>
          <input type="date" className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Gender</label>
          <select className="w-full border rounded px-3 py-2">
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <button type="submit" className="bg-gray-900 text-white rounded px-4 py-2">
          Submit Application
        </button>
      </form>
    </div>
  )
}
