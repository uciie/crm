import { IsOptional, IsString, IsUUID, IsEnum, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class LeadFiltersDto {
  @IsOptional() @IsString() search?: string
  @IsOptional() @IsEnum(['nouveau','contacté','qualifié','proposition','négociation','gagné','perdu']) status?: string
  @IsOptional() @IsUUID('4') contact_id?: string
  @IsOptional() @IsUUID('4') company_id?: string
  @IsOptional() @IsUUID('4') assigned_to?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20
}