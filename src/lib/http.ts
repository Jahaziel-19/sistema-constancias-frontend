import { API_BASE_URL } from "@/lib/env";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpErrorShape = {
  status: number;
  message: string;
  details?: unknown;
};

type StoredTokens = { access: string; refresh: string };

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function readStoredTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem("uh.tokens.v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTokens;
    if (!parsed?.access || !parsed?.refresh) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredTokens(tokens: StoredTokens | null) {
  try {
    if (!tokens) localStorage.removeItem("uh.tokens.v1");
    else localStorage.setItem("uh.tokens.v1", JSON.stringify(tokens));
  } catch {
    return;
  }
}

function decodeJwtExp(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = raw.padEnd(raw.length + ((4 - (raw.length % 4)) % 4), "=");
    const json = atob(padded);
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

async function refreshAccessToken(refresh: string): Promise<string | null> {
  const url = `${API_BASE_URL}/auth/refresh/`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  const data = await readJsonSafe(res);
  if (!res.ok) return null;
  if (data && typeof data === "object" && "access" in (data as Record<string, unknown>)) {
    const access = (data as { access?: unknown }).access;
    return typeof access === "string" && access ? access : null;
  }
  return null;
}

async function maybeRefreshToken(currentAccess: string | null): Promise<string | null> {
  const stored = readStoredTokens();
  if (!stored) return currentAccess;
  if (!currentAccess) return stored.access;

  const exp = decodeJwtExp(currentAccess);
  if (!exp) return currentAccess;
  const ms = exp * 1000 - Date.now();
  if (ms > 30_000) return currentAccess;

  const next = await refreshAccessToken(stored.refresh);
  if (!next) return currentAccess;
  writeStoredTokens({ ...stored, access: next });
  return next;
}

export async function http<T>(
  path: string,
  opts: {
    method?: HttpMethod;
    token?: string | null;
    body?: unknown;
    signal?: AbortSignal;
    expectRaw?: boolean;
    expectBlob?: boolean;
    responseType?: "json" | "text" | "blob";
  } = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  const doFetch = async (token: string | null) => {
    const wantBlob = opts.expectBlob || opts.responseType === "blob";
    const wantRaw = opts.expectRaw;
    const accept = wantBlob
      ? "application/pdf,application/octet-stream,*/*"
      : wantRaw
        ? "text/html,*/*"
        : "application/json";
    const headers: Record<string, string> = { Accept: accept };
    const isFormData = opts.body instanceof FormData;
    if (!isFormData && opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: isFormData
        ? (opts.body as BodyInit)
        : opts.body === undefined
          ? undefined
          : (JSON.stringify(opts.body) as BodyInit),
      signal: opts.signal,
    });
  };

  const initialToken = opts.token ? await maybeRefreshToken(opts.token) : null;
  let res = await doFetch(initialToken);
  let data: unknown;
  const wantBlob = opts.expectBlob || opts.responseType === "blob";
  if (wantBlob) {
    data = await res.blob();
  } else if (opts.expectRaw) {
    data = await res.text();
  } else {
    data = await readJsonSafe(res);
  }

  if (res.status === 401 && opts.token) {
    const stored = readStoredTokens();
    if (stored) {
      const next = await refreshAccessToken(stored.refresh);
      if (next) {
        writeStoredTokens({ ...stored, access: next });
        res = await doFetch(next);
        if (wantBlob) {
          data = await res.blob();
        } else if (opts.expectRaw) {
          data = await res.text();
        } else {
          data = await readJsonSafe(res);
        }
      } else {
        writeStoredTokens(null);
        if (typeof window !== "undefined") window.location.href = "/login";
      }
    } else {
      writeStoredTokens(null);
      if (typeof window !== "undefined") window.location.href = "/login";
    }
  }

  if (!res.ok) {
    if (wantBlob && data instanceof Blob) {
      try {
        const text = await data.text();
        const parsed = (() => {
          try {
            return text ? (JSON.parse(text) as unknown) : null;
          } catch {
            return null;
          }
        })();
        const extracted = typeof parsed === "object" && parsed && "detail" in (parsed as Record<string, unknown>)
          ? (parsed as { detail?: unknown }).detail
          : (text || "Error en la solicitud");
        const message = (() => {
          if (Array.isArray(extracted)) {
            return extracted.map((x) => (typeof x === "string" ? x : String(x))).join("\n");
          }
          if (typeof extracted === "string" && extracted) return extracted;
          return "Error en la solicitud";
        })();
        const err: HttpErrorShape = {
          status: res.status,
          message,
          details: typeof extracted === "string" ? undefined : extracted,
        };
        if (err.status === 401) {
          try {
            writeStoredTokens(null);
            if (typeof window !== "undefined") window.location.href = "/login";
          } catch {
            return Promise.reject(err);
          }
        }
        throw err;
      } catch (e) {
        if (e && (e as { message?: unknown; status?: unknown }).message && (e as { status: number }).status) {
          throw e;
        }
      }
    }
    const msg: unknown = typeof data === "string" ? data : data;
    const message = (() => {
      const detail = (msg as Record<string, unknown> | null)?.detail;
      if (Array.isArray(detail)) {
        return detail.map((x) => (typeof x === "string" ? x : String(x))).join("\n");
      }
      if (typeof msg === "string" && msg) return msg;
      if (typeof detail === "string" && detail) return detail;
      return "Error en la solicitud";
    })();
    const err: HttpErrorShape = {
      status: res.status,
      message,
      details: typeof msg === "string" ? undefined : msg,
    };
    if (err.status === 401) {
      try {
        writeStoredTokens(null);
        if (typeof window !== "undefined") window.location.href = "/login";
      } catch {
        return Promise.reject(err);
      }
    }
    throw err;
  }

  return data as T;
}
