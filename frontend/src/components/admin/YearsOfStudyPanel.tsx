'use client';

import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { yearsOfStudyAPI } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { YearOfStudyViewModel, CreateYearOfStudyDTO, UpdateYearOfStudyDTO } from '@/types/yearOfStudy';

export default function YearsOfStudyPanel() {
  const { t } = useI18n();
  const [years, setYears] = useState<YearOfStudyViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<YearOfStudyViewModel | null>(null);
  const [form, setForm] = useState<CreateYearOfStudyDTO>({
    name: '',
    isActive: true,
  });
  const { showToast } = useToast();
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    id?: number;
    action?: 'delete' | 'activate' | 'deactivate';
    title?: string;
    description?: string;
  }>({ open: false });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await yearsOfStudyAPI.getAll();
      setYears(data || []);
    } catch (err: any) {
      const errorMessage = err?.message || t('pages.admin.yearsOfStudy.errors.loadFailedMsg', 'Failed to load years of study');
      setError(errorMessage);
      showToast({
        type: 'error',
        title: t('pages.admin.yearsOfStudy.errors.loadFailedTitle', 'Load Failed'),
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [t, showToast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = async (year: YearOfStudyViewModel) => {
    try {
      const fetched = await yearsOfStudyAPI.getById(year.id);
      if (fetched) {
        setEditing(fetched);
        setForm({ name: fetched.name || '', isActive: fetched.isActive });
        setShowModal(true);
      } else {
        showToast({
          type: 'error',
          title: t('pages.admin.yearsOfStudy.errors.error', 'Error'),
          message: t('pages.admin.yearsOfStudy.errors.loadItemDetails', 'Failed to load year details'),
        });
      }
    } catch (err: any) {
      const errorMessage = err?.message || t('pages.admin.yearsOfStudy.errors.loadItemDetails', 'Failed to load year details');
      showToast({
        type: 'error',
        title: t('pages.admin.yearsOfStudy.errors.error', 'Error'),
        message: errorMessage,
      });
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const updateData: UpdateYearOfStudyDTO = { name: form.name, isActive: form.isActive };
        const response = await yearsOfStudyAPI.update(editing.id, updateData);
        if (response.success) {
          await load();
          showToast({
            type: 'success',
            title: t('pages.admin.yearsOfStudy.toasts.itemUpdated', 'Year Updated'),
            message: `${form.name} ${t('pages.admin.yearsOfStudy.toasts.updatedSuccessfully', 'has been updated successfully')}`,
          });
        } else {
          throw new Error(response.message || t('pages.admin.yearsOfStudy.errors.updateFailed', 'Update failed'));
        }
      } else {
        const createData: CreateYearOfStudyDTO = { name: form.name, isActive: form.isActive };
        const response = await yearsOfStudyAPI.create(createData);
        if (response.success) {
          await load();
          showToast({
            type: 'success',
            title: t('pages.admin.yearsOfStudy.toasts.itemCreated', 'Year Created'),
            message: `${form.name} ${t('pages.admin.yearsOfStudy.toasts.createdSuccessfully', 'has been created successfully')}`,
          });
        } else {
          throw new Error(response.message || t('pages.admin.yearsOfStudy.errors.creationFailed', 'Creation failed'));
        }
      }
      setShowModal(false);
    } catch (err: any) {
      const errorMessage = err?.message || t('pages.admin.yearsOfStudy.errors.saveFailedMsg', 'Failed to save year');
      showToast({
        type: 'error',
        title: t('pages.admin.yearsOfStudy.errors.saveFailedTitle', 'Save Failed'),
        message: errorMessage,
      });
    }
  };

  const handleDelete = (id: number) => {
    setConfirmState({
      open: true,
      id,
      action: 'delete',
      title: t('pages.admin.yearsOfStudy.confirms.deleteTitle', 'Delete Year'),
      description: t('pages.admin.yearsOfStudy.confirms.deleteDesc', 'Are you sure you want to delete this year? Students who already selected it keep their saved value, but it will no longer appear on the registration form.'),
    });
  };

  const handleActivate = (id: number) => {
    setConfirmState({
      open: true,
      id,
      action: 'activate',
      title: t('pages.admin.yearsOfStudy.confirms.activateTitle', 'Activate Year'),
      description: t('pages.admin.yearsOfStudy.confirms.activateDesc', 'Are you sure you want to activate this year? It will appear on the registration form again.'),
    });
  };

  const handleDeactivate = (id: number) => {
    setConfirmState({
      open: true,
      id,
      action: 'deactivate',
      title: t('pages.admin.yearsOfStudy.confirms.deactivateTitle', 'Deactivate Year'),
      description: t('pages.admin.yearsOfStudy.confirms.deactivateDesc', 'Are you sure you want to deactivate this year? It will be hidden from the registration form.'),
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmState.id || !confirmState.action) return;

    try {
      let response;
      let successMessage = '';

      switch (confirmState.action) {
        case 'delete':
          response = await yearsOfStudyAPI.delete(confirmState.id);
          successMessage = t('pages.admin.yearsOfStudy.toasts.itemDeleted', 'Year deleted successfully');
          break;
        case 'activate':
          response = await yearsOfStudyAPI.activate(confirmState.id);
          successMessage = t('pages.admin.yearsOfStudy.toasts.itemActivated', 'Year activated successfully');
          break;
        case 'deactivate':
          response = await yearsOfStudyAPI.deactivate(confirmState.id);
          successMessage = t('pages.admin.yearsOfStudy.toasts.itemDeactivated', 'Year deactivated successfully');
          break;
      }

      if (response.success) {
        await load();
        showToast({
          type: 'success',
          title: t('pages.admin.yearsOfStudy.toasts.successTitle', 'Success'),
          message: successMessage,
        });
      } else {
        throw new Error(response.message || t('pages.admin.yearsOfStudy.errors.actionFailed', 'Action failed'));
      }
    } catch (err: any) {
      const errorMessage = err?.message || t('pages.admin.yearsOfStudy.errors.actionFailed', 'Action failed');
      showToast({
        type: 'error',
        title: t('pages.admin.yearsOfStudy.errors.actionFailedTitle', 'Action Failed'),
        message: errorMessage,
      });
    } finally {
      setConfirmState({ open: false });
    }
  };

  if (loading) {
    return <div className="p-6">{t('pages.admin.yearsOfStudy.loading', 'Loading...')}</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('pages.admin.yearsOfStudy.title', 'Years of Study')}</h1>
          <p className="text-gray-600">{t('pages.admin.yearsOfStudy.subtitle', 'Manage the years of study students can select at registration')}</p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />{t('pages.admin.yearsOfStudy.addButton', 'Add Year')}</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('pages.admin.yearsOfStudy.listTitle', 'Years of Study')}</CardTitle>
          <CardDescription>{years.length} {t('pages.admin.yearsOfStudy.listCountLabel', 'year(s)')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
          <Table className="min-w-[480px] sm:min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead>{t('pages.admin.yearsOfStudy.table.id', 'ID')}</TableHead>
                <TableHead>{t('pages.admin.yearsOfStudy.table.name', 'Name')}</TableHead>
                <TableHead>{t('pages.admin.yearsOfStudy.table.status', 'Status')}</TableHead>
                <TableHead>{t('pages.admin.yearsOfStudy.table.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map(year => (
                <TableRow key={year.id} className={year.isActive ? 'bg-green-50' : 'bg-red-50'}>
                  <TableCell className="font-mono text-xs">{year.id}</TableCell>
                  <TableCell className="font-medium">{year.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      year.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {year.isActive ? t('pages.admin.yearsOfStudy.status.active', 'Active') : t('pages.admin.yearsOfStudy.status.inactive', 'Inactive')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(year)}
                        title={t('pages.admin.yearsOfStudy.actions.editItem', 'Edit Year')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {year.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivate(year.id)}
                          title={t('pages.admin.yearsOfStudy.actions.deactivateItem', 'Deactivate Year')}
                        >
                          <PowerOff className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(year.id)}
                          title={t('pages.admin.yearsOfStudy.actions.activateItem', 'Activate Year')}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(year.id)}
                        title={t('pages.admin.yearsOfStudy.actions.deleteItem', 'Delete Year')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? t('pages.admin.yearsOfStudy.modal.editTitle', 'Edit Year') : t('pages.admin.yearsOfStudy.modal.addTitle', 'Add Year')} size="md">
        <form onSubmit={save} className="space-y-4">
          <div className="rounded-xl border bg-sky-50/60 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.admin.yearsOfStudy.form.name', 'Name')} *</label>
              <p className="text-xs text-gray-500 mb-2">{t('pages.admin.yearsOfStudy.form.nameHint', '2-100 characters, e.g. FirstYear.')}</p>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                minLength={2}
                maxLength={100}
                placeholder={t('pages.admin.yearsOfStudy.form.namePlaceholder', 'e.g. FirstYear')}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="w-full sm:w-auto">
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              {editing ? t('pages.admin.yearsOfStudy.form.saveChanges', 'Save Changes') : t('pages.admin.yearsOfStudy.form.createItem', 'Create Year')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmState.open}
        onCancel={() => setConfirmState({ open: false })}
        onConfirm={handleConfirmAction}
        title={confirmState.title || t('pages.admin.yearsOfStudy.confirms.confirmTitle', 'Confirm Action')}
        description={confirmState.description || t('pages.admin.yearsOfStudy.confirms.confirmDesc', 'Are you sure?')}
      />
    </div>
  );
}
