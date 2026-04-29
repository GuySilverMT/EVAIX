Provider & Model Ingestion Mapping
Relevant DB Tables
Table	Purpose	Key Fields	Status
ProviderConfig	Provider configs (OpenAI, Groq, etc.)	id (e.g. "openai"), name, type, baseUrl, apiKeyEnvVar, isEnabled	Active
ProviderModel	Per-provider model overrides (pricing/context for aggregators)	providerId, apiString (unique), displayName, inputCostPer1kOverride	Active (UI-driven)
Model	Canonical registry from /models API	id (${providerId}:${name}), providerId, name, providerData (JSON), isActive	Primary Active
ModelCapabilities	Surveyed specs	modelId (unique), contextWindow, hasVision, supportsFunctionCalling	Active
ModelRegistry	Legacy duplicate of Model	provider_id, model_id, provider_data (JSON)	Old - Remove
Others: ModelUsage (logs), ModelFailure.

Current Ingestion Flows
Bootstrap Providers (ProviderManager.initialize):

Loads ProviderConfig + auto-creates from .env (e.g. GROQ_API_KEY → "groq").
Instantiates ProviderFactory → BaseLLMProvider.
Dynamic Sync (Primary - Runtime):

RegistrySyncService.syncModels: For each provider → getModels() → upsert Model (providerData=raw JSON), Surveyor.classify → ModelCapabilities, PricingRegistry.
Filters free-only for OpenRouter if configured.
Marks inactive "ghost" models.
Backward: Upserts legacy ModelRegistry.
UI Per-Provider (fetchFromProvider):

Hits /models, parses OpenAI/OpenRouter → upsert ProviderModel.
Static Script (ingest_latest_models.ts):

Wipes Model/ModelCapabilities → loads JSON → upsert. Outdated/Destructive.
Surveyor (Surveyor.ts):

Regex patterns (e.g. /gpt-4o/i → vision=true, ctx=128k) → ModelCapabilities.
Runtime Model Selection
modelManager.service.ts: Query Model (active/healthy), LRU by ModelUsage, score success/latency/free/risk → pick providerData.id as apiString.
Old/Unused Code
ModelRegistry: Legacy. Written in sync ("backward compat"). No reads. Remove model + upsert.
Static JSON script: Vs dynamic /models. Deprecate.
ProviderModel: Overrides, but runtime uses Model.providerData. Audit usages.
Multiple sync triggers (router.sync, scout, scripts).
Simplifications & Removals
Drop Legacy: Remove ModelRegistry from schema.prisma, delete upsert in RegistrySyncService.
Unify Sync: Single cron → ProviderManager → RegistrySyncService. Drop script/UI fetch if redundant.
Merge Tables: Fold ProviderModel → Model.providerData (pricing/context).
Central ID: Always providerData.id (apiString).
Prune: Run npx prisma migrate dev --name prune-modelregistry after schema edit.
Flow Diagram
graph LR
    A[Env/DB ProviderConfig] --> B[ProviderManager.init<br>Factory.createProvider]
    B --> C[RegistrySyncService.syncModels]
    C --> D[provider.getModels /models]
    D --> E[Upsert Model<br>id=provider:name<br>providerData=JSON]
    E --> F[Surveyor regex → ModelCapabilities]
    F --> G[PricingRegistry]
    G --> H[Runtime: modelManager<br>Query Model → apiString]
    I[UI fetchFromProvider] -.-> J[ProviderModel overrides]
Result: Clean dynamic ingestion via /models + regex survey. No legacy/static.





Frontend-Backend Connections for Providers/Models
TRPC Hooks → Backend Routers (Fully Wired)
Frontend uses tRPC React queries/mutations. Key connections from ProviderManagementGrid.tsx:

Frontend Hook	Backend Endpoint	Action
trpc.providers.list.useQuery()	providers.router.list	List all ProviderConfig
trpc.model.listByProvider.useQuery({providerId})	model.router.listByProvider	Model counts/caps per provider from Model table
trpc.model.getProviderSpend.useQuery({providerId})	model.router.getProviderSpend	Aggregate ModelUsage.cost spend
trpc.providers.upsert.useMutation()	providers.router.upsert	Full CRUD ProviderConfig (inline edit name/type/baseUrl/apiKey/budgets/toggles)
trpc.providers.setEnabled.useMutation()	providers.router.setEnabled	Toggle isEnabled
trpc.providers.fetchAndNormalizeModels.useMutation({providerId})	providers.router.fetchAndNormalizeModels	Sync models → RegistrySyncService.syncSingleProvider → populate Model
trpc.providers.delete.useMutation()	providers.router.delete	Delete ProviderConfig
trpc.model.sync.useMutation()	model.router.sync	Global sync all providers
ModelInventoryModal.tsx: trpc.model.listByProvider → grid of models/caps/pricing.
UI Functionality (ProviderManagementGrid)
Cards: Inline editable, real-time model counts/spend/budget bar from DB.
Actions: Toggle, edit/save all fields, "Fetch Models" (sync), delete, inventory modal.
Auto-refresh: Invalidate queries post-mutation.
What's Preventing Effective UI Management
Stubbed Add Form (AddProviderForm.tsx):

Visual mockup only. No state for inputs, no trpc.providers.upsert, SuperAiButton "Fetch Models" disconnected.
Fix: Wire inputs → draft state → upsert mutation → morph to ProviderCard on success.
Missing ProviderModel Mgmt:

Backend full CRUD (providerModel.router: list/upsert/delete/fetchFromProvider).
No UI grid/tab. Models shown from Model table only.
Fix: Add tab/grid using trpc.providerModel.list, SuperAiButton → fetchFromProvider.
Billing/Scrape Incomplete:

Backend: scrapeBalance, saveBillingSession.
UI: Budget display/spend, but no scrape button/cookie capture.
Fix: Add "Scrape Balance" → backend mutation.
No Key Validation:

Backend providers.router.validateKey.
UI no "Test Key" button.
Fix: Add validate pre-upsert.
Schema Node Irrelevant:

SchemaEvolutionNode.tsx: Draft schema changes, no apply. For creator-studio workflow.
Mermaid: UI → Backend Flow
graph LR
    UI[ProviderManagementGrid] -->|list| B1[providers.list → ProviderService.listProviders]
    UI -->|listByProvider| B2[model.listByProvider → Model table]
    UI -->|upsert| B3[providers.upsert → upsertProviderConfig + .env update]
    UI -->|setEnabled| B4[providers.setEnabled]
    UI -->|fetchModels| B5[providers.fetchAndNormalizeModels → RegistrySyncService]
    B5 --> Model[ModelCapabilities]
    AddForm[AddProviderForm Stub] -.->|Needs Wire| B3
    Modal[ModelInventoryModal] --> B2
UI 85% Effective: Full list/edit/sync/spend for providers + models. Blocks: New provider stub, no ProviderModel UI, no billing scrape. Backend fully supports.