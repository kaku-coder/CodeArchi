import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AuthContext,
  SESSION_KEY,
  USERS_KEY,
  hashPassword,
  normalizeEmail,
  publicUser,
  randomSalt,
  readJson,
  writeJson
} from './authContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const session = readJson(SESSION_KEY, null);
    if (!session?.email) return null;
    const users = readJson(USERS_KEY, {});
    return publicUser(users[session.email]);
  });

  useEffect(() => {
    if (user) {
      writeJson(SESSION_KEY, { email: user.email });
    } else {
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
