import {
  IsString, IsOptional, IsUUID, IsEnum,
  IsInt, Min, Max, IsDateString, MaxLength, IsNotEmpty
} from 'class-validator'

export type LeadStatus = 'nouveau' | 'contacté' | 'qualifié' | 'proposition' | 'négociation' | 'gagné' | 'perdu'

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string

  @IsOptional()
  @IsEnum(['nouveau', 'contacté', 'qualifié', 'proposition', 'négociation', 'gagné', 'perdu'])
  status?: LeadStatus

  @IsOptional()
  value?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number

  @IsOptional()
  @IsDateString()
  expected_close_date?: string

  @IsOptional()
  @IsUUID()
  contact_id?: string

  @IsOptional()
  @IsUUID()
  company_id?: string

  @IsOptional()
  @IsUUID()
  assigned_to?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string

  @IsOptional()
  @IsString()
  lost_reason?: string

  @IsOptional()
  @IsString()
  notes?: string
}