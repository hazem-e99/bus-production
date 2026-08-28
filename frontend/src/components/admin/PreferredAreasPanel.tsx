'use client';

import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { preferredAreasAPI } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PreferredAreaViewModel, CreatePreferredAreaDTO, UpdatePreferredAreaDTO } from '@/types/preferredArea';

export default function PreferredAreasPanel() {
  const { t } = useI18n();
  const [areas, setAreas] = useState<PreferredAreaViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PreferredAreaViewModel | null>(null);
  const [form, setForm] = useState<CreatePreferredAreaDTO>({
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
      const data = await preferredAreasAPI.getAll();
      setAreas(data || []);
    } catch (err: any) {
      const errorMessage = err?.message || t('pages.admin.preferredAreas.errors.loadFailedMsg', 'Failed to load preferred areas');
      setError(errorMessage);
      showToast({
        type: 'error',
        title: t('pages.admin.preferredAreas.errors.loadFailedTitle', 'Load Failed'),
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

  const openEdit = async (area: PreferredAreaViewModel) => {
    try {
      const fetched = await preferredAreasAPI.getById(area.id);
      if (fetched) {
        setEditing(fetched);
        setForm({ name: fetched.name || '', isActive: fetched.isActive });
        setShowModal(true);
      } else {
        showToast({
          type: 'error',
          title: t('pages.admin.preferredAreas.errors.error', 'Error'),
          message: t('pages.admin.preferredAreas.errors.loadAreaDetails', 'Failed to load area details'),
        });
      }
    } catch (err: any) {
      const errorMessage = err?.message || t('pages.admin.preferredAreas.errors.loadAreaDetails', 'Failed to load area details');
      showToast({
        type: 'error',
        title: t('pages.admin.preferredAreas.errors.error', 'Error'),
        message: errorMessage,
      });
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const updateData: UpdatePreferredAreaDTO = { name: form.name, isActive: form.isActive };
        const response = await preferredAreasAPI.update(editing.id, updateData);
        if (response.success) {
          await load();
          showToast({
            type: 'success',
            title: t('pages.admin.preferredAreas.toasts.areaUpdated', 'Area Updated'),
            message: `${form.name} ${t('pages.admin.preferredAreas.toasts.updatedSuccessfully', 'has been updated successfully')}`,
          });
        } else {
          throw new Error(response.message || t('pages.admin.preferredAreas.errors.updateFailed', 'Update failed'));
        }
      } else {
        const createData: CreatePreferredAreaDTO = { name: form.name, isActive: form.isActive };
        const response = await preferredAreasAPI.create(createData);
        if (response.success) {
          await load();
          showToast({
            type: 'success',
            title: t('pages.admin.preferredAreas.toasts.areaCreated', 'Area Created'),
            message: `${form.name} ${t('pages.admin.preferredAreas.toasts.createdSuccessfully', 'has been created successfully')}`,
          });
        } else {
          throw new Error(response.message || t('pages.admin.preferredAreas.errors.creationFailed', 'Creation failed'));
        }
      }
      setShowModal(false);
    } catch (err: any) {
      const errorMessage = err?.message || t('pages.admin.preferredAreas.errors.saveFailedMsg', 'Failed to save area');
      showToast({
        type: 'error',
        title: t('pages.admin.preferredAreas.errors.saveFailedTitle', 'Save Failed'),
        message: errorMessage,
      });
    }
  };

  const handleDelete = (id: number) => {
    setConfirmState({
      open: true,
      id,
      action: 'delete',
      title: t('pages.admin.preferredAreas.confirms.deleteTitle', 'Delete Area'),
      description: t('pages.admin.preferredAreas.confirms.deleteDesc', 'Are you sure you want to delete this area? Students who already selected it keep their saved value, but it will no longer appear on the registration form.'),
    });
  };

  const handleActivate = (id: number) => {
    setConfirmState({
      open: true,
      id,
      action: 'activate',
      title: t('pages.admin.preferredAreas.confirms.activateTitle', 'Activate Area'),
      description: t('pages.admin.preferredAreas.confirms.activateDesc', 'Are you sure you want to activate this area? It will appear on the registration form again.'),
    });
  };

  const handleDeactivate = (id: number) => {
    setConfirmState({
      open: true,
      id,
      action: 'deactivate',
      title: t('pages.admin.preferredAreas.confirms.deactivateTitle', 'Deactivate Area'),
      description: t('pages.admin.preferredAreas.confirms.deactivateDesc', 'Are you sure you want to deactivate this area? It will be hidden from the registration form.'),
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmState.id || !confirmState.action) return;

    try {
      let response;
      let successMessage = '';

      switch (confirmState.action) {
        case 'delete':
          response = await preferredAreasAPI.delete(confirmState.id);
          successMessage = t('pages.admin.preferredAreas.toasts.areaDeleted', 'Area deleted successfully');
          break;
        case 'activate':
          response = await preferredAreasAPI.activate(confirmState.id);
          successMessage = t('pages.admin.preferredAreas.toasts.areaActivated', 'Area activated successfully');
          break;
        case 'deactivate':
          response = await preferredAreasAPI.deactivate(confirmState.id);
          successMessage = t('pages.admin.preferredAreas.toasts.areaDeactivated', 'Area deactivated successfully');
          break;
      }

      if (response.success) {
        await load();
        showToast({
          type: 'success',
          title: t('pages.admin.preferredAreas.toasts.successTitle', 'Success'),
          message: successMessage,
        });
      } else {
        throw new Error(response.message || t('pages.admin.preferredAreas.errors.actionFailed', 'Action failed'));
      }
    } catch (err: any) {
      const errorMessage = err?.message || t('pages.admin.preferredAreas.errors.actionFailed', 'Action failed');
      showToast({
        type: 'error',
        title: t('pages.admin.preferredAreas.errors.actionFailedTitle', 'Action Failed'),
        message: errorMessage,
      });
    } finally {
      setConfirmState({ open: false });
    }
  };

  if (loading) {
    return <div className="p-6">{t('pages.admin.preferredAreas.loading', 'Loading...')}</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('pages.admin.preferredAreas.title', 'Preferred Areas')}</h1>
          <p className="text-gray-600">{t('pages.admin.preferredAreas.subtitle', 'Manage the areas students can select at registration')}</p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />{t('pages.admin.preferredAreas.addButton', 'Add Area')}</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('pages.admin.preferredAreas.listTitle', 'Areas')}</CardTitle>
          <CardDescription>{areas.length} {t('pages.admin.preferredAreas.listCountLabel', 'area(s)')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
          <Table className="min-w-[480px] sm:min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead>{t('pages.admin.preferredAreas.table.id', 'ID')}</TableHead>
                <TableHead>{t('pages.admin.preferredAreas.table.name', 'Name')}</TableHead>
                <TableHead>{t('pages.admin.preferredAreas.table.status', 'Status')}</TableHead>
                <TableHead>{t('pages.admin.preferredAreas.table.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.map(area => (
                <TableRow key={area.id} className={area.isActive ? 'bg-green-50' : 'bg-red-50'}>
                  <TableCell className="font-mono text-xs">{area.id}</TableCell>
                  <TableCell className="font-medium">{area.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      area.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {area.isActive ? t('pages.admin.preferredAreas.status.active', 'Active') : t('pages.admin.preferredAreas.status.inactive', 'Inactive')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(area)}
                        title={t('pages.admin.preferredAreas.actions.editArea', 'Edit Area')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {area.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivate(area.id)}
                          title={t('pages.admin.preferredAreas.actions.deactivateArea', 'Deactivate Area')}
                        >
                          <PowerOff className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(area.id)}
                          title={t('pages.admin.preferredAreas.actions.activateArea', 'Activate Area')}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(area.id)}
                        title={t('pages.admin.preferredAreas.actions.deleteArea', 'Delete Area')}
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? t('pages.admin.preferredAreas.modal.editTitle', 'Edit Area') : t('pages.admin.preferredAreas.modal.addTitle', 'Add Area')} size="md">
        <form onSubmit={save} className="space-y-4">
          <div className="rounded-xl border bg-sky-50/60 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.admin.preferredAreas.form.name', 'Name')} *</label>
              <p className="text-xs text-gray-500 mb-2">{t('pages.admin.preferredAreas.form.nameHint', '2-100 characters, e.g. a district or city name.')}</p>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                minLength={2}
                maxLength={100}
                placeholder={t('pages.admin.preferredAreas.form.namePlaceholder', 'e.g. مدينة نصر')}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="w-full sm:w-auto">
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              {editing ? t('pages.admin.preferredAreas.form.saveChanges', 'Save Changes') : t('pages.admin.preferredAreas.form.createArea', 'Create Area')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmState.open}
        onCancel={() => setConfirmState({ open: false })}
        onConfirm={handleConfirmAction}
        title={confirmState.title || t('pages.admin.preferredAreas.confirms.confirmTitle', 'Confirm Action')}
        description={confirmState.description || t('pages.admin.preferredAreas.confirms.confirmDesc', 'Are you sure?')}
      />
    </div>
  );
}
