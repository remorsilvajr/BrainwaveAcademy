export interface AuthUser {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}

const AUTH_STORAGE_KEY = "brainwaveAuthUser";
const AUTH_STATUS_KEY = "isAuthenticated";

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(AUTH_STATUS_KEY) === "true" && Boolean(getStoredUser());
}

export function loginUser(email: string, password: string) {
  const storedUser = getStoredUser();
  const normalizedEmail = email.trim().toLowerCase();

  if (!storedUser) {
    return {
      success: false as const,
      message: "No account found. Please create an account first.",
    };
  }

  if (
    storedUser.email.toLowerCase() !== normalizedEmail ||
    storedUser.password !== password
  ) {
    return {
      success: false as const,
      message: "Email or password is incorrect.",
    };
  }

  window.localStorage.setItem(AUTH_STATUS_KEY, "true");

  return {
    success: true as const,
    user: storedUser,
  };
}

export function registerUser(user: Omit<AuthUser, "role">) {
  const normalizedEmail = user.email.trim().toLowerCase();
  const existingUser = getStoredUser();

  if (existingUser?.email.toLowerCase() === normalizedEmail) {
    return {
      success: false as const,
      message: "An account with this email already exists. Please log in instead.",
    };
  }

  const newUser: AuthUser = {
    ...user,
    email: user.email.trim(),
    role: "Parent",
  };

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
  window.localStorage.setItem(AUTH_STATUS_KEY, "false");

  return {
    success: true as const,
    user: newUser,
  };
}

export function logoutUser() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_STATUS_KEY);
}

export function validateName(value: string): boolean {
  return /^[A-Za-z\s'-]+$/.test(value.trim());
}
