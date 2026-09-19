import { useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { TagAssignment } from '@/db';
import { useTagStore } from '@/stores';
import type { TagAssignmentModeState } from './TagAssignmentBar';

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
