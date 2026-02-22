import type { ProviderCredentials } from '@/providers/types';

/**
 * Invitation file format.
 * Invitations contain credentials for accessing provider APIs.
 * They can be distributed as JSON files or loaded via demo code.
 */
export interface Invitation {
  /** Unique invitation code */
  code: string;
  /** Human-readable label */
  label: string;
  /** Description of what this invitation provides */
  description?: string;
  /** Provider credentials keyed by provider ID */
  providers: Record<string, ProviderCredentials>;
  /** When the invitation was created */
  createdAt?: string;
  /** When the invitation expires (optional) */
  expiresAt?: string;
}

/**
 * Validate invitation object structure
 */
export function validateInvitation(data: unknown): data is Invitation {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.code === 'string' &&
    typeof obj.label === 'string' &&
    typeof obj.providers === 'object' &&
    obj.providers !== null
  );
}
