import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VotingController } from './voting.controller';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateSurveyDTO } from './dto/update-survey.dto';
import { CreateSurveyDTO } from './dto/create-survey.dto';

/** Runs the real RolesGuard against a controller handler, as the global guard does. */
function canAccess(handler: keyof VotingController, role: string): boolean {
  const guard = new RolesGuard(new Reflector());
  const context: any = {
    getHandler: () => VotingController.prototype[handler],
    getClass: () => VotingController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role, numericId: 1 } }) }),
  };
  try {
    return guard.canActivate(context);
  } catch (e) {
    if (e instanceof ForbiddenException) return false;
    throw e;
  }
}

describe('VotingController authorization', () => {
  it.each(['getSurveyResults', 'getSurveyResponsesByDate', 'getAllSurveys'] as const)(
    '%s is Admin-only',
    (handler) => {
      expect(canAccess(handler, 'Admin')).toBe(true);
      for (const role of ['Student', 'Driver', 'Conductor', 'MovementManager']) {
        expect(canAccess(handler, role)).toBe(false);
      }
    },
  );

  it.each(['createSurvey', 'updateSurvey', 'toggleActive', 'deleteSurvey'] as const)('%s stays Admin-only', (handler) => {
    expect(canAccess(handler, 'Admin')).toBe(true);
    expect(canAccess(handler, 'Student')).toBe(false);
  });

  it.each(['submitVote', 'hasVotedToday', 'getStudentOverview'] as const)('%s is Student-only', (handler) => {
    expect(canAccess(handler, 'Student')).toBe(true);
    for (const role of ['Admin', 'Driver', 'Conductor', 'MovementManager']) {
      expect(canAccess(handler, role)).toBe(false);
    }
  });

  it.each(['getActiveSurveys', 'getSurveyById'] as const)('%s is open to any signed-in user', (handler) => {
    expect(canAccess(handler, 'Student')).toBe(true);
    expect(canAccess(handler, 'Admin')).toBe(true);
  });
});

describe('Survey DTO validation (global ValidationPipe settings)', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const run = (metatype: any, body: any) => pipe.transform(body, { type: 'body', metatype });

  it('rejects protected fields on update', async () => {
    await expect(run(UpdateSurveyDTO, { createdByUserId: 99 })).rejects.toBeDefined();
    await expect(run(UpdateSurveyDTO, { numericId: 5 })).rejects.toBeDefined();
    await expect(run(UpdateSurveyDTO, { isActive: false })).rejects.toBeDefined();
  });

  it('validates update fields with the same rules as create', async () => {
    await expect(run(UpdateSurveyDTO, { dailyOpenTime: '25:00' })).rejects.toBeDefined();
    await expect(run(UpdateSurveyDTO, { questions: [{ questionText: 'Q', questionType: 'essay' }] })).rejects.toBeDefined();
    await expect(run(UpdateSurveyDTO, { title: 'Ok', dailyOpenTime: '18:30', dailyCloseTime: '09:30', eligiblePlanIds: [1] }))
      .resolves.toBeInstanceOf(UpdateSurveyDTO);
  });

  it('rejects malformed times and plan ids on create', async () => {
    const base = { title: 'T', questions: [{ questionText: 'Q', questionType: 'text' }] };
    await expect(run(CreateSurveyDTO, { ...base, dailyCloseTime: '9:30' })).rejects.toBeDefined();
    await expect(run(CreateSurveyDTO, { ...base, eligiblePlanIds: ['abc'] })).rejects.toBeDefined();
    await expect(run(CreateSurveyDTO, base)).resolves.toBeInstanceOf(CreateSurveyDTO);
  });
});
