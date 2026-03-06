// ============================================================
// communications/dto/create-communication.dto.ts
// ============================================================

import { IsEnum, IsOptional, IsString, IsUUID, IsInt, Min, Max } from 'class-validator'

export class CreateCommunicationDto {
  @IsEnum(['email', 'appel', 'réunion', 'note', 'sms'])
  type: 'email' | 'appel' | 'réunion' | 'note' | 'sms'

  @IsOptional()
  @IsString()
  subject?: string

  @IsOptional()
  @IsString()
  body?: string

  @IsOptional()
  @IsEnum(['entrant', 'sortant'])
  direction?: 'entrant' | 'sortant'

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  duration_min?: number

  @IsOptional()
  @IsUUID()
  contact_id?: string

  @IsOptional()
  @IsUUID()
  lead_id?: string

  @IsOptional()
  @IsUUID()
  company_id?: string
}