import { BadRequestException, ConflictException } from '@nestjs/common';
import { VotingService } from './voting.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';

/** Minimal Mongoose query stub: chainable sort/select, resolves via exec(). */
const query = <T>(value: T) => {
  const q: any = {
    exec: () => Promise.resolve(value),
    sort: () => q,
    select: () => q,
  };
  return q;
};

const SURVEY_ID = '66f000000000000000000001';

function makeSurvey(overrides: Record<string, any> = {}) {
  return {
    _id: { toString: () => SURVEY_ID },
    title: 'Bus feedback',
    isActive: true,
    isRecurringDaily: true,
    dailyOpenTime: '18:30',
    dailyCloseTime: '09:30',
    windowSemantics: 'open',
    eligiblePlanIds: [],
    questions: [
      { questionText: 'Pick one', questionType: 'multiple-choice', options: ['A', 'B'], isRequired: true },
      { questionText: 'Happy?', questionType: 'yes-no', options: ['Yes', 'No'], isRequired: false },
      { questionText: 'Rate', questionType: 'rating', options: ['1', '2', '3', '4', '5'], isRequired: false },
      { questionText: 'Comments', questionType: 'text', options: [], isRequired: false },
    ],
    ...overrides,
  };
}

const activeSub = (planId = 7) => ({ studentId: 42, subscriptionPlanId: planId, isActive: true, status: 'Active' });

/** Cairo is UTC+3 in early October 2026. */
const atCairo = (date: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  jest.setSystemTime(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), h - 3, m));
};

describe('VotingService', () => {
  let surveyModel: any;
  let voteModel: any;
  let userModel: any;
  let subscriptionModel: any;
  let service: VotingService;
  let survey: any;
  let subscriptions: any[];

  beforeEach(() => {
    jest.useFakeTimers();
    atCairo('2026-10-02', '23:00');

    survey = makeSurvey();
    subscriptions = [activeSub()];

    surveyModel = {
      findById: jest.fn(() => query(survey)),
      find: jest.fn(() => query([survey])),
      create: jest.fn((doc: any) => Promise.resolve({ _id: { toString: () => SURVEY_ID }, ...doc })),
      findByIdAndUpdate: jest.fn((_id: string, update: any) => query({ ...survey, ...update.$set })),
    };
    voteModel = {
      findOne: jest.fn(() => query(null)),
      find: jest.fn(() => query([])),
      countDocuments: jest.fn(() => query(0)),
      create: jest.fn((doc: any) => Promise.resolve({ _id: { toString: () => 'vote1' }, ...doc })),
    };
    userModel = {
      findOne: jest.fn(() => query({ firstName: 'Sara', lastName: 'Ali', email: 'sara@example.com' })),
    };
    subscriptionModel = {
      find: jest.fn(() => query(subscriptions)),
    };

    service = new VotingService(surveyModel, voteModel, userModel, subscriptionModel);
  });

  afterEach(() => jest.useRealTimers());

  const submit = (answers: Array<{ questionIndex: number; answer: string }>) =>
    service.submitVote({ surveyId: SURVEY_ID, answers }, 42);

  const validAnswers = [{ questionIndex: 0, answer: 'A' }];

  describe('createSurvey - window validation', () => {
    const base = {
      title: 'T',
      isRecurringDaily: true,
      questions: [{ questionText: 'Q', questionType: 'yes-no' }],
    };

    it('accepts an overnight window and stores it with open-window semantics', async () => {
      await service.createSurvey({ ...base, dailyOpenTime: '18:30', dailyCloseTime: '09:30' }, 1);
      const created = surveyModel.create.mock.calls[0][0];
      expect(created).toMatchObject({ dailyOpenTime: '18:30', dailyCloseTime: '09:30', windowSemantics: 'open' });
    });

    it('accepts a same-day window', async () => {
      await expect(service.createSurvey({ ...base, dailyOpenTime: '08:00', dailyCloseTime: '14:00' }, 1)).resolves.toBeDefined();
    });

    it('rejects open === close', async () => {
      await expect(service.createSurvey({ ...base, dailyOpenTime: '09:00', dailyCloseTime: '09:00' }, 1))
        .rejects.toThrow('Open and close time cannot be the same');
    });

    it('rejects a recurring survey without times', async () => {
      await expect(service.createSurvey({ ...base, dailyOpenTime: '09:00' }, 1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects end date before start date', async () => {
      await expect(service.createSurvey({ ...base, isRecurringDaily: false, startDate: '2026-10-05', endDate: '2026-10-01' }, 1))
        .rejects.toThrow('End date must be on or after start date');
    });

    it('requires at least 2 distinct non-empty options for multiple-choice', async () => {
      const questions = [{ questionText: 'Q', questionType: 'multiple-choice', options: ['A', ' A ', ''] }];
      await expect(service.createSurvey({ title: 'T', questions }, 1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('normalizes yes-no and rating options and dedupes eligible plans', async () => {
      const questions = [
        { questionText: ' Q1 ', questionType: 'yes-no', options: ['Maybe'] },
        { questionText: 'Q2', questionType: 'rating', options: [] },
      ];
      await service.createSurvey({ title: 'T', questions, eligiblePlanIds: [3, 3, 5] }, 1);
      const created = surveyModel.create.mock.calls[0][0];
      expect(created.questions[0]).toMatchObject({ questionText: 'Q1', options: ['Yes', 'No'] });
      expect(created.questions[1].options).toEqual(['1', '2', '3', '4', '5']);
      expect(created.eligiblePlanIds).toEqual([3, 5]);
    });
  });

  describe('submitVote - window and session key', () => {
    it('accepts a vote in the evening part of an overnight window, keyed to that date', async () => {
      await submit(validAnswers);
      expect(voteModel.create.mock.calls[0][0].voteDateKey).toBe('2026-10-02');
    });

    it('keys an after-midnight vote to the previous evening session', async () => {
      atCairo('2026-10-03', '01:00');
      await submit(validAnswers);
      expect(voteModel.create.mock.calls[0][0].voteDateKey).toBe('2026-10-02');
    });

    it('rejects a vote outside the window', async () => {
      atCairo('2026-10-03', '12:00');
      await expect(submit(validAnswers)).rejects.toThrow('Voting is closed right now');
      expect(voteModel.create).not.toHaveBeenCalled();
    });

    it('rejects a second vote in the same session (checked before insert)', async () => {
      voteModel.findOne.mockReturnValue(query({ _id: 'existing' }));
      await expect(submit(validAnswers)).rejects.toBeInstanceOf(ConflictException);
      expect(voteModel.findOne).toHaveBeenCalledWith({ surveyId: SURVEY_ID, studentId: 42, voteDateKey: '2026-10-02' });
    });

    it('maps a concurrent duplicate insert (E11000) to 409', async () => {
      voteModel.create.mockRejectedValue(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }));
      await expect(submit(validAnswers)).rejects.toBeInstanceOf(ConflictException);
    });

    it("uses the 'once' key for non-recurring surveys", async () => {
      survey = makeSurvey({ isRecurringDaily: false });
      await submit(validAnswers);
      expect(voteModel.create.mock.calls[0][0].voteDateKey).toBe('once');
    });

    it('rejects inactive surveys', async () => {
      survey = makeSurvey({ isActive: false });
      await expect(submit(validAnswers)).rejects.toThrow('Survey is not active');
    });
  });

  describe('submitVote - eligibility', () => {
    const expectCode = async (code: string) => {
      const err = await submit(validAnswers).catch((e) => e);
      expect(err).toBeInstanceOf(AppException);
      expect(err.getStatus()).toBe(403);
      expect(err.code).toBe(code);
      expect(voteModel.create).not.toHaveBeenCalled();
    };

    it('queries only active, Active-status subscriptions inside their date range', async () => {
      await submit(validAnswers);
      const filter = subscriptionModel.find.mock.calls[0][0];
      expect(filter).toMatchObject({ studentId: 42, isActive: true, status: 'Active' });
      expect(filter.startDate.$lte).toBeInstanceOf(Date);
      expect(filter.endDate.$gte).toBeInstanceOf(Date);
    });

    it('rejects a student without an eligible subscription', async () => {
      subscriptions = [];
      await expectCode(ErrorCodes.SUBSCRIPTION_REQUIRED);
    });

    it('rejects a student whose plan is not in eligiblePlanIds', async () => {
      survey = makeSurvey({ eligiblePlanIds: [1, 2] });
      await expectCode(ErrorCodes.PLAN_NOT_ELIGIBLE);
    });

    it('accepts a student whose plan is in eligiblePlanIds', async () => {
      survey = makeSurvey({ eligiblePlanIds: [7] });
      await expect(submit(validAnswers)).resolves.toBeDefined();
    });

    it('accepts any eligible subscriber when eligiblePlanIds is empty', async () => {
      subscriptions = [activeSub(999)];
      await expect(submit(validAnswers)).resolves.toBeDefined();
    });
  });

  describe('submitVote - answer validation', () => {
    const rejects = (answers: any[]) => expect(submit(answers)).rejects.toBeInstanceOf(BadRequestException);

    it('rejects a multiple-choice answer that is not an option', () => rejects([{ questionIndex: 0, answer: 'C' }]));
    it('rejects an invalid yes-no answer', () => rejects([...validAnswers, { questionIndex: 1, answer: 'Maybe' }]));
    it('rejects a rating outside the configured values', () => rejects([...validAnswers, { questionIndex: 2, answer: '6' }]));
    it('rejects a text answer longer than 2000 characters', () =>
      rejects([...validAnswers, { questionIndex: 3, answer: 'x'.repeat(2001) }]));
    it('rejects a missing required answer', () => rejects([{ questionIndex: 1, answer: 'Yes' }]));
    it('rejects a whitespace-only required answer', () => rejects([{ questionIndex: 0, answer: '   ' }]));
    it('rejects an unknown question index', () => rejects([...validAnswers, { questionIndex: 9, answer: 'x' }]));
    it('rejects duplicate answers to one question', () => rejects([...validAnswers, { questionIndex: 0, answer: 'B' }]));

    it('trims answers, accepts 2000 characters after trimming and drops empty optional answers', async () => {
      const text = 'y'.repeat(2000);
      await submit([
        { questionIndex: 0, answer: ' A ' },
        { questionIndex: 1, answer: '' },
        { questionIndex: 3, answer: `  ${text}  ` },
      ]);
      expect(voteModel.create.mock.calls[0][0].answers).toEqual([
        { questionIndex: 0, answer: 'A' },
        { questionIndex: 3, answer: text },
      ]);
    });

    it('falls back to default options for legacy yes-no/rating questions stored without options', async () => {
      survey = makeSurvey({
        questions: [
          { questionText: 'Happy?', questionType: 'yes-no', options: [], isRequired: true },
          { questionText: 'Rate', questionType: 'rating', options: [], isRequired: true },
        ],
      });
      await expect(submit([{ questionIndex: 0, answer: 'No' }, { questionIndex: 1, answer: '4' }])).resolves.toBeDefined();
    });
  });

  describe('updateSurvey - lock after responses', () => {
    const editable = () => survey.questions.map((q: any) => ({ ...q, options: [...q.options] }));

    beforeEach(() => voteModel.countDocuments.mockReturnValue(query(3)));

    it('rejects adding a question', async () => {
      await expect(service.updateSurvey(SURVEY_ID, { questions: [...editable(), { questionText: 'New', questionType: 'text' }] }))
        .rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects reordering questions', async () => {
      await expect(service.updateSurvey(SURVEY_ID, { questions: editable().reverse() })).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects changing a question type', async () => {
      const questions = editable();
      questions[3].questionType = 'yes-no';
      await expect(service.updateSurvey(SURVEY_ID, { questions })).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects changing options', async () => {
      const questions = editable();
      questions[0].options = ['A', 'C'];
      await expect(service.updateSurvey(SURVEY_ID, { questions })).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects toggling isRecurringDaily', async () => {
      await expect(service.updateSurvey(SURVEY_ID, { isRecurringDaily: false })).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows title, description, times, dates, plans, question text and required flag', async () => {
      const questions = editable();
      questions[0].questionText = 'Pick one (fixed typo)';
      questions[1].isRequired = true;
      await service.updateSurvey(SURVEY_ID, {
        title: 'New title',
        description: 'New description',
        isRecurringDaily: true,
        dailyOpenTime: '20:00',
        dailyCloseTime: '08:00',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        eligiblePlanIds: [7],
        questions,
      });
      const set = surveyModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(set).toMatchObject({ title: 'New title', dailyOpenTime: '20:00', dailyCloseTime: '08:00', eligiblePlanIds: [7], windowSemantics: 'open' });
      expect(set.questions[0]).toMatchObject({ questionText: 'Pick one (fixed typo)', questionType: 'multiple-choice', options: ['A', 'B'] });
      expect(set.questions[1].isRequired).toBe(true);
    });

    it('allows structural changes while there are no responses', async () => {
      voteModel.countDocuments.mockReturnValue(query(0));
      await service.updateSurvey(SURVEY_ID, { isRecurringDaily: false, questions: [{ questionText: 'Only', questionType: 'text' }] });
      const set = surveyModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(set.questions).toHaveLength(1);
      expect(set.isRecurringDaily).toBe(false);
    });

    it('rejects open === close on update', async () => {
      await expect(service.updateSurvey(SURVEY_ID, { dailyOpenTime: '10:00', dailyCloseTime: '10:00' }))
        .rejects.toThrow('Open and close time cannot be the same');
    });
  });

  describe('getStudentOverview', () => {
    it('reports open state, session-based voted state and eligibility', async () => {
      atCairo('2026-10-03', '01:00');
      voteModel.find.mockReturnValue(query([{ surveyId: SURVEY_ID, voteDateKey: '2026-10-02' }]));
      const res: any = await service.getStudentOverview(42);
      expect(res.data[0]).toMatchObject({ isOpenNow: true, closedReason: null, hasVoted: true, isEligible: true, ineligibleReason: null });
    });

    it('reports a vote from a previous session as not voted', async () => {
      voteModel.find.mockReturnValue(query([{ surveyId: SURVEY_ID, voteDateKey: '2026-10-01' }]));
      const res: any = await service.getStudentOverview(42);
      expect(res.data[0].hasVoted).toBe(false);
    });

    it('reports ineligibility reasons', async () => {
      subscriptions = [];
      const res: any = await service.getStudentOverview(42);
      expect(res.data[0]).toMatchObject({ isEligible: false, ineligibleReason: ErrorCodes.SUBSCRIPTION_REQUIRED });
    });

    it('reports closed surveys with a reason', async () => {
      atCairo('2026-10-03', '12:00');
      const res: any = await service.getStudentOverview(42);
      expect(res.data[0]).toMatchObject({ isOpenNow: false, closedReason: 'outsideWindow' });
    });
  });

  describe('legacy compatibility (recurring survey without the open-window marker)', () => {
    const legacy = (open: string, close: string) => {
      const s: any = makeSurvey({ dailyOpenTime: open, dailyCloseTime: close });
      delete s.windowSemantics;
      return s;
    };

    it('keeps the old closed-window behavior: 08:00-14:00 blocks votes inside and allows them outside', async () => {
      survey = legacy('08:00', '14:00');
      atCairo('2026-10-02', '10:00');
      await expect(submit(validAnswers)).rejects.toThrow('Voting is closed right now');
      atCairo('2026-10-02', '15:00');
      await submit(validAnswers);
      expect(voteModel.create.mock.calls[0][0].voteDateKey).toBe('2026-10-02');
    });

    it('a skipped 20:00 -> 06:00 survey keeps accepting votes at midday instead of becoming an overnight window', async () => {
      survey = legacy('20:00', '06:00');
      atCairo('2026-10-02', '12:00');
      await submit(validAnswers);
      expect(voteModel.create.mock.calls[0][0].voteDateKey).toBe('2026-10-02');
    });

    it('a skipped equal-time survey still accepts votes outside that minute', async () => {
      survey = legacy('09:00', '09:00');
      atCairo('2026-10-02', '12:00');
      await expect(submit(validAnswers)).resolves.toBeDefined();
    });

    it('student overview reports legacy surveys with the old rules too', async () => {
      survey = legacy('20:00', '06:00');
      atCairo('2026-10-02', '12:00');
      const res: any = await service.getStudentOverview(42);
      expect(res.data[0]).toMatchObject({ isOpenNow: true, closedReason: null });
    });

    it('a newly created recurring survey is stored with the marker and follows the new open-window rules', async () => {
      await service.createSurvey({ title: 'New', isRecurringDaily: true, dailyOpenTime: '08:00', dailyCloseTime: '14:00', questions: survey.questions }, 1);
      const created = surveyModel.create.mock.calls[0][0];
      expect(created.windowSemantics).toBe('open');

      survey = { ...makeSurvey(), ...created };
      atCairo('2026-10-02', '10:00');
      await expect(submit(validAnswers)).resolves.toBeDefined(); // a legacy survey would be closed at 10:00
      atCairo('2026-10-02', '15:00');
      await expect(submit(validAnswers)).rejects.toThrow('Voting is closed right now');
    });

    it('re-saving a legacy survey marks it and moves it to the new open-window rules', async () => {
      survey = legacy('20:00', '06:00');
      await service.updateSurvey(SURVEY_ID, { title: 'Re-saved' });
      const set = surveyModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(set.windowSemantics).toBe('open');

      survey = { ...survey, ...set };
      atCairo('2026-10-02', '12:00');
      await expect(submit(validAnswers)).rejects.toThrow('Voting is closed right now');
      atCairo('2026-10-03', '01:00');
      await submit(validAnswers);
      expect(voteModel.create.mock.calls[0][0].voteDateKey).toBe('2026-10-02'); // overnight session key
    });

    it('re-saving a legacy equal-time survey without fixing the times is still rejected (new validation applies)', async () => {
      survey = legacy('09:00', '09:00');
      await expect(service.updateSurvey(SURVEY_ID, { title: 'Re-saved' })).rejects.toThrow('Open and close time cannot be the same');
      expect(surveyModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });
});
