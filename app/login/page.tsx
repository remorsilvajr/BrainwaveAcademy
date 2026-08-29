import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>Log In</h1>

      {error && (
        <p style={{ color: 'red', marginBottom: 16 }}>{error}</p>
      )}

      <form action={login}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="email">Email Address</label>
          <br />
          <input
            id="email"
            name="email"
            type="email"
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="password">Password</label>
          <br />
          <input
            id="password"
            name="password"
            type="password"
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <button type="submit" style={{ width: '100%', padding: 10 }}>
          Log In
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        <a href="/forgot-password">Forgot password?</a>
      </p>
    </div>
  )
}
