import {
  IsEmail, IsOptional, IsString, IsUUID,
  IsBoolean, MaxLength, IsArray
} from 'class-validator'

export class CreateContactDto {
  @IsString()
  @MaxLength(100)
  first_name: string

  @IsString()
  @MaxLength(100)
  last_name: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  mobile?: string

  @IsOptional()
  @IsString()
  job_title?: string

  @IsOptional()
  @IsString()
  department?: string

  @IsOptional()
  @IsUUID()
  company_id?: string

  @IsOptional()
  @IsString()
  linkedin_url?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  country?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsBoolean()
  is_subscribed?: boolean

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsUUID()
  assigned_to?: string
}