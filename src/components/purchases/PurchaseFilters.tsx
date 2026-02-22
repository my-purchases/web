import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { usePurchaseStore } from '@/stores';
import { getAllProviderMetas } from '@/providers';
import { Search, ArrowUp, ArrowDown, Tag, X } from 'lucide-react';

export function PurchaseFilters() {
  const { t } = useTranslation();
  const {
    filters,
    sortDirection,
    setProviderFilter,
    setSearchQuery,
    setSortDirection,
    setTagFilter,
  } = usePurchaseStore();

  const providers = getAllProviderMetas();
  const tagGroups = useLiveQuery(() => db.tagGroups.toArray(), []);

  const toggleProvider = (providerId: string) => {
    const current = filters.providerIds;
    if (current.includes(providerId)) {
      setProviderFilter(current.filter((id) => id !== providerId));
    } else {
      setProviderFilter([...current, providerId]);
    }
  };

  const toggleTagValue = (tagGroupId: string, value: string) => {
    const current = filters.tagFilters[tagGroupId] ?? [];
    if (current.includes(value)) {
      setTagFilter(tagGroupId, current.filter((v) => v !== value));
    } else {
      setTagFilter(tagGroupId, [...current, value]);
    }
  };

  const hasActiveTagFilters = Object.keys(filters.tagFilters).length > 0;

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('purchases.searchPlaceholder')}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Provider filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('purchases.filterByProvider')}:
          </span>
          <button
            onClick={() => setProviderFilter([])}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filters.providerIds.length === 0
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {t('purchases.allProviders')}
          </button>
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => toggleProvider(provider.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filters.providerIds.includes(provider.id)
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {provider.name}
            </button>
          ))}
        </div>

        {/* Sort direction */}
        <button
          onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
        >
          {sortDirection === 'desc' ? (
            <>
              <ArrowDown className="h-3.5 w-3.5" />
              {t('purchases.descending')}
            </>
          ) : (
            <>
              <ArrowUp className="h-3.5 w-3.5" />
              {t('purchases.ascending')}
            </>
          )}
        </button>
      </div>

      {/* Tag group filters */}
      {tagGroups && tagGroups.length > 0 && (
        <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              <Tag className="h-3.5 w-3.5" />
              {t('tags.filterByTag')}:
            </span>
            {hasActiveTagFilters && (
              <button
                onClick={() => {
                  for (const groupId of Object.keys(filters.tagFilters)) {
                    setTagFilter(groupId, []);
                  }
                }}
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-3 w-3" />
                {t('common.clear')}
              </button>
            )}
          </div>

          {tagGroups.map((group) => {
            const selectedValues = filters.tagFilters[group.id] ?? [];
            return (
              <div key={group.id} className="flex flex-wrap items-center gap-1.5">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {group.name}
                </span>
                {group.values.map((value) => (
                  <button
                    key={value}
                    onClick={() => toggleTagValue(group.id, value)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                      selectedValues.includes(value)
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
