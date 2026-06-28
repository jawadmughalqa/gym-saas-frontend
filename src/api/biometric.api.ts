import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orvalMutator } from '@/lib/orval-mutator';
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BiometricCredential {
  _id:        string;
  label:      string;
  deviceType: 'platform' | 'cross-platform';
  transports: string[];
  enrolledAt: string;
  lastUsedAt?: string;
}

export interface AuthResult {
  allow:        boolean;
  reason?:      string;
  memberId?:    string;
  memberName?:  string;
  alreadyIn?:   boolean;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const biometricKeys = {
  credentials: (memberId: string) => ['biometric', 'credentials', memberId] as const,
};

// ─── List credentials ─────────────────────────────────────────────────────────

export const listCredentials = (memberId: string): Promise<BiometricCredential[]> =>
  orvalMutator({
    url:    `/biometric/${memberId}/credentials`,
    method: 'GET',
  });

export function useCredentials(memberId: string) {
  return useQuery({
    queryKey: biometricKeys.credentials(memberId),
    queryFn:  () => listCredentials(memberId),
    enabled:  !!memberId,
  });
}

// ─── Enroll fingerprint ───────────────────────────────────────────────────────
// Two-step: get options from backend → browser Touch ID → send result back

export async function enrollFingerprint(memberId: string, label: string): Promise<BiometricCredential> {
  // Step 1 — get registration challenge from backend
  const optionsRes = await orvalMutator<{ data: PublicKeyCredentialCreationOptionsJSON; message: string } & { headers?: Record<string, string> }>({
    url:    `/biometric/${memberId}/enroll-options`,
    method: 'GET',
  });

  // The challenge comes back in the response body (options.challenge)
  const options = (optionsRes as any).data ?? optionsRes;
  const challenge: string = options.challenge;

  // Step 2 — trigger browser Touch ID / Face ID
  const registrationResponse = await startRegistration({ optionsJSON: options });

  // Step 3 — send result back to verify + save
  const credential = await orvalMutator<{ data: BiometricCredential }>({
    url:    `/biometric/${memberId}/enroll-verify`,
    method: 'POST',
    data:   { response: registrationResponse, challenge, label },
  });

  return (credential as any).data ?? credential;
}

export function useEnrollFingerprint(memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => enrollFingerprint(memberId, label),
    onSuccess:  () => qc.invalidateQueries({ queryKey: biometricKeys.credentials(memberId) }),
  });
}

// ─── Test access (verify fingerprint) ────────────────────────────────────────

export async function testBiometricAccess(memberId: string): Promise<AuthResult> {
  // Step 1 — get auth challenge scoped to this member
  const optionsRes = await orvalMutator<any>({
    url:    `/biometric/auth-options?memberId=${memberId}`,
    method: 'GET',
  });

  const options = optionsRes?.data ?? optionsRes;
  const challenge: string = options.challenge;

  // Step 2 — trigger browser Touch ID / Face ID
  const authResponse = await startAuthentication({ optionsJSON: options });

  // Step 3 — verify
  const result = await orvalMutator<any>({
    url:    `/biometric/auth-verify`,
    method: 'POST',
    data:   { response: authResponse, challenge },
  });

  return result?.data ?? result;
}

export function useTestAccess(memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => testBiometricAccess(memberId),
    onSuccess: () => {
      // Invalidate attendance so the admin page shows the new record immediately
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

// ─── Delete credential ────────────────────────────────────────────────────────

export const deleteCredential = (memberId: string, credentialId: string) =>
  orvalMutator({
    url:    `/biometric/${memberId}/credentials/${credentialId}`,
    method: 'DELETE',
  });

export function useDeleteCredential(memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (credentialId: string) => deleteCredential(memberId, credentialId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: biometricKeys.credentials(memberId) }),
  });
}
