import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const USERS_KEY = 'codearchi.users.v1';
const SESSION_KEY = 'codearchi.session.v1';

const AuthContext = createContext(null);

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private browsing. The session still works for this tab.
  }
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const value = `${salt}:${password}`;
  if (window.crypto?.subtle) {
    const data = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return window.btoa(unescape(encodeURIComponent(value)));
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function publicUser(user) {
  if (!user) return null;
  return {
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const session = readJson(SESSION_KEY, null);
    if (!session?.email) return null;
    const users = readJson(USERS_KEY, {});
    return publicUser(users[session.email]);
  });

  useEffect(() => {
    if (user) writeJson(SESSION_KEY, { email: user.email });
    else {
      try {
        window.localStorage.removeItem(SESSION_KEY);
      } catch {
        // Ignore storage failures.
      }
    }
  }, [user]);

  const signup = useCallback(async ({ name, email, password }) => {
    const cleanName = String(name || '').trim();
    const cleanEmail = normalizeEmail(email);

    if (cleanName.length < 2) {
      throw new Error('Enter your name with at least 2 characters.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Enter a valid email address.');
    }
    if (String(password || '').length < 6) {
      throw new Error('Use a password with at least 6 characters.');
    }

    const users = readJson(USERS_KEY, {});
    if (users[cleanEmail]) {
      throw new Error('An account with this email already exists. Sign in instead.');
    }

    const salt = randomSalt();
    const hash = await hashPassword(password, salt);
    const record = {
      name: cleanName,
      email: cleanEmail,
      salt,
      hash,
      createdAt: new Date().toISOString()
    };

    users[cleanEmail] = record;
    writeJson(USERS_KEY, users);
    setUser(publicUser(record));
    return publicUser(record);
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail || !password) {
      throw new Error('Enter your email and password.');
    }

    const users = readJson(USERS_KEY, {});
    const record = users[cleanEmail];
    if (!record) {
      throw new Error('No account was found for this email. Create an account first.');
    }

    const hash = await hashPassword(password, record.salt);
    if (hash !== record.hash) {
      throw new Error('That password is not correct.');
    }

    setUser(publicUser(record));
    return publicUser(record);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), signup, login, logout }),
    [user, signup, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
