import { PartialType } from '@nestjs/swagger';
import { CreateSurveyDTO } from './create-survey.dto';

/**
 * Same rules as create, every field optional. Being a real class (not `any`) means the global
 * ValidationPipe validates and whitelists it, so fields such as createdByUserId, numericId or
 * isActive cannot be set through the update endpoint.
 */
export class UpdateSurveyDTO extends PartialType(CreateSurveyDTO) {}
