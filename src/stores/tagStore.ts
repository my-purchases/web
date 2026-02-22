import { create } from 'zustand';
import { db } from '@/db';
import type { TagGroup, TagAssignment } from '@/db';
import { tracker, AnalyticsEvents } from '@/analytics';

interface TagState {
  // Actions for tag groups
  createTagGroup: (name: string, values: string[]) => Promise<TagGroup>;
  updateTagGroup: (id: string, updates: { name?: string; values?: string[] }) => Promise<void>;
  deleteTagGroup: (id: string) => Promise<void>;

  // Actions for tag assignments
  assignTag: (
    targetId: string,
    targetType: 'purchase' | 'group',
    tagGroupId: string,
    selectedValues: string[],
  ) => Promise<void>;
  removeTagAssignment: (targetId: string, tagGroupId: string) => Promise<void>;
  getTagAssignments: (targetId: string) => Promise<TagAssignment[]>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useTagStore = create<TagState>(() => ({
  createTagGroup: async (name, values) => {
    const tagGroup: TagGroup = {
      id: generateId(),
      name,
      values,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.tagGroups.add(tagGroup);
    tracker.trackEvent(AnalyticsEvents.TAG_GROUP_CREATED, { name, valuesCount: values.length });
    console.info('[Tags] Created group:', name, 'with values:', values);
    return tagGroup;
  },

  updateTagGroup: async (id, updates) => {
    await db.tagGroups.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    tracker.trackEvent(AnalyticsEvents.TAG_GROUP_UPDATED, { id, ...updates });
    console.info('[Tags] Updated group:', id, updates);
  },

  deleteTagGroup: async (id) => {
    // Delete the tag group and all its assignments
    await db.tagGroups.delete(id);
    await db.tagAssignments.where('tagGroupId').equals(id).delete();
    tracker.trackEvent(AnalyticsEvents.TAG_GROUP_DELETED, { id });
    console.info('[Tags] Deleted group:', id);
  },

  assignTag: async (targetId, targetType, tagGroupId, selectedValues) => {
    // Find existing assignment or create new
    const existing = await db.tagAssignments
      .where('[targetId+tagGroupId]')
      .equals([targetId, tagGroupId])
      .first();

    if (existing) {
      if (selectedValues.length === 0) {
        await db.tagAssignments.delete(existing.id);
        tracker.trackEvent(AnalyticsEvents.TAG_UNASSIGNED, { targetId, tagGroupId });
        console.info('[Tags] Removed assignment:', targetId, tagGroupId);
      } else {
        await db.tagAssignments.update(existing.id, { selectedValues });
        tracker.trackEvent(AnalyticsEvents.TAG_ASSIGNED, { targetId, tagGroupId, values: selectedValues });
        console.info('[Tags] Updated assignment:', targetId, tagGroupId, selectedValues);
      }
    } else if (selectedValues.length > 0) {
      const assignment: TagAssignment = {
        id: generateId(),
        targetId,
        targetType,
        tagGroupId,
        selectedValues,
      };
      await db.tagAssignments.add(assignment);
      tracker.trackEvent(AnalyticsEvents.TAG_ASSIGNED, { targetId, tagGroupId, values: selectedValues });
      console.info('[Tags] Created assignment:', targetId, tagGroupId, selectedValues);
    }
  },

  removeTagAssignment: async (targetId, tagGroupId) => {
    await db.tagAssignments
      .where('[targetId+tagGroupId]')
      .equals([targetId, tagGroupId])
      .delete();
    tracker.trackEvent(AnalyticsEvents.TAG_UNASSIGNED, { targetId, tagGroupId });
    console.info('[Tags] Removed assignment:', targetId, tagGroupId);
  },

  getTagAssignments: async (targetId) => {
    return db.tagAssignments.where('targetId').equals(targetId).toArray();
  },
}));
