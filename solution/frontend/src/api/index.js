const CFG = {
  base: (import.meta?.env?.VITE_API_BASE || "http://localhost:9010").replace(/\/+$/, ""),
  timeout: 30000,
  tokenKey: "sgcan_jwt"
};


function getToken() { return localStorage.getItem(CFG.tokenKey); }
function setToken(t)  { localStorage.setItem(CFG.tokenKey, t); }
function clearToken() { localStorage.removeItem(CFG.tokenKey); }
function isLoggedIn() { return !!getToken(); }

class ApiError extends Error {
  constructor(status, statusText, body) {
    super(`${status} ${statusText}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request(path, {
  method = "GET",
  body,
  auth = false,
  headers = {},
  timeout = CFG.timeout,
  signal
} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const finalSignal = signal || controller.signal;

  const isForm = body instanceof FormData;
  const mergedHeaders = {
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    ...headers
  };

  try {
    const res = await fetch(`${CFG.base}${path}`, {
      method,
      headers: mergedHeaders,
      body: isForm ? body : (body ? JSON.stringify(body) : undefined),
      signal: finalSignal
    });

    const ct = res.headers.get("content-type") || "";
    const parse = async () => (ct.includes("application/json") ? res.json() : res.text());

    if (!res.ok) {
      const errBody = await parse().catch(() => null);
      throw new ApiError(res.status, res.statusText, errBody);
    }
    return parse();
  } finally {
    clearTimeout(timer);
  }
}

/* ===== Endpoints ===== */
const API = {
  // Config
  setBase(url) { CFG.base = (url || "").replace(/\/+$/, ""); },
  getBase()    { return CFG.base; },
  setTimeout(ms) { CFG.timeout = ms; },

  // Auth
  async login(email, password) {
    const data = await request("/login", { method: "POST", body: { email, password } });
    if (data?.token) setToken(data.token);
    return data; // { token, exp, userId, email }
  },
  logout() { clearToken(); },
  async register(email, password) {
    return request("/register", { method: "POST", body: { email, password } });
  },
  isLoggedIn,

  // Files
  async listFiles({ mine = false } = {}) {
    const q = mine ? "?mine=true" : "";
    return request(`/files${q}`, { auth: mine });
  },
  async listLinks(uploadId) {
    return request(`/files/${uploadId}/links`);
  },

  // Uploads
  async uploadCsv(file) {
    const fd = new FormData();
    fd.append("file", file);
    return request("/upload", { method: "POST", body: fd, auth: true });
  },

  // Utils
  getToken, setToken, clearToken, ApiError
};

export default API;
