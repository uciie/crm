import {
  IsString, IsOptional, IsEnum,
  IsDate, MaxLength, Matches,
} from 'class-validator'
import { Transform, Type } from 'class-transformer'

// Convertit '' et null en undefined avant validation
const toUndefinedIfEmpty = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value

// Regex UUID v4
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class UpdateTaskDto {

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(['à_faire', 'en_cours', 'terminée', 'annulée'])
  status?: string

  @IsOptional()
  @IsEnum(['basse', 'moyenne', 'haute', 'urgente'])
  priority?: string

  @IsOptional()
  @IsEnum(['tache', 'rappel', 'rendez-vous', 'appel'])
  type?: string

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  due_date?: Date

  // @IsUUID() remplacé par @Matches — évite les conflits avec enableImplicitConversion
  @IsOptional()
  @Transform(toUndefinedIfEmpty)
  @IsString()
  @Matches(UUID_REGEX, { message: 'contact_id must be a valid UUID' })
  contact_id?: string

  @IsOptional()
  @Transform(toUndefinedIfEmpty)
  @IsString()
  @Matches(UUID_REGEX, { message: 'lead_id must be a valid UUID' })
  lead_id?: string

  @IsOptional()
  @Transform(toUndefinedIfEmpty)
  @IsString()
  @Matches(UUID_REGEX, { message: 'company_id must be a valid UUID' })
  company_id?: string

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  completed_at?: Date

  @IsOptional()
  @Transform(toUndefinedIfEmpty)
  @IsString()
  @Matches(UUID_REGEX, { message: 'assigned_to must be a valid UUID' })
  assigned_to?: string
}