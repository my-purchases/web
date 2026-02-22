import { create } from 'zustand';
import { db } from '@/db';
import type { PurchaseGroup, TagAssignment } from '@/db';
import { tracker, AnalyticsEvents } from '@/analytics';

interface GroupState {
  createGroup: (name: string, purchaseIds: string[]) => Promise<PurchaseGroup>;
  updateGroup: (id: string, updates: { name?: string }) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  addPurchaseToGroup: (groupId: string, purchaseId: string) => Promise<void>;
  removePurchaseFromGroup: (groupId: string, purchaseId: string) => Promise<void>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useGroupStore = create<GroupState>(() => ({
  createGroup: async (name, purchaseIds) => {
    const now = new Date().toISOString();
    const group: PurchaseGroup = {
      id: generateId(),
      name,
      purchaseIds,
      createdAt: now,
      updatedAt: now,
    };

    await db.purchaseGroups.add(group);
    tracker.trackEvent(AnalyticsEvents.PURCHASE_GROUP_CREATED, { name, itemCount: purchaseIds.length });
    console.info('[Groups] Created group:', name, 'with', purchaseIds.length, 'items');

    // Merge tag assignments from member purchases into the group
    await mergeTagAssignmentsToGroup(group.id, purchaseIds);

    return group;
  },

  updateGroup: async (id, updates) => {
    await db.purchaseGroups.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    tracker.trackEvent(AnalyticsEvents.PURCHASE_GROUP_UPDATED, { id, ...updates });
    console.info('[Groups] Updated group:', id, updates);
  },

  deleteGroup: async (id) => {
    await db.purchaseGroups.delete(id);
    // Clean up tag assignments for this group
    await db.tagAssignments.where('targetId').equals(id).delete();
    tracker.trackEvent(AnalyticsEvents.PURCHASE_GROUP_DELETED, { id });
    console.info('[Groups] Deleted group:', id);
  },

  addPurchaseToGroup: async (groupId, purchaseId) => {
    const group = await db.purchaseGroups.get(groupId);
    if (!group) return;

    if (!group.purchaseIds.includes(purchaseId)) {
      group.purchaseIds.push(purchaseId);
      group.updatedAt = new Date().toISOString();
      await db.purchaseGroups.put(group);
      tracker.trackEvent(AnalyticsEvents.PURCHASE_ADDED_TO_GROUP, { groupId, purchaseId });
      console.info('[Groups] Added purchase to group:', groupId, purchaseId);
    }
  },

  removePurchaseFromGroup: async (groupId, purchaseId) => {
    const group = await db.purchaseGroups.get(groupId);
    if (!group) return;

    group.purchaseIds = group.purchaseIds.filter((id) => id !== purchaseId);
    group.updatedAt = new Date().toISOString();
    await db.purchaseGroups.put(group);
    tracker.trackEvent(AnalyticsEvents.PURCHASE_REMOVED_FROM_GROUP, { groupId, purchaseId });
    console.info('[Groups] Removed purchase from group:', groupId, purchaseId);
  },
}));

/**
 * Merge tag assignments from member purchases into a group.
 * The group gets the union of all tag group values from its members.
 */
async function mergeTagAssignmentsToGroup(
  groupId: string,
  purchaseIds: string[],
): Promise<void> {
  // Gather all tag assignments from member purchases
  const allAssignments: TagAssignment[] = [];
  for (const purchaseId of purchaseIds) {
    const assignments = await db.tagAssignments
      .where('targetId')
      .equals(purchaseId)
      .toArray();
    allAssignments.push(...assignments);
  }

  // Group by tagGroupId and merge values
  const mergedMap = new Map<string, Set<string>>();
  for (const assignment of allAssignments) {
    if (!mergedMap.has(assignment.tagGroupId)) {
      mergedMap.set(assignment.tagGroupId, new Set());
    }
    const valueSet = mergedMap.get(assignment.tagGroupId)!;
    for (const value of assignment.selectedValues) {
      valueSet.add(value);
    }
  }

  // Create group tag assignments
  for (const [tagGroupId, valuesSet] of mergedMap) {
    const assignment: TagAssignment = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      targetId: groupId,
      targetType: 'group',
      tagGroupId,
      selectedValues: Array.from(valuesSet),
    };
    await db.tagAssignments.add(assignment);
  }

  console.debug('[Groups] Merged tag assignments for group:', groupId, 'Tags:', mergedMap.size);
}
