'use client';

import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { subscriptionPlansAPI } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SubscriptionPlanViewModel, CreateSubscriptionPlanDTO, UpdateSubscriptionPlanDTO } from '@/types/subscription';

export default function PlansPage() {
  const { t } = useI18n();
  const [plans, setPlans] = useState<SubscriptionPlanViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlanViewModel | null>(null);
  const [form, setForm] = useState<CreateSubscriptionPlanDTO>({
    name: '',
    description: '',
    price: 0,
    maxNumberOfRides: 1,
    durationInDays: 1,
    isActive: true
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
      const data = await subscriptionPlansAPI.getAll();
      setPlans(data || []);
    } catch (err: any) {
      const errorMessage = err?.message || t('pages.admin.plans.errors.loadFailedMsg', 'Failed to load plans');
      setError(errorMessage);
      showToast({ 
        type: 'error', 
        title: t('pages.admin.plans.errors.loadFailedTitle', 'Load Failed'), 
        message: errorMessage 
      });
    } finally {
      setLoading(false);
    }
  }, [t, showToast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      price: 0,
      maxNumberOfRides: 1,
      durationInDays: 1,
      isActive: true
    });
    setShowModal(true);
  };

  const openEdit = async (plan: SubscriptionPlanViewModel) => {
    try {
      // Fetch the latest plan data by ID
      const fetchedPlan = await subscriptionPlansAPI.getById(plan.id);
      if (fetchedPlan) {
        setEditing(fetchedPlan);
        setForm({
          name: fetchedPlan.name || '',
          description: fetchedPlan.description || '',
          price: fetchedPlan.price,
          maxNumberOfRides: fetchedPlan.maxNumberOfRides,
          durationInDays: fetchedPlan.durationInDays,
          isActive: fetchedPlan.isActive
        });
        setShowModal(true);
      } else {
        showToast({ 
          type: 'error', 
          title: t('pages.admin.plans.errors.error', 'Error'), 
          message: t('pages.admin.plans.errors.loadPlanDetails', 'Failed to load plan details') 
        });
      }
    } catch (err: any) {
      const errorMessage = err?.message || t('pages.admin.plans.errors.loadPlanDetails', 'Failed to load plan details');
      showToast({ 
        type: 'error', 
        title: t('pages.admin.plans.errors.error', 'Error'), 
        message: errorMessage 
      });
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const updateData: UpdateSubscriptionPlanDTO = {
          name: form.name,
          description: form.description || null,
          price: form.price,
          maxNumberOfRides: form.maxNumberOfRides,
          durationInDays: form.durationInDays,
          isActive: form.isActive
        };
        const response = await subscriptionPlansAPI.update(editing.id, updateData);
        if (response.success) {
          await load();
          showToast({ 
            type: 'success', 
            title: t('pages.admin.plans.toasts.planUpdated', 'Plan Updated'), 
            message: `${form.name} ${t('pages.admin.plans.toasts.updatedSuccessfully', 'has been updated successfully')}` 
          });
        } else {
          throw new Error(response.message || t('pages.admin.plans.errors.updateFailed', 'Update failed'));
        }
      } else {
        const createData: CreateSubscriptionPlanDTO = {
          name: form.name,
          description: form.description || undefined,
          price: form.price,
          maxNumberOfRides: form.maxNumberOfRides,
          durationInDays: form.durationInDays,
          isActive: form.isActive
        };
        const response = await subscriptionPlansAPI.create(createData);
        if (response.success) {
          await load();
          showToast({ 
            type: 'success', 
            title: t('pages.admin.plans.toasts.planCreated', 'Plan Created'), 
            message: `${form.name} ${t('pages.admin.plans.toasts.createdSuccessfully', 'has been created successfully')}` 
          });
        } else {
          throw new Error(response.message || t('pages.admin.plans.errors.creationFailed', 'Creation failed'));
        }
      }
      setShowModal(false);
    } catch (err: any) {
      const errorMessage = err?.message || t('pages.admin.plans.errors.saveFailedMsg', 'Failed to save plan');
      showToast({ 
        type: 'error', 
        title: t('pages.admin.plans.errors.saveFailedTitle', 'Save Failed'), 
        message: errorMessage 
      });
    }
  };

  const handleDelete = (id: number) => {
    setConfirmState({ 
      open: true, 
      id, 
      action: 'delete',
  title: t('pages.admin.plans.confirms.deleteTitle', 'Delete Plan'),
  description: t('pages.admin.plans.confirms.deleteDesc', 'Are you sure you want to delete this plan? This action cannot be undone.')
    });
  };

  const handleActivate = (id: number) => {
    setConfirmState({ 
      open: true, 
      id, 
      action: 'activate',
  title: t('pages.admin.plans.confirms.activateTitle', 'Activate Plan'),
  description: t('pages.admin.plans.confirms.activateDesc', 'Are you sure you want to activate this plan?')
    });
  };

  const handleDeactivate = (id: number) => {
    setConfirmState({ 
      open: true, 
      id, 
      action: 'deactivate',
  title: t('pages.admin.plans.confirms.deactivateTitle', 'Deactivate Plan'),
  description: t('pages.admin.plans.confirms.deactivateDesc', 'Are you sure you want to deactivate this plan?')
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmState.id || !confirmState.action) return;
    
    try {
  let response;
  let successMessage = '';
      
      switch (confirmState.action) {
        case 'delete':
          response = await subscriptionPlansAPI.delete(confirmState.id);
          successMessage = t('pages.admin.plans.toasts.planDeleted', 'Plan deleted successfully');
          break;
        case 'activate':
          response = await subscriptionPlansAPI.activate(confirmState.id);
          successMessage = t('pages.admin.plans.toasts.planActivated', 'Plan activated successfully');
          break;
        case 'deactivate':
          response = await subscriptionPlansAPI.deactivate(confirmState.id);
          successMessage = t('pages.admin.plans.toasts.planDeactivated', 'Plan deactivated successfully');
          break;
      }

      if (response.success) {
        await load();
        showToast({ 
          type: 'success', 
          title: t('pages.admin.plans.toasts.successTitle', 'Success'), 
          message: successMessage 
        });
      } else {
        throw new Error(response.message || t('pages.admin.plans.errors.actionFailed', 'Action failed'));
      }
    } catch (err: any) {
      const errorMessage = err?.message || t('pages.admin.plans.errors.actionFailed', 'Action failed');
      showToast({ 
        type: 'error', 
        title: t('pages.admin.plans.errors.actionFailedTitle', 'Action Failed'), 
        message: errorMessage 
      });
    } finally {
      setConfirmState({ open: false });
    }
  };

  if (loading) {
    return <div className="p-6">{t('pages.admin.plans.loading', 'Loading...')}</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('pages.admin.plans.title', 'Subscription Plans')}</h1>
          <p className="text-gray-600">{t('pages.admin.plans.subtitle', 'Manage available subscription plans')}</p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />{t('pages.admin.plans.addPlan', 'Add Plan')}</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('pages.admin.plans.listTitle', 'Plans')}</CardTitle>
          <CardDescription>{plans.length} {t('pages.admin.plans.listCountLabel', 'plan(s)')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
          <Table className="min-w-[720px] sm:min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead>{t('pages.admin.plans.table.id', 'ID')}</TableHead>
                <TableHead>{t('pages.admin.plans.table.name', 'Name')}</TableHead>
                <TableHead>{t('pages.admin.plans.table.description', 'Description')}</TableHead>
                <TableHead>{t('pages.admin.plans.table.price', 'Price')}</TableHead>
                <TableHead>{t('pages.admin.plans.table.durationDays', 'Duration (days)')}</TableHead>
                <TableHead>{t('pages.admin.plans.table.status', 'Status')}</TableHead>
                <TableHead>{t('pages.admin.plans.table.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map(plan => (
                <TableRow key={plan.id} className={plan.isActive ? 'bg-green-50' : 'bg-red-50'}>
                  <TableCell className="font-mono text-xs">{plan.id}</TableCell>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{plan.description || t('common.na', 'N/A')}</TableCell>
                  <TableCell>${Number(plan.price || 0).toFixed(2)}</TableCell>
                  <TableCell>{plan.durationInDays}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      plan.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {plan.isActive ? t('pages.admin.plans.status.active', 'Active') : t('pages.admin.plans.status.inactive', 'Inactive')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openEdit(plan)}
                        title={t('pages.admin.plans.actions.editPlan', 'Edit Plan')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {plan.isActive ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeactivate(plan.id)}
                          title={t('pages.admin.plans.actions.deactivatePlan', 'Deactivate Plan')}
                        >
                          <PowerOff className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleActivate(plan.id)}
                          title={t('pages.admin.plans.actions.activatePlan', 'Activate Plan')}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(plan.id)}
                        title={t('pages.admin.plans.actions.deletePlan', 'Delete Plan')}
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? t('pages.admin.plans.modal.editTitle', 'Edit Plan') : t('pages.admin.plans.modal.addTitle', 'Add Plan')} size="md">
        <form onSubmit={save} className="space-y-4">
          {/* Basic Details */}
          <div className="rounded-xl border bg-sky-50/60 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">{t('pages.admin.plans.sections.basicDetails', 'Basic Details')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.admin.plans.form.name', 'Name')} *</label>
                <p className="text-xs text-gray-500 mb-2">{t('pages.admin.plans.form.nameHint', '3-100 characters, unique plan name.')}</p>
                <Input 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  required 
                  minLength={3} 
                  maxLength={100}
                  placeholder={t('pages.admin.plans.form.nameEg', 'e.g. Standard Monthly')}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.admin.plans.form.description', 'Description')}</label>
                <p className="text-xs text-gray-500 mb-2">{t('pages.admin.plans.form.descriptionHint', 'Optional. Up to 500 characters.')}</p>
                <Input 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  maxLength={500}
                  placeholder={t('pages.admin.plans.form.descriptionPh', 'Short summary of the plan')}
                />
              </div>
            </div>
          </div>

          {/* Pricing & Duration */}
          <div className="rounded-xl border bg-emerald-50/60 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">{t('pages.admin.plans.sections.pricingDuration', 'Pricing & Duration')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.admin.plans.form.price', 'Price')} *</label>
                <p className="text-xs text-gray-500 mb-2">{t('pages.admin.plans.form.priceHint', 'Minimum 0.01. Use two decimals.')}</p>
                <Input 
                  type="number" 
                  value={form.price} 
                  onChange={e => setForm({ ...form, price: Number(e.target.value) })} 
                  min={0.01} 
                  step={0.01} 
                  required
                  placeholder={t('pages.admin.plans.form.pricePh', '0.00')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.admin.plans.form.durationDays', 'Duration (days)')} *</label>
                <p className="text-xs text-gray-500 mb-2">{t('pages.admin.plans.form.durationHint', '1 - 365 days.')}</p>
                <Input 
                  type="number" 
                  value={form.durationInDays} 
                  onChange={e => setForm({ ...form, durationInDays: Number(e.target.value) })} 
                  min={1} 
                  max={365} 
                  required
                  placeholder={t('pages.admin.plans.form.durationPh', '30')}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="w-full sm:w-auto">
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              {editing ? t('pages.admin.plans.form.saveChanges', 'Save Changes') : t('pages.admin.plans.form.createPlan', 'Create Plan')}
            </Button>
          </div>
        </form>
      </Modal>
      
      <ConfirmDialog 
        open={confirmState.open} 
        onCancel={() => setConfirmState({ open: false })} 
        onConfirm={handleConfirmAction} 
        title={confirmState.title || t('pages.admin.plans.confirms.confirmTitle', 'Confirm Action')}
        description={confirmState.description || t('pages.admin.plans.confirms.confirmDesc', 'Are you sure?')}
      />
    </div>
  );
}


