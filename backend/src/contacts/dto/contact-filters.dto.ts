import {
  IsOptional, IsString, IsUUID, IsBoolean,
  IsInt, Min, Max
} from 'class-validator'
import { Transform, Type } from 'class-transformer'

/**
 * DTO de filtrage et pagination pour GET /contacts.
 *
 * Avant ce DTO, les paramètres de @Query() arrivaient en string brute
 * sans aucune validation côté NestJS. Ce DTO, couplé au ValidationPipe
 * global (transform: true dans main.ts), corrige cela.
 */
export class ContactFiltersDto {
  /** Recherche textuelle (nom, email, poste) via ILIKE */
  @IsOptional()
  @IsString()
  search?: string

  /** Filtrer par entreprise */
  @IsOptional()
  @IsUUID('4', { message: 'company_id doit être un UUID valide.' })
  company_id?: string

  /** Filtrer par commercial assigné */
  @IsOptional()
  @IsUUID('4', { message: 'assigned_to doit être un UUID valide.' })
  assigned_to?: string

  /** Filtrer par statut d'abonnement email */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true')  return true
    if (value === 'false') return false
    return value
  })
  @IsBoolean({ message: 'is_subscribed doit être true ou false.' })
  is_subscribed?: boolean

  /** Filtrer par ville */
  @IsOptional()
  @IsString()
  city?: string

  /** Numéro de page (≥ 1) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  /** Nombre d'éléments par page (1–100) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20
}