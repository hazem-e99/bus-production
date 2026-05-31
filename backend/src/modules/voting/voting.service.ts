import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VotingSurvey, VotingSurveyDocument, VoteResponse, VoteResponseDocument } from './voting.schema';
import { User, UserDocument } from '../users/user.schema';
import { createApiResponse } from '../../common/interfaces/api-response.interface';

@Injectable()
export class VotingService {
  constructor(
    @InjectModel(VotingSurvey.name) private surveyModel: Model<VotingSurveyDocument>,
    @InjectModel(VoteResponse.name) private voteModel: Model<VoteResponseDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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
      createdAt: (survey as any).createdAt,
      updatedAt: (survey as any).updatedAt,
    };
  }

  private getLocalDateKey(date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private normalizeDateOnly(value?: string): string | null {
    if (!value) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    // Accept YYYY-MM-DD or ISO-like values and compare by date only.
    return trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
  }

  private timeToMinutes(value?: string): number | null {
    if (!value) return null;
    const trimmed = String(value).trim();
    const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
    if (!match) return null;

    const h = Number(match[1]);
    const m = Number(match[2]);
    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      return null;
    }

    return (h * 60) + m;
  }

  private validateDateRange(startDate?: string, endDate?: string): void {
    const start = this.normalizeDateOnly(startDate);
    const end = this.normalizeDateOnly(endDate);
    if (start && end && end < start) {
      throw new BadRequestException('End date must be on or after start date');
    }
  }

  private validateRecurringWindow(isRecurringDaily?: boolean, dailyOpenTime?: string, dailyCloseTime?: string): void {
    if (!isRecurringDaily) return;

    const openMins = this.timeToMinutes(dailyOpenTime);
    const closeMins = this.timeToMinutes(dailyCloseTime);

    if (openMins === null || closeMins === null) {
      throw new BadRequestException('Open and close time are required for recurring surveys');
    }

    if (closeMins <= openMins) {
      throw new BadRequestException('Close time must be later than open time on the same day');
    }
  }

  private isWithinDailyClosedWindow(currentTime: string, closedFrom?: string, closedTo?: string): boolean {
    const from = this.timeToMinutes(closedFrom);
    const to = this.timeToMinutes(closedTo);
    const now = this.timeToMinutes(currentTime);

    if (from === null || to === null || now === null) return false;
    return now >= from && now <= to;
  }

  async createSurvey(data: any, userId: number): Promise<any> {
    this.validateDateRange(data.startDate, data.endDate);
    this.validateRecurringWindow(data.isRecurringDaily, data.dailyOpenTime, data.dailyCloseTime);

    const user = await this.findUserByNumericId(userId);
    const survey = await this.surveyModel.create({
      ...data,
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

    const survey = await this.surveyModel.findByIdAndUpdate(surveyId, { $set: data }, { new: true }).exec();
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
    const views = surveys.map(s => this.toSurveyView(s));
    return createApiResponse(views, null, true, views.length);
  }

  async getSurveyById(surveyId: string): Promise<any> {
    const survey = await this.surveyModel.findById(surveyId).exec();
    if (!survey) throw new NotFoundException('Survey not found');
    return createApiResponse(this.toSurveyView(survey));
  }

  async getActiveSurveys(): Promise<any> {
    const now = new Date();
    const todayStr = this.getLocalDateKey(now);
    const currentTime = now.toTimeString().slice(0, 5);

    const surveys = await this.surveyModel.find({ isActive: true }).sort({ createdAt: -1 }).exec();

    const available = surveys.filter(s => {
      const startDate = this.normalizeDateOnly(s.startDate);
      const endDate = this.normalizeDateOnly(s.endDate);

      if (startDate && todayStr < startDate) return false;
      if (endDate && todayStr > endDate) return false;
      if (s.isRecurringDaily && this.isWithinDailyClosedWindow(currentTime, s.dailyOpenTime, s.dailyCloseTime)) return false;
      return true;
    });

    const views = available.map(s => this.toSurveyView(s));
    return createApiResponse(views, null, true, views.length);
  }

  async submitVote(data: any, studentId: number): Promise<any> {
    const survey = await this.surveyModel.findById(data.surveyId).exec();
    if (!survey) throw new NotFoundException('Survey not found');
    if (!survey.isActive) throw new BadRequestException('Survey is not active');

    const now = new Date();
    const todayStr = this.getLocalDateKey(now);
    const currentTime = now.toTimeString().slice(0, 5);

    const startDate = this.normalizeDateOnly(survey.startDate);
    const endDate = this.normalizeDateOnly(survey.endDate);

    if (startDate && todayStr < startDate) throw new BadRequestException('Survey has not started yet');
    if (endDate && todayStr > endDate) throw new BadRequestException('Survey has ended');
    if (survey.isRecurringDaily && this.isWithinDailyClosedWindow(currentTime, survey.dailyOpenTime, survey.dailyCloseTime)) {
      throw new BadRequestException('Voting is closed for today');
    }

    const voteDateKey = survey.isRecurringDaily ? todayStr : 'once';

    const existing = await this.voteModel.findOne({
      surveyId: data.surveyId,
      studentId,
      voteDateKey,
    }).exec();

    if (existing) throw new ConflictException('You have already voted today');

    for (const q of survey.questions) {
      if (q.isRequired) {
        const answer = data.answers.find((a: any) => a.questionIndex === survey.questions.indexOf(q));
        if (!answer || !answer.answer?.trim()) {
          throw new BadRequestException(`Question "${q.questionText}" is required`);
        }
      }
    }

    const student = await this.findUserByNumericId(studentId);

    const vote = await this.voteModel.create({
      surveyId: data.surveyId,
      studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : `Student #${studentId}`,
      studentEmail: student?.email || '',
      voteDateKey,
      answers: data.answers,
    });

    return createApiResponse({
      id: vote._id.toString(),
      surveyId: vote.surveyId,
      voteDateKey: vote.voteDateKey,
    }, 'Vote submitted successfully');
  }

  async hasVotedToday(surveyId: string, studentId: number): Promise<any> {
    const survey = await this.surveyModel.findById(surveyId).exec();
    if (!survey) throw new NotFoundException('Survey not found');

    const voteDateKey = survey.isRecurringDaily
      ? this.getLocalDateKey()
      : 'once';

    const existing = await this.voteModel.findOne({ surveyId, studentId, voteDateKey }).exec();
    return createApiResponse(!!existing);
  }

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
