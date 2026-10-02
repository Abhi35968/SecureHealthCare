const STORAGE_KEY = "securehealth.auth";
const listeners = new Set();
let memoryCache = null;

function hasWindowStorage() {
  return typeof window !== "undefined" && window.localStorage;
}

function readStorage() {
  if (hasWindowStorage()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn("Failed to parse stored auth", err);
      return null;
    }
  }
  return memoryCache;
}

function writeStorage(payload) {
  if (hasWindowStorage()) {
    if (!payload) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn("Failed to persist auth state", err);
    }
  } else {
    memoryCache = payload;
  }
}

function notify(payload) {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.error("Auth listener error", err);
    }
  });
}

export function getStoredAuth() {
  return readStorage();
}

export function saveStoredAuth(payload) {
  writeStorage(payload);
  notify(payload);
}

export function clearStoredAuth() {
  writeStorage(null);
  notify(null);
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
