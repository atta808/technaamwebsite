# TECHNAAM INTELLIGENCE — PRODUCTION MIGRATION BASELINE AUDIT
**MODE: AUDIT / PROPOSAL ONLY — NO DATABASE CHANGES HAVE BEEN MADE**

## 1. Executive Summary

Production currently hosts the pre-Phase-6C.1 TechNaam Intelligence architecture. It contains 10 products, 71 evidence rows, 10 vendors, 1 model, and 0 change_log rows (which is consistent with the original schema). It features functional RLS policies and two core RPCs (`technaam_seed_import` and `technaam_publish_product`).

However, the production database lacks the `supabase_migrations.schema_migrations` tracking table. Our goal is to cleanly establish a migration baseline history on production without replaying historical migrations (which would fail against existing tables or destructively reset data) and then deploy the two pending Phase 6C.1 migrations safely.

## 2. Environment Verification

The existing production architecture perfectly maps to the first four migrations in our repository:
1. `20260826000000_initial_technaam_intelligence.sql`
2. `20260826010000_schema_v2_dataset.sql`
3. `20260826020000_seed_import_rpc.sql`
4. `20260826030000_product_publication_rpc.sql`

## 3. Phase 6C.1 Safety Analysis

The pending Phase 6C.1 migrations are designed to be purely additive and non-destructive:
- `20260826040000_phase6c1_technology_foundation.sql`: Introduces new tables (`tech_categories`, `technology_entities`, `hardware_entities`, `os_entities`, `tech_relationships`). It adds the `tech_entity_id` to `products`, `evidence`, and `change_log`. Crucially, it includes a `DO` block that loops over existing products and non-destructively generates a `technology_entities` anchor for each, mapping them back. It also cascades this new `tech_entity_id` to existing evidence.
- `20260826040001_phase6c1_rpc_updates.sql`: Replaces the `technaam_seed_import` RPC to natively generate `technology_entities` anchors for new products on import.

**Conclusion**: The existing 10 products and 71 evidence records will automatically and safely receive their new technology anchors upon applying `040000`. No manual data backfill or re-running of seed imports is required for existing data.

## 4. Proposed Baseline and Deployment Strategy

Because the tracking table is missing, Supabase treats all local migrations as pending. Applying them directly would attempt to re-create the `vendors` table, immediately failing. We must sync the remote migration history first.

*Note: Do NOT manually create the tracking table or insert rows via the SQL editor.*

### Step 4.1: Synchronize Baseline (Read-Only/Sync)

The officially supported Supabase workflow for establishing a baseline for a remote database is `supabase db pull`. This captures the remote schema as a baseline migration and sets up the migration history.

**Prerequisite**: The machine running these commands **must** have Docker installed and running. If Docker is not available, these commands will fail.

```bash
# This command connects to the linked production project and pulls the current remote schema.
# It sets up the migration history infrastructure on remote without modifying our tables.
supabase db pull --linked
```

*Note: If `supabase db pull` fails or proves inadequate due to Docker constraints, and the owner approves manual history repair instead, you may use:*
```bash
# DO NOT RUN WITHOUT OWNER APPROVAL
supabase migration repair --status applied 20260826000000
supabase migration repair --status applied 20260826010000
supabase migration repair --status applied 20260826020000
supabase migration repair --status applied 20260826030000
```
*(This commands Supabase to artificially mark the first four migrations as applied in the tracking table without actually executing their SQL).*

### Step 4.2: Verify Pending Status (Read-Only)

After the baseline is established or the historical migrations are marked as applied, verify the status.

```bash
supabase db diff --linked
```
This should show only the differences introduced by the Phase 6C.1 migrations.

### Step 4.3: Deploy Phase 6C.1 (Mutates Production)

Once the history is synced, and ONLY migrations `040000` and `040001` are registered as pending, we can deploy the Phase 6C.1 foundation.

```bash
# Deploys the pending Phase 6C.1 migrations to production.
supabase db push
```

## 5. Required Approvals

Owner approval is REQUIRED before any production migration or baseline command is executed. Do not modify production or start Phase 6C.2 until this plan is formally approved and executed by the project owner.
