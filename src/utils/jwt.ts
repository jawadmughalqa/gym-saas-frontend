/**
 * Lightweight JWT payload decoder — no signature verification (that's the server's job).
 * Only use this to read claims for UI purposes (e.g. detect impersonation flag).
 */
export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1]!;
    // Base64url → base64 → JSON
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export interface JwtPayloadShape {
  userId: string;
  tenantId: string | null;
  role: string;
  email?: string;
  permissions?: string[];
  impersonating?: boolean;
  impersonatorId?: string;
  exp?: number;
  iat?: number;
}
