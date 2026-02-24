import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { TagAssignment } from '@/db';
import { useTagStore } from '@/stores';
import { X, Paintbrush } from 'lucide-react';
import { tracker, AnalyticsEvents } from '@/analytics';

export interface TagAssignmentModeState {
  active: boolean;
  tagGroupId: string | null;
  tagValue: string | null;
}

interface TagAssignmentBarProps {
  mode: TagAssignmentModeState;
  onModeChange: (mode: TagAssignmentModeState) => void;
}

export function TagAssignmentBar({ mode, onModeChange }: TagAssignmentBarProps) {
  const { t } = useTranslation();
  const tagGroups = useLiveQuery(() => db.tagGroups.toArray(), []);

  const selectedGroup = useMemo(
    () => tagGroups?.find((g) => g.id === mode.tagGroupId),
    [tagGroups, mode.tagGroupId],
  );

  const handleActivate = () => {
    if (tagGroups?.length) {
      onModeChange({
        active: true,
        tagGroupId: tagGroups[0].id,
        tagValue: tagGroups[0].values[0] ?? null,
      });
      tracker.trackEvent(AnalyticsEvents.TAG_ASSIGNED, { action: 'bulk_mode_started' });
    }
  };

  const handleDeactivate = () => {
    onModeChange({ active: false, tagGroupId: null, tagValue: null });
  };

  const handleGroupChange = (groupId: string) => {
    const group = tagGroups?.find((g) => g.id === groupId);
    onModeChange({
      active: true,
      tagGroupId: groupId,
      tagValue: group?.values[0] ?? null,
    });
  };

  const handleValueChange = (value: string) => {
    onModeChange({ ...mode, tagValue: value });
  };

  if (!tagGroups?.length) return null;

  // Inactive state: show button to enter tag mode
  if (!mode.active) {
    return (
      <button
        onClick={handleActivate}
        className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
      >
        <Paintbrush className="h-4 w-4" />
        {t('tags.bulkAssignMode')}
      </button>
    );
  }

  // Active state: sticky toolbar
  return (
    <div className="sticky top-0 z-20 -mx-4 -mt-2 mb-2 rounded-b-xl border-b-2 border-primary-500 bg-primary-50 px-4 py-3 shadow-md dark:bg-primary-900/20 dark:border-primary-400">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-primary-700 dark:text-primary-300">
          <Paintbrush className="h-4 w-4" />
          <span className="text-sm font-semibold">
            {t('tags.bulkAssignMode')}
          </span>
        </div>

        {/* Tag group selector */}
        <select
          value={mode.tagGroupId ?? ''}
          onChange={(e) => handleGroupChange(e.target.value)}
          className="rounded-lg border border-primary-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-primary-700 dark:bg-gray-800 dark:text-gray-200"
        >
          {tagGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        {/* Tag value chips */}
        {selectedGroup && (
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedGroup.values.map((value) => (
              <button
                key={value}
                onClick={() => handleValueChange(value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  mode.tagValue === value
                    ? 'bg-primary-600 text-white shadow-sm ring-2 ring-primary-300 dark:bg-primary-500 dark:ring-primary-700'
                    : 'bg-white text-gray-600 hover:bg-primary-100 hover:text-primary-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-primary-900/30 dark:hover:text-primary-300'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        )}

        {/* Hint */}
        <span className="ml-auto hidden text-xs text-primary-600/70 dark:text-primary-400/70 sm:block">
          {t('tags.bulkAssignHint')}
        </span>

        {/* Exit button */}
        <button
          onClick={handleDeactivate}
          className="flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm transition-colors hover:bg-white hover:text-gray-700 dark:bg-gray-800/80 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <X className="h-3.5 w-3.5" />
          {t('tags.exitBulkMode')}
        </button>
      </div>
    </div>
  );
}

// ─── Hook for bulk tag toggle on a purchase ─────────────────

export function useTagToggle(mode: TagAssignmentModeState) {
  const { assignTag } = useTagStore();
  const allAssignments = useLiveQuery(
    (): Promise<TagAssignment[]> => (mode.active && mode.tagGroupId
      ? db.tagAssignments.where('tagGroupId').equals(mode.tagGroupId).toArray()
      : Promise.resolve([])),
    [mode.active, mode.tagGroupId],
  );

  const assignedTargetIds = useMemo(() => {
    if (!allAssignments || !mode.tagValue) return new Set<string>();
    return new Set(
      allAssignments
        .filter((a) => a.selectedValues.includes(mode.tagValue!))
        .map((a) => a.targetId),
    );
  }, [allAssignments, mode.tagValue]);

  const toggleTag = useCallback(
    async (targetId: string, targetType: 'purchase' | 'group' = 'purchase') => {
      if (!mode.active || !mode.tagGroupId || !mode.tagValue) return;

      const assignment = allAssignments?.find((a) => a.targetId === targetId);
      const current = assignment?.selectedValues ?? [];
      const hasValue = current.includes(mode.tagValue);

      const updated = hasValue
        ? current.filter((v) => v !== mode.tagValue)
        : [...current, mode.tagValue];

      await assignTag(targetId, targetType, mode.tagGroupId, updated);
    },
    [mode, allAssignments, assignTag],
  );

  return { assignedTargetIds, toggleTag };
}
