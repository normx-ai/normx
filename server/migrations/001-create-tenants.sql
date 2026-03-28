-- Migration 001: Table tenants dans le schema public
-- Gestion multi-tenant pour NormX

CREATE TABLE IF NOT EXISTS public.tenants (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(63) NOT NULL UNIQUE,
  nom VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'enterprise' CHECK (type IN ('enterprise', 'cabinet', 'client')),
  parent_id INTEGER REFERENCES public.tenants(id),
  schema_name VARCHAR(63) NOT NULL UNIQUE,
  plan VARCHAR(50) DEFAULT 'standard',
  actif BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON public.tenants(parent_id);
CREATE INDEX IF NOT EXISTS idx_tenants_actif ON public.tenants(actif) WHERE actif = true;
