import {
  IsEmail, IsOptional, IsString, IsUUID,
  IsBoolean, MaxLength, IsArray, IsNotEmpty
} from 'class-validator'

/**
 * DTO de création d'un contact.
 *
 * Règles de validation :
 *  - first_name / last_name : OBLIGATOIRES (contrainte métier CRM)
 *  - email                  : OPTIONNEL mais UNIQUE en base (constraint SQL)
 *                             → si fourni, doit être un email valide
 *  - phone / mobile         : OPTIONNELS
 */
export class CreateContactDto {
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est obligatoire.' })
  @MaxLength(100)
  first_name: string

  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire.' })
  @MaxLength(100)
  last_name: string

  // Optionnel mais validé si présent (unicité gérée en base)
  @IsOptional()
  @IsEmail({}, { message: 'Format d\'email invalide.' })
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
  @IsUUID('4', { message: 'company_id doit être un UUID valide.' })
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
  @IsUUID('4', { message: 'assigned_to doit être un UUID valide.' })
  assigned_to?: string
}