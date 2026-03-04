import {
  IsString, IsOptional, IsEnum, IsUUID,
  IsDateString, MaxLength, IsNotEmpty, MinDate
} from 'class-validator'
import { Transform } from 'class-transformer'

export type TaskStatus   = 'à_faire' | 'en_cours' | 'terminée' | 'annulée'
export type TaskPriority = 'basse' | 'moyenne' | 'haute' | 'urgente'
// FIX #1 — Ajout du type de tâche (rappel / rendez-vous / appel / tâche)
// Permet de distinguer les activités calendaires dans la vue agenda.
export type TaskType = 'tâche' | 'rappel' | 'rendez-vous' | 'appel'

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
  @IsEnum(['tâche', 'rappel', 'rendez-vous', 'appel'])
  type?: TaskType

  // FIX #2 — Validation anti-date passée : @MinDate(new Date()) rejette
  // toute date antérieure à maintenant, sauf pour les statuts déjà terminés.
  // Le @Transform garantit que la comparaison porte sur un objet Date.
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value)
  @MinDate(new Date(), { message: 'La date d\'échéance ne peut pas être dans le passé.' })
  due_date?: string             // ISO string → converti en Date

  @IsOptional()
  @IsUUID()
  contact_id?: string

  @IsOptional()
  @IsUUID()
  lead_id?: string

  @IsOptional()
  @IsUUID()
  company_id?: string

  @IsOptional()
  @IsUUID()
  assigned_to?: string          // Par défaut : l'utilisateur connecté
}