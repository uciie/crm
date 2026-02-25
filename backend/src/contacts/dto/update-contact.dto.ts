import { PartialType } from '@nestjs/mapped-types'
import { CreateContactDto } from './create-contact.dto'
import { IsOptional, IsEnum } from 'class-validator'

export class UpdateContactDto extends PartialType(CreateContactDto) {
  // Champs supplémentaires uniquement disponibles à la mise à jour

  @IsOptional()
  @IsEnum(['admin', 'commercial', 'utilisateur'])
  // Réassigner le contact à un autre commercial (admin only)
  reassign_to?: string

  @IsOptional()
  avatar_url?: string
}