import {
  IsString, IsOptional, IsEnum, IsUUID,
  IsDate, MaxLength, IsNotEmpty, MinDate,
} from 'class-validator'
import { Transform } from 'class-transformer'
import { Type } from 'class-transformer'

export type TaskStatus   = 'à_faire' | 'en_cours' | 'terminée' | 'annulée'
export type TaskPriority = 'basse' | 'moyenne' | 'haute' | 'urgente'
// Permet de distinguer les activités calendaires dans la vue agenda.
export type TaskType = 'tache' | 'rappel' | 'rendez-vous' | 'appel'
const toNullIfEmpty = ({ value }) => (value === '' ? null : value)

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(['à_faire', 'en_cours', 'terminée', 'annulée'])
  status?: TaskStatus

  @IsOptional()
  @IsEnum(['basse', 'moyenne', 'haute', 'urgente'])
  priority?: TaskPriority

  // FIX #1 — Nouveau champ type pour catégoriser la tâche
  @IsOptional()
  @IsEnum(['tache', 'rappel', 'rendez-vous', 'appel'])
  type?: TaskType

  // FIX #2 — Validation anti-date passée : @MinDate(new Date()) rejette
  // toute date antérieure à maintenant, sauf pour les statuts déjà terminés.
  // Le @Transform garantit que la comparaison porte sur un objet Date.
  @IsOptional()
  // Use class-transformer to convert the incoming string to a Date instance,
  // and validate it as a Date. This works with ValidationPipe.transform = true.
  @Type(() => Date)
  @IsDate()
  @MinDate(new Date(), { message: 'La date d\'échéance ne peut pas être dans le passé.' })
  due_date?: Date             // Date instance after transformation

  @IsOptional()
  @IsUUID()
  @Transform(toNullIfEmpty)
  contact_id?: string | null

  @IsOptional()
  @IsUUID()
  @Transform(toNullIfEmpty)
  company_id?: string | null

  @IsOptional()
  @IsUUID()
  @Transform(toNullIfEmpty)
  lead_id?: string | null

  @IsOptional()
  @IsUUID()
  assigned_to?: string          // Par défaut : l'utilisateur connecté
}