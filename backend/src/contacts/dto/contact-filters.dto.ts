import {
  IsOptional, IsString, IsUUID, IsInt, Min, Max, IsIn
} from 'class-validator'
import { Transform, Type } from 'class-transformer'

/**
 * DTO de filtrage et pagination pour GET /contacts.
 *
 * FIX : @IsBoolean() rejetait silencieusement `false` avec whitelist:true
 * → remplacé par @IsIn([true, false]) qui accepte les deux valeurs booléennes.
 *
 * Le @Transform convertit les strings 'true'/'false' en boolean AVANT la
 * validation, ce qui est nécessaire car les query params HTTP sont toujours
 * des strings.
 */
export class ContactFiltersDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsUUID('4', { message: 'company_id doit être un UUID valide.' })
  company_id?: string

  @IsOptional()
  @IsUUID('4', { message: 'assigned_to doit être un UUID valide.' })
  assigned_to?: string

  /**
   * FIX : on reçoit la valeur brute via le getter ci-dessous.
   * Le @Transform utilise `obj` (l'objet source brut) pour lire
   * directement depuis la query string avant toute conversion.
   */
  @IsOptional()
  @Transform(({ obj }) => {
    // obj est l'objet source (les query params bruts)
    // On lit directement la valeur string depuis obj, pas depuis value
    // car value a déjà été convertie par enableImplicitConversion
    const raw = obj?.is_subscribed
    if (raw === 'true'  || raw === true)  return true
    if (raw === 'false' || raw === false) return false
    return undefined
  })
  is_subscribed?: boolean

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20
}