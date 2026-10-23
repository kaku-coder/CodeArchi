import { createContext, useContext } from 'react';

export const USERS_KEY = 'codearchi.users.v1';
export const SESSION_KEY = 'codearchi.session.v1';

export const AuthContext = createContext(null);

export function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private browsing. The session still works for this tab.
  }
}

export function randomSalt() {
  const bytes = new Uint8Array(16);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password, salt) {
  const value = `${salt}:${password}`;
  if (window.crypto?.subtle) {
    const data = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return window.btoa(unescape(encodeURIComponent(value)));
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function publicUser(user) {
  if (!user) return null;
  return {
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
