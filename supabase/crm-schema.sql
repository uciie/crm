-- ============================================================
-- CRM SaaS — Schéma Base de Données Supabase (PostgreSQL)
-- ============================================================

-- Activation de l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ÉNUMÉRATIONS (TYPES)
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'commercial', 'utilisateur');
CREATE TYPE lead_status AS ENUM ('nouveau', 'contacté', 'qualifié', 'proposition', 'négociation', 'gagné', 'perdu');
CREATE TYPE task_status AS ENUM ('à_faire', 'en_cours', 'terminée', 'annulée');
CREATE TYPE task_priority AS ENUM ('basse', 'moyenne', 'haute', 'urgente');
CREATE TYPE communication_type AS ENUM ('email', 'appel', 'réunion', 'note', 'sms');
CREATE TYPE pipeline_stage AS ENUM ('prospect', 'qualification', 'proposition', 'négociation', 'gagné', 'perdu');

-- ============================================================
-- TABLE : PROFILS UTILISATEURS (Extension de auth.users Supabase)
-- id : UUID (même que auth.users.id)
-- full_name : Nom complet de l'utilisateur
-- avatar_url : URL de l'avatar
-- role : Rôle de l'utilisateur (admin, commercial, utilisateur)
-- phone : Numéro de téléphone
-- is_active : Statut actif/inactif
-- created_at, updated_at : Timestamps
-- ============================================================

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    VARCHAR(255) NOT NULL,
  avatar_url   TEXT,
  role         user_role NOT NULL DEFAULT 'utilisateur',
  phone        VARCHAR(20),
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : ENTREPRISES
-- id : UUID
-- name : Nom de l'entreprise
-- domain : Domaine web (ex: example.com)
-- industry : Secteur d'activité
-- size : Taille de l'entreprise (ex: '1-10', '11-50')
-- website : URL du site web
-- phone : Numéro de téléphone
-- address, city, country : Adresse complète
-- logo_url : URL du logo
-- annual_revenue : Chiffre d'affaires annuel
-- notes : Notes internes
-- created_by : Référence à profiles(id) pour savoir qui a créé l'entreprise
-- created_at, updated_at : Timestamps
-- ============================================================

CREATE TABLE companies (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(255) NOT NULL,
  domain       VARCHAR(255) UNIQUE,
  industry     VARCHAR(100),
  size         VARCHAR(50),           -- ex: '1-10', '11-50', '51-200'
  website      TEXT,
  phone        VARCHAR(20),
  address      TEXT,
  city         VARCHAR(100),
  country      VARCHAR(100) DEFAULT 'France',
  logo_url     TEXT,
  annual_revenue DECIMAL(15,2),
  notes        TEXT,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : CONTACTS
-- id : UUID
-- first_name, last_name : Prénom et nom du contact
-- email : Adresse email (unique)
-- phone, mobile : Numéros de téléphone
-- job_title : Poste occupé
-- department : Département
-- company_id : Référence à l'entreprise (companies.id)
-- avatar_url : URL de l'avatar du contact
-- linkedin_url : URL du profil LinkedIn
-- address, city, country : Adresse complète
-- tags : Tableau de tags (ex: ['VIP', 'Newsletter'])
-- is_subscribed : Consentement pour les emails marketing
-- notes : Notes internes sur le contact
-- assigned_to : Référence à profiles(id) pour savoir qui est responsable du contact
-- created_by : Référence à profiles(id) pour savoir qui a créé le contact
-- created_at, updated_at : Timestamps
-- ============================================================

CREATE TABLE contacts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name   VARCHAR(100) NOT NULL,
  last_name    VARCHAR(100) NOT NULL,
  email        VARCHAR(255) UNIQUE,
  phone        VARCHAR(20),
  mobile       VARCHAR(20),
  job_title    VARCHAR(150),
  department   VARCHAR(100),
  company_id   UUID REFERENCES companies(id) ON DELETE SET NULL,
  avatar_url   TEXT,
  linkedin_url TEXT,
  address      TEXT,
  city         VARCHAR(100),
  country      VARCHAR(100) DEFAULT 'France',
  tags         TEXT[],                -- ex: ['VIP', 'Newsletter']
  is_subscribed BOOLEAN DEFAULT true, -- Consentement email
  notes        TEXT,
  assigned_to  UUID REFERENCES profiles(id),
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : LEADS (Opportunités commerciales)
-- id : UUID
-- title : Titre de l'opportunité
-- status : Statut du lead (nouveau, contacté, qualifié, proposition, négociation, gagné, perdu)
-- value : Valeur estimée de l'opportunité en euros
-- probability : Probabilité de conversion (0-100)
-- expected_close_date : Date de clôture prévue
-- contact_id : Référence au contact associé (contacts.id)
-- company_id : Référence à l'entreprise associée (companies.id)
-- assigned_to : Référence à profiles(id) pour savoir qui est responsable du lead
-- source : Source du lead (ex: 'LinkedIn', 'Referral', 'Inbound')
-- lost_reason : Raison de la perte si le lead est perdu
-- notes : Notes internes sur le lead
-- created_by : Référence à profiles(id) pour savoir qui a créé le lead
-- created_at, updated_at : Timestamps
-- ============================================================

CREATE TABLE leads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         VARCHAR(255) NOT NULL,
  status        lead_status NOT NULL DEFAULT 'nouveau',
  value         DECIMAL(15,2),        -- Valeur estimée en €
  probability   SMALLINT DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  contact_id    UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,
  assigned_to   UUID REFERENCES profiles(id),
  source        VARCHAR(100),         -- ex: 'LinkedIn', 'Referral', 'Inbound'
  lost_reason   TEXT,
  notes         TEXT,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : PIPELINE DE VENTE (Kanban)
-- ============================================================

-- ************************************************************
-- TABLE : PIPELINE DE VENTE STAGES
-- id : UUID
-- name : Nom de l'étape (ex: 'Prospect', 'Qualification')
-- stage : Identifiant de l'étape (prospect, qualification, proposition, négociation, gagné, perdu)
-- order_index : Position de l'étape dans le Kanban
-- color : Couleur hexadécimale pour l'affichage (ex: '#ff5733')
-- created_at : Timestamp de création
-- ************************************************************
CREATE TABLE pipeline_stages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(100) NOT NULL,
  stage        pipeline_stage NOT NULL,
  order_index  SMALLINT NOT NULL,     -- Position dans le Kanban
  color        VARCHAR(7) DEFAULT '#6366f1', -- Couleur hex
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ************************************************************
-- TABLE : PIPELINE DE VENTE DEALS
-- id : UUID
-- lead_id : Référence au lead associé (leads.id)
-- stage_id : Référence à l'étape du pipeline (pipeline_stages.id)
-- entered_stage_at : Timestamp de l'entrée dans l'étape
-- created_at, updated_at : Timestamps
-- ************************************************************
CREATE TABLE pipeline_deals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  stage_id        UUID NOT NULL REFERENCES pipeline_stages(id),
  entered_stage_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : TÂCHES
-- id : UUID
-- title : Titre de la tâche
-- description : Description détaillée de la tâche
-- status : Statut de la tâche (à faire, en cours, terminée, annulée)
-- priority : Priorité de la tâche (basse, moyenne, haute, urgente)
-- due_date : Date d'échéance de la tâche
-- completed_at : Timestamp de complétion de la tâche
-- contact_id : Référence au contact associé (contacts.id)
-- lead_id : Référence au lead associé (leads.id)
-- company_id : Référence à l'entreprise associée (companies.id)
-- assigned_to : Référence à profiles(id) pour savoir qui est responsable de la tâche
-- created_by : Référence à profiles(id) pour savoir qui a créé la tâche
-- created_at, updated_at : Timestamps
-- ============================================================

CREATE TABLE tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  status       task_status NOT NULL DEFAULT 'à_faire',
  priority     task_priority NOT NULL DEFAULT 'moyenne',
  due_date     TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  contact_id   UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id      UUID REFERENCES leads(id) ON DELETE SET NULL,
  company_id   UUID REFERENCES companies(id) ON DELETE SET NULL,
  assigned_to  UUID NOT NULL REFERENCES profiles(id),
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : HISTORIQUE DES COMMUNICATIONS
-- id : UUID
-- type : Type de communication (email, appel, réunion, note, sms)
-- subject : Sujet de la communication (pour les emails/réunions)
-- body : Contenu de la communication (texte libre)
-- direction : Direction de la communication (entrant, sortant)
-- duration_min : Durée en minutes (pour les appels/réunions)
-- scheduled_at : Date et heure prévues pour la communication (pour les appels/réunions)
-- occurred_at : Date et heure de la communication (par défaut NOW())
-- contact_id : Référence au contact associé (contacts.id)
-- lead_id : Référence au lead associé (leads.id)
-- company_id : Référence à l'entreprise associée (companies.id)
-- brevo_message_id : ID du message dans Brevo (pour les emails)
-- created_by : Référence à profiles(id) pour savoir qui a créé la communication
-- created_at : Timestamp de création
-- ============================================================

CREATE TABLE communications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type         communication_type NOT NULL,
  subject      VARCHAR(255),
  body         TEXT,
  direction    VARCHAR(10) CHECK (direction IN ('entrant', 'sortant')),
  duration_min SMALLINT,             -- Pour les appels/réunions
  scheduled_at TIMESTAMPTZ,
  occurred_at  TIMESTAMPTZ DEFAULT NOW(),
  contact_id   UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id      UUID REFERENCES leads(id) ON DELETE SET NULL,
  company_id   UUID REFERENCES companies(id) ON DELETE SET NULL,
  brevo_message_id TEXT,             -- ID du message Brevo si email
  created_by   UUID NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : CAMPAGNES EMAIL (Brevo)
-- id : UUID
-- name : Nom de la campagne
-- subject : Sujet de la campagne
-- brevo_campaign_id : ID de la campagne dans Brevo
-- status : Statut de la campagne (brouillon, planifiée, envoyée)
-- sent_count : Nombre d'emails envoyés
-- open_rate : Taux d'ouverture en pourcentage
-- click_rate : Taux de clics en pourcentage
-- scheduled_at : Date et heure de l'envoi prévu
-- sent_at : Date et heure de l'envoi effectif
-- created_by : Référence à profiles(id) pour savoir qui a créé la campagne
-- created_at, updated_at : Timestamps
-- ============================================================

CREATE TABLE email_campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  subject         VARCHAR(255) NOT NULL,
  brevo_campaign_id INTEGER,         -- ID dans Brevo
  status          VARCHAR(50) DEFAULT 'brouillon',
  sent_count      INTEGER DEFAULT 0,
  open_rate       DECIMAL(5,2),
  click_rate      DECIMAL(5,2),
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES (Performances)
-- ============================================================

CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_assigned ON contacts(assigned_to);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_communications_contact ON communications(contact_id);
CREATE INDEX idx_communications_lead ON communications(lead_id);
CREATE INDEX idx_pipeline_deals_stage ON pipeline_deals(stage_id);

-- ============================================================
-- TRIGGERS : Mise à jour automatique de updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Sécurité par rôle
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Les admins voient tout
CREATE POLICY "admin_full_access" ON contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Les commerciaux voient leurs propres données + celles non assignées
CREATE POLICY "commercial_own_contacts" ON contacts
  FOR ALL USING (
    assigned_to = auth.uid()
    OR assigned_to IS NULL
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Un utilisateur voit son propre profil
CREATE POLICY "user_own_profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "user_update_own_profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- DONNÉES INITIALES : Étapes du pipeline
-- ============================================================

INSERT INTO pipeline_stages (name, stage, order_index, color) VALUES
  ('Prospect',      'prospect',      1, '#94a3b8'),
  ('Qualification', 'qualification', 2, '#60a5fa'),
  ('Proposition',   'proposition',   3, '#f59e0b'),
  ('Négociation',   'négociation',   4, '#a78bfa'),
  ('Gagné',         'gagné',         5, '#34d399'),
  ('Perdu',         'perdu',         6, '#f87171');
