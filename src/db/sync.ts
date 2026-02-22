import { db } from '@/db';
import type { SyncState } from '@/db';
import { getProvider } from '@/providers';
import type { ProviderCredentials } from '@/providers';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useInvitationStore } from '@/stores/invitationStore';
import { tracker, AnalyticsEvents } from '@/analytics';

/**
 * Sync purchases from a specific API provider
 */
export async function syncProvider(providerId: string): Promise<number> {
  const provider = getProvider(providerId);
  if (!provider || !provider.fetchPurchases) {
    throw new Error(`Provider ${providerId} does not support API sync`);
  }

  const credentials = useInvitationStore.getState().getCredentials(providerId);
  if (!credentials) {
    throw new Error(`No credentials for provider ${providerId}`);
  }

  tracker.trackEvent(AnalyticsEvents.PROVIDER_SYNC_STARTED, { providerId });
  console.info('[Sync] Starting sync for provider:', providerId);

  // Update sync state
  await updateSyncState(providerId, { status: 'syncing' });

  try {
    // Check if token needs refresh
    let currentCredentials = credentials;
    if (provider.isAuthenticated && !provider.isAuthenticated(credentials)) {
      if (provider.refreshToken) {
        console.info('[Sync] Refreshing token for provider:', providerId);
        const newTokens = await provider.refreshToken(credentials);
        useInvitationStore.getState().updateCredentials(providerId, newTokens as Partial<ProviderCredentials>);
        currentCredentials = { ...credentials, ...newTokens };
      } else {
        throw new Error('Token expired and no refresh mechanism available');
      }
    }

    // Get existing sync cursor
    const syncState = await db.syncState.get(providerId);

    // Fetch all purchases with pagination
    let totalAdded = 0;
    let cursor = syncState?.cursor;
    let hasMore = true;

    while (hasMore) {
      const result = await provider.fetchPurchases(currentCredentials as ProviderCredentials, {
        cursor,
        since: syncState?.lastSyncAt,
      });

      console.info('[Sync] Fetched batch:', result.purchases.length, 'items, hasMore:', result.hasMore);

      const added = await usePurchaseStore.getState().addPurchases(result.purchases);
      totalAdded += added.added;

      cursor = result.nextCursor;
      hasMore = result.hasMore;
    }

    // Update sync state
    await updateSyncState(providerId, {
      status: 'idle',
      lastSyncAt: new Date().toISOString(),
      cursor: undefined,
      error: undefined,
    });

    tracker.trackEvent(AnalyticsEvents.PROVIDER_SYNC_COMPLETED, { providerId, totalAdded });
    console.info('[Sync] Sync completed for provider:', providerId, 'Added:', totalAdded);

    return totalAdded;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    await updateSyncState(providerId, { status: 'error', error: message });
    tracker.trackEvent(AnalyticsEvents.PROVIDER_SYNC_FAILED, { providerId, error: message });
    console.debug('[Sync] Sync failed for provider:', providerId, message);
    throw err;
  }
}

async function updateSyncState(
  providerId: string,
  updates: Partial<SyncState>,
): Promise<void> {
  const existing = await db.syncState.get(providerId);
  if (existing) {
    await db.syncState.update(providerId, updates);
  } else {
    await db.syncState.add({
      providerId,
      status: 'idle',
      ...updates,
    });
  }
}
