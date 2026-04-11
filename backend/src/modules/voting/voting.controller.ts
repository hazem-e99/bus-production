import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { VotingService } from './voting.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateSurveyDTO } from './dto/create-survey.dto';
import { SubmitVoteDTO } from './dto/submit-vote.dto';

@Controller('api/Voting')
export class VotingController {
  constructor(private readonly votingService: VotingService) {}

  @Get()
  async getAllSurveys() {
    return this.votingService.getAllSurveys();
  }

  @Get('active')
  async getActiveSurveys() {
    return this.votingService.getActiveSurveys();
  }

  @Get(':id')
  async getSurveyById(@Param('id') id: string) {
    return this.votingService.getSurveyById(id);
  }

  @Get(':id/results')
  async getSurveyResults(@Param('id') id: string) {
    return this.votingService.getSurveyResults(id);
  }

  @Get(':id/results/:dateKey')
  async getSurveyResponsesByDate(@Param('id') id: string, @Param('dateKey') dateKey: string) {
    return this.votingService.getSurveyResponsesByDate(id, dateKey);
  }

  @Get(':id/has-voted')
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
  async updateSurvey(@Param('id') id: string, @Body() dto: any) {
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

  @Post('submit')
  async submitVote(@Body() dto: SubmitVoteDTO, @CurrentUser('numericId') studentId: number) {
    return this.votingService.submitVote(dto, studentId);
  }
}
