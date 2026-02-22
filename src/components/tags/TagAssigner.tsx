import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useTagStore } from '@/stores';
import { useState } from 'react';

interface TagAssignerProps {
  targetId: string;
  targetType: 'purchase' | 'group';
}

export function TagAssigner({ targetId, targetType }: TagAssignerProps) {
  const { assignTag } = useTagStore();
  const tagGroups = useLiveQuery(() => db.tagGroups.toArray(), []);
  const assignments = useLiveQuery(
    () => db.tagAssignments.where('targetId').equals(targetId).toArray(),
    [targetId],
  );

  if (!tagGroups?.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tagGroups.map((group) => {
        const assignment = assignments?.find((a) => a.tagGroupId === group.id);
        return (
          <TagGroupChips
            key={group.id}
            groupName={group.name}
            values={group.values}
            selectedValues={assignment?.selectedValues ?? []}
            onToggle={(value) => {
              const current = assignment?.selectedValues ?? [];
              const updated = current.includes(value)
                ? current.filter((v) => v !== value)
                : [...current, value];
              assignTag(targetId, targetType, group.id, updated);
            }}
          />
        );
      })}
    </div>
  );
}

interface TagGroupChipsProps {
  groupName: string;
  values: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}

function TagGroupChips({ groupName, values, selectedValues, onToggle }: TagGroupChipsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Show assigned values always, show all values when expanded

  return (
    <div className="inline-flex flex-wrap items-center gap-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
      >
        {groupName}
      </button>

      {isExpanded
        ? values.map((value) => (
            <button
              key={value}
              onClick={() => onToggle(value)}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                selectedValues.includes(value)
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {value}
            </button>
          ))
        : selectedValues.map((value) => (
            <span
              key={value}
              className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
            >
              {value}
            </span>
          ))}
    </div>
  );
}
