'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/contexts/LanguageContext';
import { votingAPI } from '@/lib/api';
import { Plus, Trash2, Eye, Power, PowerOff, BarChart3, ChevronDown, ChevronUp, X } from 'lucide-react';

interface SurveyQuestion {
  questionText: string;
  questionType: 'multiple-choice' | 'yes-no' | 'rating' | 'text';
  options: string[];
  isRequired: boolean;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  createdByName?: string;
  questions: Array<SurveyQuestion & { index: number }>;
  isRecurringDaily: boolean;
  dailyOpenTime?: string;
  dailyCloseTime?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export default function AdminVotingPage() {
  const { showToast } = useToast();
  const { t } = useI18n();
  const P = 'pages.admin.voting';
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  const [formVisible, setFormVisible] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);

  const [resultsVisible, setResultsVisible] = useState(false);
  const [resultsData, setResultsData] = useState<any>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; action?: string; title?: string; desc?: string }>({ open: false });

  const QUESTION_TYPES = [
    { value: 'multiple-choice', label: t(`${P}.questionTypes.multipleChoice`, 'Multiple Choice') },
    { value: 'yes-no', label: t(`${P}.questionTypes.yesNo`, 'Yes / No') },
    { value: 'rating', label: t(`${P}.questionTypes.rating`, 'Rating (1-5)') },
    { value: 'text', label: t(`${P}.questionTypes.text`, 'Text Answer') },
  ];

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await votingAPI.getAll();
      setSurveys(resp?.data || []);
    } catch (err: any) {
      showToast({ type: 'error', title: t(`${P}.toasts.error`, 'Error'), message: err.message || t(`${P}.toasts.loadFailed`, 'Failed to load surveys') });
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingSurvey(null);
    setTitle(''); setDescription(''); setIsRecurring(false);
    setOpenTime('09:00'); setCloseTime('17:00'); setStartDate(''); setEndDate('');
    setQuestions([{ questionText: '', questionType: 'multiple-choice', options: ['', ''], isRequired: true }]);
    setFormVisible(true);
  };

  const openEdit = (survey: Survey) => {
    setEditingSurvey(survey);
    setTitle(survey.title);
    setDescription(survey.description || '');
    setIsRecurring(survey.isRecurringDaily);
    setOpenTime(survey.dailyOpenTime || '');
    setCloseTime(survey.dailyCloseTime || '');
    setStartDate(survey.startDate || '');
    setEndDate(survey.endDate || '');
    setQuestions(survey.questions.map(q => ({
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options?.length ? [...q.options] : ['', ''],
      isRequired: q.isRequired,
    })));
    setFormVisible(true);
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, { questionText: '', questionType: 'multiple-choice', options: ['', ''], isRequired: false }]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== idx) return q;
      const updated = { ...q, [field]: value };
      if (field === 'questionType' && value === 'yes-no') updated.options = ['Yes', 'No'];
      if (field === 'questionType' && value === 'rating') updated.options = ['1', '2', '3', '4', '5'];
      if (field === 'questionType' && value === 'text') updated.options = [];
      return updated;
    }));
  };

  const addOption = (qIdx: number) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: [...q.options, ''] } : q));
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? value : o) } : q));
  };

  const handleSave = async () => {
    if (!title.trim()) { showToast({ type: 'error', title: t(`${P}.toasts.error`, 'Error'), message: t(`${P}.form.titleRequired`, 'Title is required') }); return; }
    if (questions.length === 0) { showToast({ type: 'error', title: t(`${P}.toasts.error`, 'Error'), message: t(`${P}.form.atLeastOneQuestion`, 'Add at least one question') }); return; }
    for (const q of questions) {
      if (!q.questionText.trim()) { showToast({ type: 'error', title: t(`${P}.toasts.error`, 'Error'), message: t(`${P}.form.allQuestionsMustHaveText`, 'All questions must have text') }); return; }
      if (q.questionType === 'multiple-choice' && q.options.filter(o => o.trim()).length < 2) {
        showToast({ type: 'error', title: t(`${P}.toasts.error`, 'Error'), message: `"${q.questionText}" ${t(`${P}.form.needsAtLeast2Options`, 'needs at least 2 options')}` }); return;
      }
    }

    if (isRecurring) {
      if (!openTime || !closeTime) {
        showToast({
          type: 'error',
          title: t(`${P}.toasts.error`, 'Error'),
          message: t(`${P}.form.recurringNeedsTimes`, 'Open and close time are required for daily recurring surveys'),
        });
        return;
      }

      if (closeTime <= openTime) {
        showToast({
          type: 'error',
          title: t(`${P}.toasts.error`, 'Error'),
          message: t(`${P}.form.closeMustBeAfterOpen`, 'Close time must be after open time in the same day'),
        });
        return;
      }
    }

    if (startDate && endDate && endDate < startDate) {
      showToast({
        type: 'error',
        title: t(`${P}.toasts.error`, 'Error'),
        message: t(`${P}.form.endDateMustBeAfterStart`, 'End date must be on or after start date'),
      });
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      questions: questions.map(q => ({
        questionText: q.questionText.trim(),
        questionType: q.questionType,
        options: q.options.filter(o => o.trim()),
        isRequired: q.isRequired,
      })),
      isRecurringDaily: isRecurring,
      dailyOpenTime: openTime || undefined,
      dailyCloseTime: closeTime || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    try {
      if (editingSurvey) {
        await votingAPI.update(editingSurvey.id, payload);
        showToast({ type: 'success', title: t(`${P}.toasts.updated`, 'Survey updated successfully'), message: '' });
      } else {
        await votingAPI.create(payload);
        showToast({ type: 'success', title: t(`${P}.toasts.created`, 'Survey created successfully'), message: '' });
      }
      setFormVisible(false);
      load();
    } catch (err: any) {
      showToast({ type: 'error', title: t(`${P}.toasts.error`, 'Error'), message: err.message || t(`${P}.toasts.saveFailed`, 'Failed to save survey') });
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({ open: true, id, action: 'delete', title: t(`${P}.confirms.deleteTitle`, 'Delete Survey'), desc: t(`${P}.confirms.deleteDesc`, 'Delete this survey and all its responses? This cannot be undone.') });
  };

  const handleConfirm = async () => {
    if (!confirmState.id) return;
    try {
      if (confirmState.action === 'delete') {
        await votingAPI.delete(confirmState.id);
        showToast({ type: 'success', title: t(`${P}.toasts.deleted`, 'Survey deleted'), message: '' });
      } else if (confirmState.action === 'toggle') {
        await votingAPI.toggleActive(confirmState.id);
        showToast({ type: 'success', title: t(`${P}.toasts.toggled`, 'Survey status toggled'), message: '' });
      }
      load();
    } catch (err: any) {
      showToast({ type: 'error', title: t(`${P}.toasts.error`, 'Error'), message: err.message });
    } finally {
      setConfirmState({ open: false });
    }
  };

  const handleToggle = (survey: Survey) => {
    setConfirmState({
      open: true, id: survey.id, action: 'toggle',
      title: survey.isActive ? t(`${P}.confirms.deactivateTitle`, 'Deactivate Survey') : t(`${P}.confirms.activateTitle`, 'Activate Survey'),
      desc: `${survey.isActive ? t(`${P}.actions.deactivate`, 'Deactivate') : t(`${P}.actions.activate`, 'Activate')} "${survey.title}"?`,
    });
  };

  const openResults = async (survey: Survey) => {
    setResultsLoading(true);
    setResultsVisible(true);
    setExpandedQ(null);
    try {
      const resp = await votingAPI.getResults(survey.id);
      setResultsData(resp?.data || null);
    } catch (err: any) {
      showToast({ type: 'error', title: t(`${P}.toasts.error`, 'Error'), message: err.message });
    } finally {
      setResultsLoading(false);
    }
  };

  if (loading) return <div className="p-6">{t('common.loading', 'Loading...')}</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t(`${P}.title`, 'Voting & Surveys')}</h1>
          <p className="text-gray-600">{t(`${P}.subtitle`, 'Create and manage surveys, view student responses and analytics')}</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />{t(`${P}.createSurvey`, 'Create Survey')}</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(`${P}.allSurveys`, 'All Surveys')} ({surveys.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t(`${P}.table.title`, 'Title')}</TableHead>
                  <TableHead>{t(`${P}.table.questions`, 'Questions')}</TableHead>
                  <TableHead>{t(`${P}.table.recurring`, 'Recurring')}</TableHead>
                  <TableHead>{t(`${P}.table.schedule`, 'Schedule')}</TableHead>
                  <TableHead>{t(`${P}.table.status`, 'Status')}</TableHead>
                  <TableHead>{t(`${P}.table.createdBy`, 'Created By')}</TableHead>
                  <TableHead>{t(`${P}.table.actions`, 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveys.map(survey => (
                  <TableRow key={survey.id} className={survey.isActive ? 'bg-green-50' : 'bg-gray-50'}>
                    <TableCell className="font-medium">{survey.title}</TableCell>
                    <TableCell>{survey.questions?.length || 0}</TableCell>
                    <TableCell>{survey.isRecurringDaily ? t(`${P}.recurring.daily`, 'Daily') : t(`${P}.recurring.once`, 'Once')}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {survey.dailyOpenTime && survey.dailyCloseTime
                        ? `${survey.dailyOpenTime} - ${survey.dailyCloseTime}`
                        : survey.startDate ? `${survey.startDate}${survey.endDate ? ' → ' + survey.endDate : ''}` : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${survey.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {survey.isActive ? t(`${P}.status.active`, 'Active') : t(`${P}.status.inactive`, 'Inactive')}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{survey.createdByName || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openResults(survey)} title={t(`${P}.actions.viewResults`, 'View Results')}>
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(survey)} title={t(`${P}.actions.edit`, 'Edit')}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleToggle(survey)} title={survey.isActive ? t(`${P}.actions.deactivate`, 'Deactivate') : t(`${P}.actions.activate`, 'Activate')}>
                          {survey.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(survey.id)} title={t(`${P}.actions.delete`, 'Delete')}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {surveys.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-8">{t(`${P}.noSurveys`, 'No surveys yet. Create your first survey!')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={formVisible} onClose={() => setFormVisible(false)} title={editingSurvey ? t(`${P}.editSurvey`, 'Edit Survey') : t(`${P}.createSurvey`, 'Create Survey')} size="lg">
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          <div className="rounded-xl border bg-sky-50/60 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">{t(`${P}.form.surveyDetails`, 'Survey Details')}</h4>
            <div>
              <label className="block text-sm font-medium mb-1">{t(`${P}.form.titleLabel`, 'Title')} *</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t(`${P}.form.titlePlaceholder`, 'Survey title')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t(`${P}.form.description`, 'Description')}</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder={t(`${P}.form.descriptionPlaceholder`, 'Optional description')} />
            </div>
          </div>

          <div className="rounded-xl border bg-emerald-50/60 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">{t(`${P}.form.schedule`, 'Schedule')}</h4>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                <span className="text-sm font-medium">{t(`${P}.form.repeatDaily`, 'Repeat Daily')}</span>
              </label>
            </div>
            {isRecurring && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t(`${P}.form.openTime`, 'Open Time')}</label>
                  <Input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t(`${P}.form.closeTime`, 'Close Time')}</label>
                  <Input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t(`${P}.form.startDate`, 'Start Date')}</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t(`${P}.form.endDate`, 'End Date')}</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-purple-50/60 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">{t(`${P}.form.questions`, 'Questions')} ({questions.length})</h4>
              <Button type="button" variant="secondary" onClick={addQuestion} className="text-sm">
                <Plus className="w-4 h-4 mr-1" />{t(`${P}.form.addQuestion`, 'Add Question')}
              </Button>
            </div>
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="rounded-lg border bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full mt-1">Q{qIdx + 1}</span>
                  <div className="flex-1 space-y-2">
                    <Input value={q.questionText} onChange={e => updateQuestion(qIdx, 'questionText', e.target.value)}
                      placeholder={t(`${P}.form.questionText`, 'Question text')} />
                    <div className="grid grid-cols-2 gap-2">
                      <select value={q.questionType} onChange={e => updateQuestion(qIdx, 'questionType', e.target.value)}
                        className="border rounded px-3 py-2 text-sm bg-white">
                        {QUESTION_TYPES.map(qt => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
                      </select>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={q.isRequired} onChange={e => updateQuestion(qIdx, 'isRequired', e.target.checked)}
                          className="w-4 h-4 rounded" />
                        {t(`${P}.form.required`, 'Required')}
                      </label>
                    </div>
                  </div>
                  <button onClick={() => removeQuestion(qIdx)} className="text-red-500 hover:text-red-700 mt-1"><X className="w-5 h-5" /></button>
                </div>

                {q.questionType === 'multiple-choice' && (
                  <div className="ml-8 space-y-2">
                    <p className="text-xs text-gray-500 font-medium">{t(`${P}.form.options`, 'Options')}:</p>
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                        <Input value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                          placeholder={`${t(`${P}.form.options`, 'Option')} ${oIdx + 1}`} className="flex-1" />
                        {q.options.length > 2 && (
                          <button onClick={() => removeOption(qIdx, oIdx)} className="text-red-400 hover:text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => addOption(qIdx)} className="text-xs">
                      {t(`${P}.form.addOption`, '+ Add Option')}
                    </Button>
                  </div>
                )}

                {q.questionType === 'yes-no' && (
                  <div className="ml-8 flex gap-3 text-sm text-gray-500">
                    <span className="px-3 py-1 bg-green-50 rounded-full">Yes</span>
                    <span className="px-3 py-1 bg-red-50 rounded-full">No</span>
                  </div>
                )}

                {q.questionType === 'rating' && (
                  <div className="ml-8 flex gap-2 text-sm text-gray-500">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} className="w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold">{n}</span>
                    ))}
                  </div>
                )}

                {q.questionType === 'text' && (
                  <div className="ml-8 text-sm text-gray-400 italic">{t(`${P}.form.freeTextAnswer`, 'Free text answer')}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setFormVisible(false)}>{t(`${P}.form.cancel`, 'Cancel')}</Button>
          <Button onClick={handleSave}>{editingSurvey ? t(`${P}.form.saveChanges`, 'Save Changes') : t(`${P}.createSurvey`, 'Create Survey')}</Button>
        </div>
      </Modal>

      {/* Results Modal */}
      <Modal isOpen={resultsVisible} onClose={() => setResultsVisible(false)} title={t(`${P}.surveyResults`, 'Survey Results & Analytics')} size="lg">
        {resultsLoading ? (
          <div className="text-center py-12">{t(`${P}.results.loading`, 'Loading results...')}</div>
        ) : resultsData ? (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-orange-50 p-4 text-center">
                <p className="text-3xl font-bold text-orange-600">{resultsData.totalResponses}</p>
                <p className="text-sm text-gray-600">{t(`${P}.results.totalResponses`, 'Total Responses')}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{resultsData.uniqueDays}</p>
                <p className="text-sm text-gray-600">{t(`${P}.results.days`, 'Days')}</p>
              </div>
              <div className="rounded-xl bg-green-50 p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{resultsData.survey?.questions?.length || 0}</p>
                <p className="text-sm text-gray-600">{t(`${P}.results.questions`, 'Questions')}</p>
              </div>
            </div>

            {resultsData.questionAnalytics?.map((qa: any, idx: number) => (
              <div key={idx} className="rounded-xl border bg-white overflow-hidden">
                <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
                  onClick={() => setExpandedQ(expandedQ === idx ? null : idx)}>
                  <div className="text-left">
                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full mr-2">Q{idx + 1}</span>
                    <span className="font-medium">{qa.questionText}</span>
                    <span className="text-sm text-gray-400 ml-2">({qa.totalAnswers} {t(`${P}.results.answers`, 'answers')})</span>
                  </div>
                  {expandedQ === idx ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                {expandedQ === idx && (
                  <div className="border-t p-4">
                    {(qa.questionType === 'multiple-choice' || qa.questionType === 'yes-no') && qa.optionCounts && (
                      <div className="space-y-3">
                        {Object.entries(qa.optionCounts).map(([option, data]: [string, any]) => {
                          const pct = qa.totalAnswers > 0 ? Math.round((data.count / qa.totalAnswers) * 100) : 0;
                          return (
                            <div key={option}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">{option}</span>
                                <span className="text-sm text-gray-500">{data.count} {t(`${P}.results.votes`, 'votes')} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-3">
                                <div className="bg-orange-500 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              {data.students?.length > 0 && (
                                <div className="mt-2 ml-4">
                                  <p className="text-xs text-gray-500 mb-1">{t(`${P}.results.studentsWhoChose`, 'Students who chose this:')}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {data.students.map((s: any, si: number) => (
                                      <span key={si} className="text-xs bg-gray-100 px-2 py-1 rounded-full">{s.name} ({s.email})</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {qa.questionType === 'rating' && (
                      <div className="space-y-3">
                        <p className="text-2xl font-bold text-orange-600">{t(`${P}.results.average`, 'Average')}: {qa.averageRating}/5</p>
                        {qa.distribution && Object.entries(qa.distribution).sort().map(([rating, count]: [string, any]) => (
                          <div key={rating} className="flex items-center gap-2">
                            <span className="w-8 text-sm font-medium">⭐ {rating}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-3">
                              <div className="bg-yellow-500 h-3 rounded-full" style={{ width: `${qa.totalAnswers > 0 ? (count / qa.totalAnswers) * 100 : 0}%` }} />
                            </div>
                            <span className="text-sm text-gray-500">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {qa.questionType === 'text' && qa.textAnswers && (
                      <div className="space-y-2">
                        {qa.textAnswers.map((ta: any, ti: number) => (
                          <div key={ti} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm">{ta.answer}</p>
                            <p className="text-xs text-gray-400 mt-1">— {ta.studentName} ({ta.studentEmail}) | {ta.date}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {resultsData.voters?.length > 0 && (
              <div className="rounded-xl border bg-white p-4">
                <h4 className="font-semibold mb-3">{t(`${P}.results.allVoters`, 'All Voters')} ({resultsData.voters.length})</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t(`${P}.results.student`, 'Student')}</TableHead>
                      <TableHead>{t(`${P}.results.email`, 'Email')}</TableHead>
                      <TableHead>{t(`${P}.results.date`, 'Date')}</TableHead>
                      <TableHead>{t(`${P}.results.submitted`, 'Submitted')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultsData.voters.map((v: any, vi: number) => (
                      <TableRow key={vi}>
                        <TableCell className="font-medium">{v.studentName}</TableCell>
                        <TableCell className="text-sm">{v.studentEmail}</TableCell>
                        <TableCell className="text-sm">{v.voteDateKey}</TableCell>
                        <TableCell className="text-sm">{v.submittedAt ? new Date(v.submittedAt).toLocaleString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">{t(`${P}.results.noResults`, 'No results available')}</div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmState.open}
        onCancel={() => setConfirmState({ open: false })}
        onConfirm={handleConfirm}
        title={confirmState.title || t(`${P}.confirms.deleteTitle`, 'Confirm')}
        description={confirmState.desc || ''}
      />
    </div>
  );
}
