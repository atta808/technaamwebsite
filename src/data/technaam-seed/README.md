# TechNaam Intelligence Seed Dataset

## Purpose

This directory contains the first source-backed dataset for the TechNaam Technology Intelligence platform. It is intentionally limited to 10 AI coding and local AI products and is meant to feed future catalog, pricing, feature, model, source, and hardware-requirement records.

## Verification Methodology

- Every externally verifiable factual field is tied to a `source_id` where applicable.
- First-party sources are preferred: official product sites, pricing pages, documentation, GitHub repositories, and changelogs.
- Fields that could not be verified are left `null` or omitted rather than inferred.
- Product and pricing information was collected on `2026-08-26`.

## Source Policy

- Affiliate websites are not used as factual sources.
- Third-party sources are only used when first-party information does not exist, and are explicitly labeled.
- Every source record includes a URL, source type, publisher, title where available, access date, and notes.

## Unknown / Null Policy

- `null` means the value is not currently verified, not that the value is false or zero.
- Unknown or dynamic pricing is documented with the official pricing URL when available.
- No affiliate commissions, estimates, or guessed product data are included.

## How This Dataset Will Eventually Be Imported

This data is not yet connected to Supabase. When the import layer is built, the JSON files in this directory will be mapped to the tables defined in `supabase/migrations/`, with internal IDs resolved through the existing schema. No database insert or migration is performed by this dataset directory itself.

## Import Status

This dataset has NOT been inserted into Supabase and has NOT been applied as a migration.
