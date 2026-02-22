// Analytics event definitions for the application
// All user interactions should be tracked through these events

export const AnalyticsEvents = {
  // Navigation
  PAGE_VIEW: 'page_view',
  LANGUAGE_CHANGED: 'language_changed',

  // Invitations
  INVITATION_ENTERED: 'invitation_entered',
  INVITATION_LOADED: 'invitation_loaded',
  INVITATION_CLEARED: 'invitation_cleared',
  INVITATION_IMPORT: 'invitation_import',

  // Providers
  PROVIDER_SYNC_STARTED: 'provider_sync_started',
  PROVIDER_SYNC_COMPLETED: 'provider_sync_completed',
  PROVIDER_SYNC_FAILED: 'provider_sync_failed',

  // Purchases
  PURCHASE_LIST_VIEWED: 'purchase_list_viewed',
  PURCHASE_FILTER_CHANGED: 'purchase_filter_changed',
  PURCHASE_SORT_CHANGED: 'purchase_sort_changed',
  PURCHASE_SEARCH: 'purchase_search',
  PURCHASE_CARD_CLICKED: 'purchase_card_clicked',

  // Tags
  TAG_GROUP_CREATED: 'tag_group_created',
  TAG_GROUP_UPDATED: 'tag_group_updated',
  TAG_GROUP_DELETED: 'tag_group_deleted',
  TAG_ASSIGNED: 'tag_assigned',
  TAG_UNASSIGNED: 'tag_unassigned',
  TAG_FILTER_APPLIED: 'tag_filter_applied',

  // Groups (compound purchases)
  PURCHASE_GROUP_CREATED: 'purchase_group_created',
  PURCHASE_GROUP_UPDATED: 'purchase_group_updated',
  PURCHASE_GROUP_DELETED: 'purchase_group_deleted',
  PURCHASE_ADDED_TO_GROUP: 'purchase_added_to_group',
  PURCHASE_REMOVED_FROM_GROUP: 'purchase_removed_from_group',

  // Export / Import
  EXPORT_STARTED: 'export_started',
  EXPORT_COMPLETED: 'export_completed',
  IMPORT_STARTED: 'import_started',
  IMPORT_COMPLETED: 'import_completed',
  IMPORT_FAILED: 'import_failed',

  // Import from providers
  FILE_IMPORT_STARTED: 'file_import_started',
  FILE_IMPORT_COMPLETED: 'file_import_completed',
  FILE_IMPORT_FAILED: 'file_import_failed',

  // Settings
  SETTINGS_CHANGED: 'settings_changed',
  THEME_CHANGED: 'theme_changed',

  // Data management
  DATA_CLEARED: 'data_cleared',
  INVITATION_REMOVED: 'invitation_removed',
} as const;

export type AnalyticsEvent = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];
