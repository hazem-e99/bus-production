import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VotingSurvey, VotingSurveyDocument, VoteResponse, VoteResponseDocument } from './voting.schema';
import { User, UserDocument } from '../users/user.schema';
import { StudentSubscription, StudentSubscriptionDocument } from '../student-subscription/student-subscription.schema';
import { createApiResponse } from '../../common/interfaces/api-response.interface';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { getSurveyAvailability, normalizeDateOnly, OPEN_WINDOW_SEMANTICS, parseHHmm, SurveyAvailability } from './voting-time.util';

export const MAX_TEXT_ANSWER_LENGTH = 2000;

const YES_NO_OPTIONS = ['Yes', 'No'];
const RATING_OPTIONS = ['1', '2', '3', '4', '5'];

type IneligibleReason = typeof ErrorCodes.SUBSCRIPTION_REQUIRED | typeof ErrorCodes.PLAN_NOT_ELIGIBLE;

interface NormalizedQuestion {
  questionText: string;
  questionType: string;
  options: string[];
  isRequired: boolean;
}

@Injectable()
export class VotingService {
  constructor(
    @InjectModel(VotingSurvey.name) private surveyModel: Model<VotingSurveyDocument>,
    @InjectModel(VoteResponse.name) private voteModel: Model<VoteResponseDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(StudentSubscription.name) private subscriptionModel: Model<StudentSubscriptionDocument>,
  ) {}

  private getNumericId(doc: any): number {
    return parseInt((doc._id as any).toString().slice(-8), 16) % 100000;
  }

  private toSurveyView(survey: VotingSurveyDocument) {
    return {
      id: survey._id.toString(),
      numericId: this.getNumericId(survey),
      title: survey.title,
      description: survey.description,
      createdByUserId: survey.createdByUserId,
      createdByName: survey.createdByName,
      questions: survey.questions.map((q, i) => ({
        index: i,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        isRequired: q.isRequired,
      })),
      isRecurringDaily: survey.isRecurringDaily,
      dailyOpenTime: survey.dailyOpenTime,
      dailyCloseTime: survey.dailyCloseTime,
      isActive: survey.isActive,
      startDate: survey.startDate,
      endDate: survey.endDate,
      eligiblePlanIds: survey.eligiblePlanIds ?? [],
      /** 'open' for OPEN-window times; null for unconverted legacy surveys (times are a CLOSED window). */
      windowSemantics: survey.windowSemantics ?? null,
      createdAt: (survey as any).createdAt,
      updatedAt: (survey as any).updatedAt,
    };
  }

  // ==================== Validation helpers ====================

  private validateDateRange(startDate?: string, endDate?: string): void {
    const start = normalizeDateOnly(startDate);
    const end = normalizeDateOnly(endDate);
    if (start && end && end < start) {
      throw new BadRequestException('End date must be on or after start date');
    }
  }

  /**
   * Daily times define the OPEN window [open, close). Close earlier than open is a valid
   * overnight window (e.g. 18:30 -> 09:30); equal times are ambiguous and rejected.
   */
  private validateRecurringWindow(isRecurringDaily?: boolean, dailyOpenTime?: string, dailyCloseTime?: string): void {
    if (!isRecurringDaily) return;

    const openMins = parseHHmm(dailyOpenTime);
    const closeMins = parseHHmm(dailyCloseTime);

    if (openMins === null || closeMins === null) {
      throw new BadRequestException('Open and close time are required for recurring surveys');
    }

    if (openMins === closeMins) {
      throw new BadRequestException('Open and close time cannot be the same');
    }
  }

  /** Options a choice question accepts. Legacy surveys may have stored no options for yes-no/rating. */
  private optionsFor(q: { questionType: string; options?: string[] }): string[] {
    if (q.options?.length) return q.options;
    if (q.questionType === 'yes-no') return YES_NO_OPTIONS;
    if (q.questionType === 'rating') return RATING_OPTIONS;
    return [];
  }

  private normalizeQuestions(questions: Array<{ questionText: string; questionType: string; options?: string[]; isRequired?: boolean }>): NormalizedQuestion[] {
    return questions.map((q) => {
      const questionText = String(q.questionText ?? '').trim();
      if (!questionText) throw new BadRequestException('All questions must have text');

      let options: string[] = [];
      if (q.questionType === 'multiple-choice') {
        options = [...new Set((q.options ?? []).map((o) => String(o).trim()).filter(Boolean))];
        if (options.length < 2) {
          throw new BadRequestException(`Question "${questionText}" needs at least 2 different options`);
        }
      } else if (q.questionType === 'yes-no') {
        options = [...YES_NO_OPTIONS];
      } else if (q.questionType === 'rating') {
        options = [...RATING_OPTIONS];
      }

      return { questionText, questionType: q.questionType, options, isRequired: !!q.isRequired };
    });
  }

  private sameStructure(existing: Array<{ questionType: string; options?: string[] }>, incoming: NormalizedQuestion[]): boolean {
    if (existing.length !== incoming.length) return false;
    return existing.every((q, i) => {
      const next = incoming[i];
      if (q.questionType !== next.questionType) return false;
      const a = this.optionsFor(q).map((o) => String(o).trim());
      const b = this.optionsFor(next);
      return a.length === b.length && a.every((o, j) => o === b[j]);
    });
  }

  /**
   * Validates submitted answers against the survey's questions and returns the trimmed answers
   * to store. Empty answers to optional questions are dropped.
   */
  private normalizeAnswers(
    survey: VotingSurveyDocument,
    answers: Array<{ questionIndex: number; answer: string }>,
  ): Array<{ questionIndex: number; answer: string }> {
    const seen = new Set<number>();
    const result: Array<{ questionIndex: number; answer: string }> = [];

    for (const a of answers ?? []) {
      const index = a?.questionIndex;
      if (!Number.isInteger(index) || index < 0 || index >= survey.questions.length) {
        throw new BadRequestException('Answer refers to a question that does not exist');
      }
      if (seen.has(index)) {
        throw new BadRequestException('Each question can only be answered once');
      }
      seen.add(index);

      const q = survey.questions[index];
      const value = String(a.answer ?? '').trim();
      if (!value) continue;

      if (q.questionType === 'text') {
        if (value.length > MAX_TEXT_ANSWER_LENGTH) {
          throw new BadRequestException(`Answer to "${q.questionText}" must be at most ${MAX_TEXT_ANSWER_LENGTH} characters`);
        }
      } else {
        const allowed = this.optionsFor(q).map((o) => String(o).trim());
        if (!allowed.includes(value)) {
          throw new BadRequestException(`Invalid answer for question "${q.questionText}"`);
        }
      }

      result.push({ questionIndex: index, answer: value });
    }

    survey.questions.forEach((q, index) => {
      if (q.isRequired && !result.some((a) => a.questionIndex === index)) {
        throw new BadRequestException(`Question "${q.questionText}" is required`);
      }
    });

    return result;
  }

  // ==================== Eligibility ====================

  /**
   * Subscriptions that currently allow voting: active flag + 'Active' status + inside their date
   * range. endDate is checked here because nothing marks subscriptions 'Expired' automatically.
   */
  private async findEligibleSubscriptions(studentId: number, now = new Date()): Promise<StudentSubscriptionDocument[]> {
    return this.subscriptionModel
      .find({
        studentId,
        isActive: true,
        status: 'Active',
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
      .exec();
  }

  private ineligibleReason(survey: VotingSurveyDocument, subscriptions: StudentSubscriptionDocument[]): IneligibleReason | null {
    if (subscriptions.length === 0) return ErrorCodes.SUBSCRIPTION_REQUIRED;
    const planIds = survey.eligiblePlanIds ?? [];
    if (planIds.length > 0 && !subscriptions.some((s) => planIds.includes(s.subscriptionPlanId))) {
      return ErrorCodes.PLAN_NOT_ELIGIBLE;
    }
    return null;
  }

  private throwIneligible(reason: IneligibleReason): never {
    if (reason === ErrorCodes.SUBSCRIPTION_REQUIRED) {
      throw new AppException(403, ErrorCodes.SUBSCRIPTION_REQUIRED, 'An active subscription is required to vote.');
    }
    throw new AppException(403, ErrorCodes.PLAN_NOT_ELIGIBLE, 'Your subscription package is not eligible for this survey.');
  }

  // ==================== Admin: survey management ====================

  async createSurvey(data: any, userId: number): Promise<any> {
    this.validateDateRange(data.startDate, data.endDate);
    this.validateRecurringWindow(data.isRecurringDaily, data.dailyOpenTime, data.dailyCloseTime);
    const questions = this.normalizeQuestions(data.questions);

    const user = await this.findUserByNumericId(userId);
    const survey = await this.surveyModel.create({
      ...data,
      questions,
      eligiblePlanIds: [...new Set<number>(data.eligiblePlanIds ?? [])],
      windowSemantics: OPEN_WINDOW_SEMANTICS,
      createdByUserId: userId,
      createdByName: user ? `${user.firstName} ${user.lastName}` : `User #${userId}`,
    });
    return createApiResponse(this.toSurveyView(survey), 'Survey created successfully');
  }

  async updateSurvey(surveyId: string, data: any): Promise<any> {
    const existingSurvey = await this.surveyModel.findById(surveyId).exec();
    if (!existingSurvey) throw new NotFoundException('Survey not found');

    const merged = {
      isRecurringDaily: data?.isRecurringDaily ?? existingSurvey.isRecurringDaily,
      dailyOpenTime: data?.dailyOpenTime ?? existingSurvey.dailyOpenTime,
      dailyCloseTime: data?.dailyCloseTime ?? existingSurvey.dailyCloseTime,
      startDate: data?.startDate ?? existingSurvey.startDate,
      endDate: data?.endDate ?? existingSurvey.endDate,
    };

    this.validateDateRange(merged.startDate, merged.endDate);
    this.validateRecurringWindow(merged.isRecurringDaily, merged.dailyOpenTime, merged.dailyCloseTime);

    const update: Record<string, any> = { ...data, windowSemantics: OPEN_WINDOW_SEMANTICS };
    if (data.eligiblePlanIds !== undefined) {
      update.eligiblePlanIds = [...new Set<number>(data.eligiblePlanIds)];
    }

    const hasResponses = (await this.voteModel.countDocuments({ surveyId }).exec()) > 0;

    if (hasResponses && data.isRecurringDaily !== undefined && data.isRecurringDaily !== existingSurvey.isRecurringDaily) {
      throw new ConflictException('This survey already has responses, so "Repeat Daily" can no longer be changed');
    }

    if (data.questions !== undefined) {
      const questions = this.normalizeQuestions(data.questions);
      if (hasResponses) {
        if (!this.sameStructure(existingSurvey.questions, questions)) {
          throw new ConflictException(
            'This survey already has responses, so questions cannot be added, removed, reordered, or have their type or options changed',
          );
        }
        // Keep the stored structure (answers are matched by question index and option value);
        // only the wording and the required flag may change.
        update.questions = existingSurvey.questions.map((q, i) => ({
          questionText: questions[i].questionText,
          questionType: q.questionType,
          options: q.options,
          isRequired: questions[i].isRequired,
        }));
      } else {
        update.questions = questions;
      }
    }

    const survey = await this.surveyModel.findByIdAndUpdate(surveyId, { $set: update }, { new: true }).exec();
    if (!survey) throw new NotFoundException('Survey not found');
    return createApiResponse(this.toSurveyView(survey), 'Survey updated successfully');
  }

  async deleteSurvey(surveyId: string): Promise<any> {
    const survey = await this.surveyModel.findByIdAndDelete(surveyId).exec();
    if (!survey) throw new NotFoundException('Survey not found');
    await this.voteModel.deleteMany({ surveyId }).exec();
    return createApiResponse(true, 'Survey deleted successfully');
  }

  async toggleActive(surveyId: string): Promise<any> {
    const survey = await this.surveyModel.findById(surveyId).exec();
    if (!survey) throw new NotFoundException('Survey not found');
    survey.isActive = !survey.isActive;
    await survey.save();
    return createApiResponse(this.toSurveyView(survey), `Survey ${survey.isActive ? 'activated' : 'deactivated'}`);
  }

  async getAllSurveys(): Promise<any> {
    const surveys = await this.surveyModel.find().sort({ createdAt: -1 }).exec();
    const views = await Promise.all(surveys.map(async (s) => ({
      ...this.toSurveyView(s),
      responseCount: await this.voteModel.countDocuments({ surveyId: s._id.toString() }).exec(),
    })));
    return createApiResponse(views, null, true, views.length);
  }

  async getSurveyById(surveyId: string): Promise<any> {
    const survey = await this.surveyModel.findById(surveyId).exec();
    if (!survey) throw new NotFoundException('Survey not found');
    return createApiResponse(this.toSurveyView(survey));
  }

  // ==================== Availability ====================

  private availabilityOf(survey: VotingSurveyDocument, now = new Date()): SurveyAvailability {
    return getSurveyAvailability(survey, now);
  }

  async getActiveSurveys(): Promise<any> {
    const now = new Date();
    const surveys = await this.surveyModel.find({ isActive: true }).sort({ createdAt: -1 }).exec();
    const views = surveys.filter((s) => this.availabilityOf(s, now).isOpen).map((s) => this.toSurveyView(s));
    return createApiResponse(views, null, true, views.length);
  }

  /**
   * Everything the student voting page needs in one call: every active survey with whether it is
   * open right now, whether this student already voted in the current session, and whether the
   * student's subscription allows voting on it.
   */
  async getStudentOverview(studentId: number): Promise<any> {
    const now = new Date();
    const surveys = await this.surveyModel.find({ isActive: true }).sort({ createdAt: -1 }).exec();
    const subscriptions = await this.findEligibleSubscriptions(studentId, now);
    const votes = await this.voteModel
      .find({ studentId, surveyId: { $in: surveys.map((s) => s._id.toString()) } })
      .select({ surveyId: 1, voteDateKey: 1 })
      .exec();

    const views = surveys.map((s) => {
      const availability = this.availabilityOf(s, now);
      const id = s._id.toString();
      const reason = this.ineligibleReason(s, subscriptions);
      return {
        ...this.toSurveyView(s),
        isOpenNow: availability.isOpen,
        closedReason: availability.closedReason,
        hasVoted: votes.some((v) => v.surveyId === id && v.voteDateKey === availability.voteDateKey),
        isEligible: reason === null,
        ineligibleReason: reason,
      };
    });

    return createApiResponse(views, null, true, views.length);
  }

  // ==================== Student: voting ====================

  async submitVote(data: any, studentId: number): Promise<any> {
    const survey = await this.surveyModel.findById(data.surveyId).exec();
    if (!survey) throw new NotFoundException('Survey not found');

    const now = new Date();
    const availability = this.availabilityOf(survey, now);
    switch (availability.closedReason) {
      case 'inactive':
        throw new BadRequestException('Survey is not active');
      case 'notStarted':
        throw new BadRequestException('Survey has not started yet');
      case 'ended':
        throw new BadRequestException('Survey has ended');
      case 'outsideWindow':
        throw new BadRequestException('Voting is closed right now');
    }

    const reason = this.ineligibleReason(survey, await this.findEligibleSubscriptions(studentId, now));
    if (reason) this.throwIneligible(reason);

    const { voteDateKey } = availability;
    const alreadyVotedMessage = survey.isRecurringDaily
      ? 'You have already voted in this voting period'
      : 'You have already voted in this survey';

    const existing = await this.voteModel.findOne({ surveyId: data.surveyId, studentId, voteDateKey }).exec();
    if (existing) throw new ConflictException(alreadyVotedMessage);

    const answers = this.normalizeAnswers(survey, data.answers);
    const student = await this.findUserByNumericId(studentId);

    let vote: VoteResponseDocument;
    try {
      vote = await this.voteModel.create({
        surveyId: data.surveyId,
        studentId,
        studentName: student ? `${student.firstName} ${student.lastName}` : `Student #${studentId}`,
        studentEmail: student?.email || '',
        voteDateKey,
        answers,
      });
    } catch (error: any) {
      // Two concurrent submissions: the unique {surveyId, studentId, voteDateKey} index rejects the second.
      if (error?.code === 11000) throw new ConflictException(alreadyVotedMessage);
      throw error;
    }

    return createApiResponse({
      id: vote._id.toString(),
      surveyId: vote.surveyId,
      voteDateKey: vote.voteDateKey,
    }, 'Vote submitted successfully');
  }

  async hasVotedToday(surveyId: string, studentId: number): Promise<any> {
    const survey = await this.surveyModel.findById(surveyId).exec();
    if (!survey) throw new NotFoundException('Survey not found');

    const { voteDateKey } = this.availabilityOf(survey);
    const existing = await this.voteModel.findOne({ surveyId, studentId, voteDateKey }).exec();
    return createApiResponse(!!existing);
  }

  // ==================== Admin: results ====================

  async getSurveyResults(surveyId: string): Promise<any> {
    const survey = await this.surveyModel.findById(surveyId).exec();
    if (!survey) throw new NotFoundException('Survey not found');

    const votes = await this.voteModel.find({ surveyId }).exec();

    const totalResponses = votes.length;
    const uniqueDays = [...new Set(votes.map(v => v.voteDateKey))];

    const questionAnalytics = survey.questions.map((q, qIndex) => {
      const answersForQ = votes
        .map(v => v.answers.find(a => a.questionIndex === qIndex))
        .filter(Boolean);

      if (q.questionType === 'multiple-choice' || q.questionType === 'yes-no') {
        const optionCounts: Record<string, { count: number; students: Array<{ id: number; name: string; email: string }> }> = {};

        for (const opt of (q.options?.length ? q.options : ['Yes', 'No'])) {
          optionCounts[opt] = { count: 0, students: [] };
        }

        for (const vote of votes) {
          const ans = vote.answers.find(a => a.questionIndex === qIndex);
          if (ans && ans.answer) {
            if (!optionCounts[ans.answer]) {
              optionCounts[ans.answer] = { count: 0, students: [] };
            }
            optionCounts[ans.answer].count++;
            optionCounts[ans.answer].students.push({
              id: vote.studentId,
              name: vote.studentName,
              email: vote.studentEmail,
            });
          }
        }

        return {
          questionIndex: qIndex,
          questionText: q.questionText,
          questionType: q.questionType,
          totalAnswers: answersForQ.length,
          optionCounts,
        };
      }

      if (q.questionType === 'rating') {
        const ratings = answersForQ.map(a => parseInt(a!.answer)).filter(n => !isNaN(n));
        const avg = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
        const distribution: Record<string, number> = {};
        for (const r of ratings) {
          distribution[String(r)] = (distribution[String(r)] || 0) + 1;
        }
        return {
          questionIndex: qIndex,
          questionText: q.questionText,
          questionType: q.questionType,
          totalAnswers: answersForQ.length,
          averageRating: Math.round(avg * 100) / 100,
          distribution,
        };
      }

      // text type
      const textAnswers = votes
        .filter(v => v.answers.find(a => a.questionIndex === qIndex))
        .map(v => ({
          studentId: v.studentId,
          studentName: v.studentName,
          studentEmail: v.studentEmail,
          answer: v.answers.find(a => a.questionIndex === qIndex)?.answer || '',
          date: v.voteDateKey,
        }));

      return {
        questionIndex: qIndex,
        questionText: q.questionText,
        questionType: q.questionType,
        totalAnswers: answersForQ.length,
        textAnswers,
      };
    });

    return createApiResponse({
      survey: this.toSurveyView(survey),
      totalResponses,
      uniqueDays: uniqueDays.length,
      questionAnalytics,
      voters: votes.map(v => ({
        studentId: v.studentId,
        studentName: v.studentName,
        studentEmail: v.studentEmail,
        voteDateKey: v.voteDateKey,
        submittedAt: (v as any).createdAt,
      })),
    });
  }

  async getSurveyResponsesByDate(surveyId: string, dateKey: string): Promise<any> {
    const votes = await this.voteModel.find({ surveyId, voteDateKey: dateKey }).exec();
    return createApiResponse(votes.map(v => ({
      studentId: v.studentId,
      studentName: v.studentName,
      studentEmail: v.studentEmail,
      answers: v.answers,
      submittedAt: (v as any).createdAt,
    })), null, true, votes.length);
  }

  private async findUserByNumericId(numericId: number): Promise<any> {
    return this.userModel.findOne({ numericId }).exec();
  }
}
