import { PartialType } from '@nestjs/mapped-types'
import { CreateTaskDto } from './create-task.dto'
import { IsOptional, IsDateString } from 'class-validator'

// FIX #2 — UpdateTaskDto hérite de PartialType(CreateTaskDto), donc le
// validateur @MinDate sur due_date est automatiquement propagé ici aussi.
// La propriété completed_at reste libre (pas de contrainte de date future
// car elle enregistre un événement passé).
export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsOptional()
  @IsDateString()
  completed_at?: string         // Renseigné quand status → 'terminée'
}