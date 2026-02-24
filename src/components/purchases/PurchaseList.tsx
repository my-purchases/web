import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { Purchase } from '@/db';
import { usePurchaseStore } from '@/stores';
import { PurchaseCard } from './PurchaseCard';
import { PurchaseGroupCard } from './PurchaseGroupCard';
import { ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TagAssignmentModeState } from '@/components/tags/TagAssignmentBar';

const PAGE_SIZE = 100;

interface PurchaseListProps {
  tagMode?: TagAssignmentModeState;
  assignedTargetIds?: Set<string>;
  onTagToggle?: (targetId: string, targetType: 'purchase' | 'group') => void;
}

export function PurchaseList({ tagMode, assignedTargetIds, onTagToggle }: PurchaseListProps) {
  const { t } = useTranslation();
  const { filters, sortDirection } = usePurchaseStore();

  // Live query: all purchases from IndexedDB
  const allPurchases = useLiveQuery(() => db.purchases.toArray(), []);
  const allGroups = useLiveQuery(() => db.purchaseGroups.toArray(), []);
  const allTagAssignments = useLiveQuery(() => db.tagAssignments.toArray(), []);

  // Filter and sort purchases
  const filteredPurchases = useMemo(() => {
    if (!allPurchases) return [];

    let result = [...allPurchases];

    // Filter by provider
    if (filters.providerIds.length > 0) {
      result = result.filter((p) => filters.providerIds.includes(p.providerId));
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.categoryName?.toLowerCase().includes(query) ||
          p.providerId.toLowerCase().includes(query),
      );
    }

    // Filter by "untagged only"
    if (filters.untaggedOnly && allTagAssignments) {
      const taggedIds = new Set(allTagAssignments.map((a) => a.targetId));
      result = result.filter((p) => !taggedIds.has(p.id));
    }

    // Filter by tags
    if (Object.keys(filters.tagFilters).length > 0 && allTagAssignments) {
      result = result.filter((purchase) => {
        return Object.entries(filters.tagFilters).every(
          ([tagGroupId, selectedValues]) => {
            const assignment = allTagAssignments.find(
              (a) => a.targetId === purchase.id && a.tagGroupId === tagGroupId,
            );
            if (!assignment) return false;
            return selectedValues.some((v) =>
              assignment.selectedValues.includes(v),
            );
          },
        );
      });
    }

    // Sort by date
    result.sort((a, b) => {
      const dateA = new Date(a.purchaseDate).getTime();
      const dateB = new Date(b.purchaseDate).getTime();
      return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [allPurchases, allTagAssignments, filters, sortDirection]);

  // Compute groups with derived data
  const groupsWithData = useMemo(() => {
    if (!allGroups || !allPurchases) return [];

    return allGroups.map((group) => {
      const memberPurchases = allPurchases.filter((p) =>
        group.purchaseIds.includes(p.id),
      );
      const totalPrice = memberPurchases.reduce((sum, p) => sum + p.price, 0);
      const latestDate = memberPurchases.length
        ? memberPurchases.reduce((latest, p) =>
            new Date(p.purchaseDate) > new Date(latest.purchaseDate) ? p : latest,
          ).purchaseDate
        : group.createdAt;
      const currency = memberPurchases[0]?.currency ?? 'PLN';

      return {
        group,
        memberPurchases,
        totalPrice,
        latestDate,
        currency,
      };
    });
  }, [allGroups, allPurchases]);

  // Get purchase IDs that are part of groups (to avoid showing them separately)
  const groupedPurchaseIds = useMemo(() => {
    if (!allGroups) return new Set<string>();
    return new Set(allGroups.flatMap((g) => g.purchaseIds));
  }, [allGroups]);

  // Ungrouped purchases (not part of any group)
  const ungroupedPurchases = useMemo(() => {
    return filteredPurchases.filter((p) => !groupedPurchaseIds.has(p.id));
  }, [filteredPurchases, groupedPurchaseIds]);

  // Build combined listing: groups + ungrouped purchases, sorted by date
  const listingItems = useMemo(() => {
    type ListingItem =
      | { type: 'purchase'; purchase: Purchase; date: string }
      | { type: 'group'; groupData: typeof groupsWithData[0]; date: string };

    const items: ListingItem[] = [];

    for (const purchase of ungroupedPurchases) {
      items.push({ type: 'purchase', purchase, date: purchase.purchaseDate });
    }

    for (const groupData of groupsWithData) {
      items.push({ type: 'group', groupData, date: groupData.latestDate });
    }

    items.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return items;
  }, [ungroupedPurchases, groupsWithData, sortDirection]);

  const totalCount = (allPurchases?.length ?? 0);

  // ─── Pagination ───────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(listingItems.length / PAGE_SIZE));

  // Reset to page 1 when filters/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortDirection]);

  // Clamp page if items shrink (e.g. after deletion)
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return listingItems.slice(start, start + PAGE_SIZE);
  }, [listingItems, currentPage]);

  const showPagination = listingItems.length > PAGE_SIZE;

  return (
    <div className="space-y-4">
      {/* Count indicator */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('purchases.totalItems', { count: totalCount })}
          {filteredPurchases.length !== totalCount &&
            ` (${filteredPurchases.length} ${t('common.filter').toLowerCase()})`}
        </p>
        {showPagination && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('common.page')} {currentPage} {t('common.of')} {totalPages}
          </p>
        )}
      </div>

      {/* Listing */}
      {listingItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">
            {totalCount === 0 ? t('purchases.noData') : t('common.noResults')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pagedItems.map((item) => {
            if (item.type === 'purchase') {
              return (
                <PurchaseCard
                  key={item.purchase.id}
                  purchase={item.purchase}
                  tagMode={tagMode}
                  isTagged={assignedTargetIds?.has(item.purchase.id)}
                  onTagToggle={onTagToggle ? () => onTagToggle(item.purchase.id, 'purchase') : undefined}
                />
              );
            }
            return (
              <PurchaseGroupCard
                key={item.groupData.group.id}
                group={item.groupData.group}
                memberPurchases={item.groupData.memberPurchases}
                totalPrice={item.groupData.totalPrice}
                latestDate={item.groupData.latestDate}
                currency={item.groupData.currency}
                tagMode={tagMode}
                isTagged={assignedTargetIds?.has(item.groupData.group.id)}
                onTagToggle={onTagToggle ? () => onTagToggle(item.groupData.group.id, 'group') : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {showPagination && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('common.previous')}
          </button>

          {/* Page number buttons */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // Show first, last, current, and neighbours
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
                if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                  acc.push('ellipsis');
                }
                acc.push(page);
                return acc;
              }, [])
              .map((item, idx) =>
                item === 'ellipsis' ? (
                  <span
                    key={`e-${idx}`}
                    className="px-1 text-sm text-gray-400 dark:text-gray-500"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setCurrentPage(item)}
                    className={`min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      item === currentPage
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {t('common.next')}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
