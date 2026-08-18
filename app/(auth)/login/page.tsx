"use client";
import { loginUser } from "./actions";
import { useState } from "react";

export default function LoginPage() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (formData: FormData) => {
    const result = await loginUser(formData);

    setMessage(result.message);
    if (!result.success) {
      setPassword("");
    }
  };

  return (
    <main>

      <form action={handleSubmit}>
        <div>
          <label htmlFor="email">Email: </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password">Password: </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="bg-blue-500 text-white px-0.5 py-1 rounded hover:bg-blue-600 transition-colors">
          Login
        </button>
      </form>
      {message && (
        <p>{message}</p>
      )}

    </main>
  );
}
