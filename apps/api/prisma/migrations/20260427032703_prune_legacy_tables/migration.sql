-- Migration: Prune legacy static tables for arbitrage clean-slate
-- Drops legacy provider/model tables and legacy drizzle migrations table

DROP TABLE IF EXISTS "openrouter_models" CASCADE;
DROP TABLE IF EXISTS "ollama_models" CASCADE;
DROP TABLE IF EXISTS "nvidia_models" CASCADE;
DROP TABLE IF EXISTS "mistral_models" CASCADE;
DROP TABLE IF EXISTS "groq_models" CASCADE;
DROP TABLE IF EXISTS "cerebras_models" CASCADE;
DROP TABLE IF EXISTS "google_models_example" CASCADE;

-- The legacy table named model_registry (not Model or ModelCapabilities)
DROP TABLE IF EXISTS "model_registry" CASCADE;

-- Drizzle migrations table (in schema 'drizzle')
DROP TABLE IF EXISTS drizzle.__drizzle_migrations CASCADE;

-- If the drizzle schema itself is unused, optionally drop it
-- DROP SCHEMA IF EXISTS drizzle CASCADE;
