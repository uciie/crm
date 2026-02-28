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
   * FIX PRINCIPAL — enableImplicitConversion: true dans main.ts transforme
   * la string "false" en booléen true (Boolean("false") === true en JS).
   *
   * Solution : { toClassOnly: true } + String(value) pour court-circuiter
   * la conversion implicite et parser manuellement depuis la valeur brute.
   */
  @IsOptional()
  @Transform(({ value }) => {
    const raw = String(value).trim().toLowerCase()
    if (raw === 'true')  return true
    if (raw === 'false') return false
    if (value === true)  return true
    if (value === false) return false
    return undefined
  }, { toClassOnly: true })
  @IsIn([true, false, undefined], { message: 'is_subscribed doit être true ou false.' })
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