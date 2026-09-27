import axios from "axios";

let accessToken = null;
let onSessionEnded = () => {};

export const setAccessToken = (token) => {
  accessToken = token;
};
export const setSessionEndedHandler = (handler) => {
  onSessionEnded = handler;
};

export const api = axios.create({ baseURL: "/api", withCredentials: true });

function readCookie(name) {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  const csrf = readCookie("aur_csrf");
  if (csrf) config.headers["X-CSRF-Token"] = csrf;
  return config;
});

// One refresh at a time: concurrent 401s (and React StrictMode's double effects) share the same request.
let refreshing = null;
export function refreshSession() {
  refreshing ??= api
    .post("/auth/refresh", null, { skipAuthRefresh: true })
    .then(({ data }) => {
      setAccessToken(data.accessToken);
      return data;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const code = response?.data?.error?.code;
    if (response?.status === 401 && code === "TOKEN_EXPIRED" && config && !config._retried && !config.skipAuthRefresh) {
      config._retried = true;
      try {
        await refreshSession();
        return api(config);
      } catch {
        onSessionEnded();
      }
    } else if (response?.status === 401 && code === "AUTH_REVOKED") {
      onSessionEnded();
    }
    return Promise.reject(error);
  },
);

/** The server's user-facing message for a failed request. */
export const errorMessage = (err, fallback = "Something went wrong. Please try again.") =>
  err?.response?.data?.error?.message ?? (err?.request && !err?.response ? "We couldn't reach PHSecure. Check your connection and try again." : fallback);

export const errorCode = (err) => err?.response?.data?.error?.code;
export const errorDetails = (err) => err?.response?.data?.error?.details ?? {};
