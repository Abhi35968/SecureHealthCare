import axios from "axios";
import {
  clearStoredAuth,
  getStoredAuth,
  saveStoredAuth,
} from "./utils/authStorage";

const API = axios.create({
  baseURL: "http://localhost:3000",
});

let isRefreshing = false;
const refreshQueue = [];

function resolveQueue(token) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token);
    } else {
      reject(new Error("Session expired"));
    }
  });
  refreshQueue.length = 0;
}

API.interceptors.request.use((config) => {
  if (!config.skipAuthHeader) {
    const auth = getStoredAuth();
    if (auth?.token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${auth.token}`;
    }
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config || {};

    if (status === 401 && !originalRequest._retry && !originalRequest.skipAuthRetry) {
      originalRequest._retry = true;
      const auth = getStoredAuth();
      if (!auth?.refreshToken) {
        clearStoredAuth();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return API(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      isRefreshing = true;
      try {
        const refreshResponse = await axios.post(
          `${API.defaults.baseURL}/auth/refresh`,
          { refreshToken: auth.refreshToken },
          { skipAuthHeader: true }
        );
        const newToken = refreshResponse.data?.token;
        if (!newToken) {
          throw new Error("Missing refreshed token");
        }

        const updated = { ...auth, token: newToken };
        saveStoredAuth(updated);
        resolveQueue(newToken);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return API(originalRequest);
      } catch (refreshErr) {
        resolveQueue(null);
        clearStoredAuth();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default API;