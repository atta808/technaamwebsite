# TECHNAAM INTELLIGENCE — PRODUCTION MIGRATION BASELINE AUDIT
**MODE: AUDIT / PROPOSAL ONLY — NO DATABASE CHANGES HAVE BEEN MADE**

## 1. Executive Summary

Production currently hosts the pre-Phase-6C.1 TechNaam Intelligence architecture. It contains 10 products, 71 evidence rows, 10 vendors, 1 model, and 0 change_log rows (which is consistent with the original schema). It features functional RLS policies and two core RPCs (`technaam_seed_import` and `technaam_publish_product`).

However, the production database lacks the `supabase_migrations.schema_migrations` tracking table. Our goal is to cleanly establish a migration baseline history on production without replaying historical migrations (which would fail against existing tables or destructively reset data), prior to deploying the pending Phase 6C.1 migrations safely.

## 2. Environment Verification

Production has been verified to substantially represent the first four migrations:
1. `20260826000000_initial_technaam_intelligence.sql`
2. `20260826010000_schema_v2_dataset.sql`
3. `20260826020000_seed_import_rpc.sql`
4. `20260826030000_product_publication_rpc.sql`

## 3. Phase 6C.1 Safety Analysis

The pending Phase 6C.1 migrations are designed to be purely additive and non-destructive:
- `20260826040000_phase6c1_technology_foundation.sql`: Introduces new tables and adds the `tech_entity_id` anchor to `products`, `evidence`, and `change_log`. It includes a `DO` block that safely generates anchors for existing products.
- `20260826040001_phase6c1_rpc_updates.sql`: Updates `technaam_seed_import`.

**Conclusion**: The existing data (10 products, 71 evidence rows) is safe. However, because the tracking table is missing, Supabase currently treats all local migrations as pending. Applying them directly would fail destructively.

## 4. Baseline Strategy Comparison

We must establish the migration history before proceeding. There are two potential baseline strategies.

### Strategy A: `supabase db pull` (The "Supported" Workflow)
**How it works**: Connects to the remote database, dumps the existing schema, creates a new baseline migration file locally, and initializes the remote tracking table.
- **Pros**: It is the officially documented Supabase method for an existing remote database.
- **Cons**: It **requires Docker** to run `pg_dump` internally. Our current development machine does not have Docker installed, meaning this command is guaranteed to fail in the current environment. Additionally, it creates a new "squashed" schema file locally which deviates from our neatly categorized historical files.

### Strategy B: `supabase migration repair` (The "Declarative" Workflow)
**How it works**: Directly commands the Supabase tracking system to mark specific local migration files as "applied" in the remote database's tracking table, *without executing their SQL payloads*.
- **Pros**: **Does not require Docker.** It preserves our existing Git migration structure without creating a squashed file. It natively handles the creation of the tracking table if it doesn't exist.
- **Cons**: It requires absolute certainty that the local files match the remote schema.

## 5. Recommended Baseline Plan

**The recommended strategy is Strategy B (`supabase migration repair`).**

Because production already contains the pre-6C.1 schema, the migration history is absent, and Docker is unavailable, `migration repair` avoids creating a new baseline file and cleanly links our repository to the environment.

### 5.1 Final Parity Check Required
Before executing this strategy, a final parity verification is required between the production database and the first four repository migrations. The owner must manually verify that production exactly matches the local files for:
- tables
- columns (data types, nullability, defaults)
- primary keys, foreign keys, unique/check constraints, and indexes
- triggers
- RLS enabled state and RLS policies
- functions/RPCs, signatures, and grants

*If any material mismatch exists, DO NOT proceed with migration repair for that file. Document the mismatch and propose a reconciliation step.*

### 5.2 Target Migration State
If parity is confirmed, the target migration history on the remote database must become:
- `20260826000000` — applied
- `20260826010000` — applied
- `20260826020000` — applied
- `20260826030000` — applied
- `20260826040000` — pending
- `20260826040001` — pending

### 5.3 Execution Sequence (Pending Owner Verification)
*DO NOT RUN until the Final Parity Check is complete and approved.*

1. Apply the historical baseline:
```bash
supabase migration repair --status applied 20260826000000
supabase migration repair --status applied 20260826010000
supabase migration repair --status applied 20260826020000
supabase migration repair --status applied 20260826030000
```

2. Verify Phase 6C.1 is safely recognized as the only pending change:
```bash
supabase db push --dry-run
```

3. If the dry-run confirms safety and the owner approves, execute the actual push:
```bash
supabase db push
```

**STATUS: AUDIT COMPLETE — AWAITING OWNER APPROVAL**