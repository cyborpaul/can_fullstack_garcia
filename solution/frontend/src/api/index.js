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
    const msg = (body && (body.error || body.message)) || statusText || `HTTP ${status}`;
    super(msg);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function parseResponse(res) {
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return res.json();
  }
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
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

    const data = await parseResponse(res);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) clearToken();
      throw new ApiError(res.status, res.statusText, data);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}


const API = {

  setBase(url) { CFG.base = (url || "").replace(/\/+$/, ""); },
  getBase()    { return CFG.base; },
  setTimeout(ms) { CFG.timeout = ms; },


  async login(email, password) {
    const data = await request("/login", { method: "POST", body: { email, password } });
    if (data?.token) setToken(data.token);
    return data; 
  },
  logout() { clearToken(); },
  async register(email, password) {
    return request("/register", { method: "POST", body: { email, password } });
  },
  isLoggedIn,

  
  async listFiles({ mine = false } = {}) {
    const q = mine ? "?mine=true" : "";
   
    return request(`/files${q}`, { auth: mine });
  },
  async listLinks(uploadId) {
    return request(`/files/${uploadId}/links`);
  },

  
  async uploadCsv(file) {
    const fd = new FormData();
    fd.append("file", file);
    return request("/upload", { method: "POST", body: fd, auth: true });
  },

  

  
  getToken, setToken, clearToken, ApiError,
};

export default API;

// === Exports con nombre para usar directo en las vistas ===
export async function listMyFiles() {
  return API.listFiles({ mine: true });
}

export async function listFileLinks(uploadId) {
  return API.listLinks(uploadId);
}

export async function login(email, password) {
  return API.login(email, password);
}

export async function register(email, password) {
  return API.register(email, password);
}

export function logout() {
  return API.logout();
}

export async function uploadCsv(file) {
  return API.uploadCsv(file);
}






export { isLoggedIn, getToken, setToken, clearToken, ApiError };
