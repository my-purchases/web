import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useTagStore } from '@/stores';
import { Button } from '@/components/common';
import { Modal } from '@/components/common';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

export function TagGroupManager() {
  const { t } = useTranslation();
  const { createTagGroup, updateTagGroup, deleteTagGroup } = useTagStore();
  const tagGroups = useLiveQuery(() => db.tagGroups.toArray(), []);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [values, setValues] = useState<string[]>([]);
  const [newValue, setNewValue] = useState('');

  const resetForm = () => {
    setName('');
    setValues([]);
    setNewValue('');
    setEditingId(null);
    setIsCreateOpen(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createTagGroup(name.trim(), values);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingId || !name.trim()) return;
    await updateTagGroup(editingId, { name: name.trim(), values });
    resetForm();
  };

  const handleDelete = async (id: string, groupName: string) => {
    if (window.confirm(t('tags.confirmDelete', { name: groupName }))) {
      await deleteTagGroup(id);
    }
  };

  const startEdit = (id: string) => {
    const group = tagGroups?.find((g) => g.id === id);
    if (group) {
      setEditingId(id);
      setName(group.name);
      setValues([...group.values]);
      setIsCreateOpen(true);
    }
  };

  const addValue = () => {
    if (newValue.trim() && !values.includes(newValue.trim())) {
      setValues([...values, newValue.trim()]);
      setNewValue('');
    }
  };

  const removeValue = (index: number) => {
    setValues(values.filter((_, i) => i !== index));
  };

  const isModalOpen = isCreateOpen || editingId !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('tags.groups')}
        </h3>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {t('tags.createGroup')}
        </Button>
      </div>

      {/* Existing tag groups */}
      {!tagGroups?.length ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('tags.noGroups')}
        </p>
      ) : (
        <div className="space-y-2">
          {tagGroups.map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-800"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {group.name}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {group.values.map((value) => (
                    <span
                      key={value}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(group.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(group.id, group.name)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingId ? t('tags.editGroup') : t('tags.createGroup')}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('tags.groupName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('tags.groupNamePlaceholder')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('tags.values')}
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {values.map((value, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                >
                  {value}
                  <button
                    onClick={() => removeValue(index)}
                    className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addValue();
                  }
                }}
                placeholder={t('tags.valuePlaceholder')}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
              <Button variant="secondary" size="sm" onClick={addValue}>
                {t('tags.addValue')}
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={resetForm}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={!name.trim()}
            >
              {editingId ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
