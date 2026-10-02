import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { VotingService } from './voting.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateSurveyDTO } from './dto/create-survey.dto';
import { UpdateSurveyDTO } from './dto/update-survey.dto';
import { SubmitVoteDTO } from './dto/submit-vote.dto';

/**
 * Route order matters: literal segments must be declared before the `:id`
 * wildcard or they get swallowed by it.
 */
@Controller('api/Voting')
export class VotingController {
  constructor(private readonly votingService: VotingService) {}

  /** Admin: every survey (including inactive ones) with its response count. */
  @Get()
  @Roles('Admin')
  async getAllSurveys() {
    return this.votingService.getAllSurveys();
  }

  @Get('active')
  async getActiveSurveys() {
    return this.votingService.getActiveSurveys();
  }

  /** Student voting page: open/closed state, voted state and eligibility for each active survey. */
  @Get('student/overview')
  @Roles('Student')
  async getStudentOverview(@CurrentUser('numericId') studentId: number) {
    return this.votingService.getStudentOverview(studentId);
  }

  @Get(':id')
  async getSurveyById(@Param('id') id: string) {
    return this.votingService.getSurveyById(id);
  }

  /** Admin only: contains voters' names, emails and answers. */
  @Get(':id/results')
  @Roles('Admin')
  async getSurveyResults(@Param('id') id: string) {
    return this.votingService.getSurveyResults(id);
  }

  /** Admin only: contains voters' names, emails and answers. */
  @Get(':id/results/:dateKey')
  @Roles('Admin')
  async getSurveyResponsesByDate(@Param('id') id: string, @Param('dateKey') dateKey: string) {
    return this.votingService.getSurveyResponsesByDate(id, dateKey);
  }

  @Get(':id/has-voted')
  @Roles('Student')
  async hasVotedToday(@Param('id') id: string, @CurrentUser('numericId') studentId: number) {
    return this.votingService.hasVotedToday(id, studentId);
  }

  @Post()
  @Roles('Admin')
  async createSurvey(@Body() dto: CreateSurveyDTO, @CurrentUser('numericId') userId: number) {
    return this.votingService.createSurvey(dto, userId);
  }

  @Put(':id')
  @Roles('Admin')
  async updateSurvey(@Param('id') id: string, @Body() dto: UpdateSurveyDTO) {
    return this.votingService.updateSurvey(id, dto);
  }

  @Put(':id/toggle-active')
  @Roles('Admin')
  async toggleActive(@Param('id') id: string) {
    return this.votingService.toggleActive(id);
  }

  @Delete(':id')
  @Roles('Admin')
  async deleteSurvey(@Param('id') id: string) {
    return this.votingService.deleteSurvey(id);
  }

  /** Students only; the service additionally requires an eligible active subscription. */
  @Post('submit')
  @Roles('Student')
  async submitVote(@Body() dto: SubmitVoteDTO, @CurrentUser('numericId') studentId: number) {
    return this.votingService.submitVote(dto, studentId);
  }
}
