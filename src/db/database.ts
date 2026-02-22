import Dexie, { type EntityTable } from 'dexie';

// ─── Purchase ───────────────────────────────────────────────

export interface Purchase {
  id: string;
  providerId: string;
  providerItemId: string;
  title: string;
  price: number;
  currency: string;
  purchaseDate: string; // ISO 8601
  imageUrl?: string;
  categoryName?: string;
  originalUrl?: string;
  rawData?: Record<string, unknown>;
  importedAt: string; // ISO 8601
}

// ─── Purchase Group (compound items) ────────────────────────

export interface PurchaseGroup {
  id: string;
  name: string;
  purchaseIds: string[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ─── Tag Group ──────────────────────────────────────────────

export interface TagGroup {
  id: string;
  name: string;
  values: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Tag Assignment ─────────────────────────────────────────

export interface TagAssignment {
  id: string;
  targetId: string; // Purchase.id or PurchaseGroup.id
  targetType: 'purchase' | 'group';
  tagGroupId: string;
  selectedValues: string[];
}

// ─── Sync State ─────────────────────────────────────────────

export interface SyncState {
  providerId: string;
  lastSyncAt?: string; // ISO 8601
  status: 'idle' | 'syncing' | 'error';
  cursor?: string;
  error?: string;
}

// ─── Database Class ─────────────────────────────────────────

export class MyResourcesDB extends Dexie {
  purchases!: EntityTable<Purchase, 'id'>;
  purchaseGroups!: EntityTable<PurchaseGroup, 'id'>;
  tagGroups!: EntityTable<TagGroup, 'id'>;
  tagAssignments!: EntityTable<TagAssignment, 'id'>;
  syncState!: EntityTable<SyncState, 'providerId'>;

  constructor() {
    super('my-purchases');

    this.version(1).stores({
      purchases: 'id, providerId, purchaseDate, [providerId+purchaseDate], [providerId+providerItemId]',
      purchaseGroups: 'id, createdAt',
      tagGroups: 'id, name',
      tagAssignments: 'id, targetId, tagGroupId, [targetId+tagGroupId], [tagGroupId+selectedValues]',
      syncState: 'providerId',
    });
  }
}

// Singleton database instance
export const db = new MyResourcesDB();
