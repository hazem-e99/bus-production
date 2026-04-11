'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/contexts/LanguageContext';
import { votingAPI } from '@/lib/api';
import { ClipboardCheck, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface SurveyQuestion {
  index: number;
  questionText: string;
  questionType: 'multiple-choice' | 'yes-no' | 'rating' | 'text';
  options: string[];
  isRequired: boolean;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  isActive?: boolean;
  isRecurringDaily: boolean;
  dailyOpenTime?: string;
  dailyCloseTime?: string;
  startDate?: string;
  endDate?: string;
}

export default function StudentVotingPage() {
  const { showToast } = useToast();
  const { t } = useI18n();
  const P = 'pages.student.voting';
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [openSurveyIds, setOpenSurveyIds] = useState<Set<string>>(new Set());
  const [votedSurveyIds, setVotedSurveyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [voteVisible, setVoteVisible] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [allResp, activeResp] = await Promise.all([
        votingAPI.getAll(),
        votingAPI.getActive(),
      ]);

      const surveyList = (allResp?.data || []).filter((s: Survey) => s?.isActive !== false);
      const activeList = (activeResp?.data || []) as Survey[];
      const activeSet = new Set<string>(activeList.map((s) => s.id));

      setSurveys(surveyList);
      setOpenSurveyIds(activeSet);

      const votedSet = new Set<string>();
      await Promise.all(surveyList.map(async (s: Survey) => {
        try {
          const hasVoted = await votingAPI.hasVoted(s.id);
          if (hasVoted?.data) votedSet.add(s.id);
        } catch {}
      }));
      setVotedSurveyIds(votedSet);
    } catch (err: any) {
      showToast({ type: 'error', title: t(`${P}.toasts.error`, 'Error'), message: err.message || t(`${P}.toasts.loadFailed`, 'Failed to load surveys') });
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => { load(); }, [load]);

  const openVote = (survey: Survey) => {
    if (votedSurveyIds.has(survey.id) || !openSurveyIds.has(survey.id)) return;
    setSelectedSurvey(survey);
    setAnswers({});
    setVoteVisible(true);
  };

  const handleSubmit = async () => {
    if (!selectedSurvey) return;

    for (const q of selectedSurvey.questions) {
      if (q.isRequired && (!answers[q.index] || !answers[q.index].trim())) {
        showToast({ type: 'error', title: t(`${P}.required`, 'Required'), message: `${t(`${P}.pleaseAnswer`, 'Please answer')}: "${q.questionText}"` });
        return;
      }
    }

    setSubmitting(true);
    try {
      await votingAPI.submitVote({
        surveyId: selectedSurvey.id,
        answers: Object.entries(answers)
          .filter(([, v]) => v.trim())
          .map(([k, v]) => ({ questionIndex: parseInt(k), answer: v })),
      });
      showToast({ type: 'success', title: t(`${P}.toasts.submittedTitle`, 'Submitted!'), message: t(`${P}.toasts.submitted`, 'Your vote has been recorded') });
      setVoteVisible(false);
      setVotedSurveyIds(prev => new Set(prev).add(selectedSurvey.id));
    } catch (err: any) {
      showToast({ type: 'error', title: t(`${P}.toasts.error`, 'Error'), message: err.message || t(`${P}.toasts.submitFailed`, 'Failed to submit vote') });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">{t('common.loading', 'Loading...')}</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ClipboardCheck className="w-8 h-8 text-orange-500" />
          {t(`${P}.title`, 'Voting & Surveys')}
        </h1>
        <p className="text-gray-600 mt-1">{t(`${P}.subtitle`, 'Share your feedback by completing the surveys below')}</p>
      </div>

      {surveys.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400">{t(`${P}.noSurveys`, 'No Surveys Available')}</h3>
            <p className="text-gray-400 mt-2">{t(`${P}.noSurveysDesc`, 'Check back later for new surveys')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {surveys.map(survey => {
            const hasVoted = votedSurveyIds.has(survey.id);
            const isOpenNow = openSurveyIds.has(survey.id);
            return (
              <Card key={survey.id} className={`transition-all hover:shadow-lg ${hasVoted ? 'border-green-200 bg-green-50/30' : 'border-orange-200 hover:border-orange-400'}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{survey.title}</CardTitle>
                      {survey.description && <p className="text-sm text-gray-500 mt-1">{survey.description}</p>}
                    </div>
                    {hasVoted ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm font-medium bg-green-100 px-3 py-1 rounded-full">
                        <CheckCircle className="w-4 h-4" />{t(`${P}.voted`, 'Voted')}
                      </span>
                    ) : !isOpenNow ? (
                      <span className="flex items-center gap-1 text-gray-600 text-sm font-medium bg-gray-100 px-3 py-1 rounded-full">
                        <Clock className="w-4 h-4" />{t(`${P}.closedNow`, 'Closed Now')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-orange-600 text-sm font-medium bg-orange-100 px-3 py-1 rounded-full">
                        <AlertCircle className="w-4 h-4" />{t(`${P}.open`, 'Open')}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>{survey.questions.length} {survey.questions.length !== 1 ? t(`${P}.questions`, 'questions') : t(`${P}.question`, 'question')}</span>
                    {survey.isRecurringDaily && (
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{t(`${P}.daily`, 'Daily')}</span>
                    )}
                    {survey.dailyOpenTime && survey.dailyCloseTime && (
                      <span>{t(`${P}.closedWindow`, 'Closed from')} {survey.dailyOpenTime} - {survey.dailyCloseTime}</span>
                    )}
                  </div>
                  <Button
                    onClick={() => openVote(survey)}
                    disabled={hasVoted || !isOpenNow}
                    className="w-full"
                    variant={hasVoted || !isOpenNow ? 'outline' : 'default'}
                  >
                    {hasVoted
                      ? `✓ ${t(`${P}.alreadyVoted`, 'Already Voted Today')}`
                      : !isOpenNow
                        ? t(`${P}.closedNowButton`, 'Voting Closed Now')
                        : t(`${P}.startVoting`, 'Start Voting')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Vote Modal */}
      <Modal isOpen={voteVisible} onClose={() => setVoteVisible(false)} title={selectedSurvey?.title || t(`${P}.title`, 'Vote')} size="lg">
        {selectedSurvey && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {selectedSurvey.description && (
              <p className="text-gray-600 bg-gray-50 rounded-xl p-4">{selectedSurvey.description}</p>
            )}

            {selectedSurvey.questions.map((q, idx) => (
              <div key={idx} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="bg-orange-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {q.questionText}
                      {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </p>
                  </div>
                </div>

                {q.questionType === 'multiple-choice' && (
                  <div className="ml-9 space-y-2">
                    {q.options.map((opt, oIdx) => (
                      <label key={oIdx} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${answers[q.index] === opt ? 'border-orange-500 bg-orange-50' : 'hover:bg-gray-50'}`}>
                        <input type="radio" name={`q-${q.index}`} value={opt}
                          checked={answers[q.index] === opt}
                          onChange={() => setAnswers(prev => ({ ...prev, [q.index]: opt }))}
                          className="w-4 h-4 text-orange-500 focus:ring-orange-500" />
                        <span className="text-sm">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.questionType === 'yes-no' && (
                  <div className="ml-9 flex gap-3">
                    {['Yes', 'No'].map(opt => (
                      <button key={opt}
                        className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${answers[q.index] === opt ? (opt === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700') : 'hover:bg-gray-50'}`}
                        onClick={() => setAnswers(prev => ({ ...prev, [q.index]: opt }))}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {q.questionType === 'rating' && (
                  <div className="ml-9 flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n}
                        className={`w-12 h-12 rounded-xl border text-lg font-bold transition-all ${answers[q.index] === String(n) ? 'border-orange-500 bg-orange-500 text-white' : 'hover:bg-orange-50'}`}
                        onClick={() => setAnswers(prev => ({ ...prev, [q.index]: String(n) }))}>
                        {n}
                      </button>
                    ))}
                  </div>
                )}

                {q.questionType === 'text' && (
                  <div className="ml-9">
                    <Input
                      value={answers[q.index] || ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [q.index]: e.target.value }))}
                      placeholder={t(`${P}.typeAnswer`, 'Type your answer...')}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setVoteVisible(false)}>{t(`${P}.cancel`, 'Cancel')}</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t(`${P}.submitting`, 'Submitting...') : t(`${P}.submitVote`, 'Submit Vote')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
