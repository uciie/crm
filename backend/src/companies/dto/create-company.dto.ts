import {
  IsString, IsOptional, IsUUID, IsUrl,
  MaxLength, IsDecimal, IsEnum
} from 'class-validator'

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+'

export class CreateCompanyDto {
  @IsString()
  @MaxLength(255)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string

  @IsOptional()
  @IsEnum(['1-10', '11-50', '51-200', '201-500', '500+'])
  size?: CompanySize

  @IsOptional()
  @IsString()
  website?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string

  @IsOptional()
  @IsString()
  logo_url?: string

  @IsOptional()
  @IsDecimal()
  annual_revenue?: string | number

  @IsOptional()
  @IsString()
  notes?: string
}