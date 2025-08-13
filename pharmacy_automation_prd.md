# Pharmacy Stock & Reorder Automation — Phase‑wise PRD (Complete)

**Author:** ChatGPT **Date:** 2025-08-12

---

## Executive summary

A Next.js + MongoDB system to automate pharmacy stock reconciliation and reorder suggestion workflows. The system will parse large Excel files (GRN/order history, starting stock, departmental sales, transfers), maintain an authoritative Item Master from GRNs, calculate current stock, identify reorder candidates, attach latest vendor/manufacturer info, and finally suggest optimal reorder quantities (MVP rule: last sale + 5%). The project is delivered in four phases so each core capability is testable and deployable independently.

---

## Goals & success metrics

- **Accuracy:** Exact `itemCode` matching for joins; correct `currentStock` and `suggestedOrderQty` per business rules.
- **Performance:** Stream and process 10k+ row Excel files within 60s without OOMs.
- **Cost-efficiency:** Minimal persistent storage — raw Excel blobs are not stored by default.
- **Usability:** Clear mapping UI for schema discrepancies; halt processing on unresolved critical discrepancies.

Success metrics: 95%+ exact-match success with user-assisted mapping; zero production OOMs for files <=50k rows; <60s per 10k row file parse on target infra.

---

## Personas

- **Inventory Manager (Uploader):** Uploads Excel files, maps columns, resolves discrepancies, reviews reorder suggestions.
- **Procurement Lead (Approver):** Reviews reorder list and approves POs (Phase 2+).
- **Admin:** Manages Item Master, user accounts, system settings.

---

## Scope

**Included (MVP and phased):** Excel (.xlsx, .xls) uploads; streaming parsing; item master creation/updates from GRNs; aggregation of sales & transfers; current stock calculation; latest vendor lookup; suggested reorder (LastSale×1.05 - CurrentStock); mapping UI; error resolution & audit; export to CSV/XLSX.

---

## Phase breakdown (high level)

- **Phase 1 — Data ingestion & Item Master management** (7 days)
- **Phase 2 — Sales aggregation & stock reconciliation** (7 days)
- **Phase 3 — Vendor/manufacturer enrichment** (3–5 days)
- **Phase 4 — Reorder algorithm (MVP + roadmap to forecasting)** (7 days for MVP rule)

Each phase below expands objectives, process, APIs, UI, data modeling, acceptance criteria and risks.

---

# Phase 1 — Data ingestion & Item Master management

### Objectives

- Reliable parsing of large `.xlsx` and `.xls` GRN/Orders files and other input sheets.
- Build/maintain Item Master (`items` collection) from GRN rows: upsert new item codes, update latest vendor/manufacturer when newer `orderDate` appears.
- Provide column mapping UI and robust discrepancy reporting.

### Detailed requirements

- Accept single `.xlsx` upload with multiple sheets. Detect sheet names and headers.
- Auto-map headers heuristically (case-insensitive, common synonyms). If ambiguous or unmapped, show mapping modal.
- Stream rows using `exceljs` or equivalent to avoid loading entire file into memory.
- Normalize `itemCode` (trim, uppercase), parse dates and numeric types safely.
- For GRN rows: extract at least `itemCode`, `itemName`, `orderDate`, `vendorName`, `manufacturerName`, `quantity`, `unitRate`, `grnNumber`.
- Maintain in-memory map per `itemCode` to compute latest `orderDate` observed in this upload; after parsing, upsert `items` collection with `latestVendor`, `latestManufacturer`, `lastOrderDate` where incoming date > stored date.
- Log all parsing errors and present to user in a validation UI.

### APIs (examples)

- `POST /api/upload` — multipart file upload; returns `{ uploadId, sheets: [{name, headers}] }`.
- `POST /api/upload/:uploadId/map` — body `{ mapping: {fileHeader: canonicalField, ...} }`.
- `POST /api/process` — body `{ uploadId, fileType: 'grn'|'sales'|'transfer'|'startingStock', location }` starts streaming job.
- `GET /api/jobs/:jobId/status` — returns parsing status, errors, row counts.

### UI

- Upload page with sheet preview and sample rows.
- Column mapping modal with saved mappings option.
- Parsing progress and error panel; actionable rows: Edit, Exclude, Mark for item-creation.

### Data model (Item Master)

`items` collection fields: `itemCode (unique)`, `itemName`, `unit`, `category`, `latestManufacturer`, `latestVendor`, `lastOrderDate`, `createdAt`, `updatedAt`. Index: `{ itemCode: 1 }` (unique).

### Acceptance criteria

- Upload + parse a 10k-row GRN within target time without OOM.
- New item codes are inserted; existing codes update `latest*` only when `orderDate` is newer.
- All unmapped/ambiguous headers force manual mapping.

### Risks & mitigations

- **Risk:** Wrong header mapping. **Mitigation:** strong heuristics + mandatory user confirmation.
- **Risk:** Large memory usage. **Mitigation:** streaming parse + per-item aggregates; limit in-memory map size and batch commits.

---

# Phase 2 — Sales aggregation & stock reconciliation

### Objectives

- Aggregate sales across departments for a specified period and location; subtract transfers to produce `CurrentStock` per `itemCode`.

### Detailed requirements

- Accept multiple sales or transfer uploads (user uploads one file at a time but can include multiple uploads in a run) and allow department toggles.
- Streaming parse each file; increment per-item counters in a reducer map: `{ totalSales, totalTransfers }`.
- Pull `StartingStock` for the selected start date and location (from `startingStocks` or an aggregated value parsed from starting stock file).
- Compute: `currentStock = startingQty - totalSales - totalTransfers`.
- If any `currentStock < 0` flag as discrepancy and pause pipeline.

### APIs

- `POST /api/process` with payload `{ uploadIds: [...], startDate, endDate, location, departments: [...] }`.
- `GET /api/stock?startDate=&endDate=&location=` returns paginated `{ itemCode, startingQty, totalSales, totalTransfers, currentStock }`.

### UI

- Reconciliation view: show per-item rows, allow filters (itemCode, name, department included), quick re-run after toggling departments.
- Discrepancy panel with inline row editing or exclusion; exclusions are auditable.

### Data outputs

- `reorderCandidates` collection: `{ itemCode, startingQty, totalSales, totalTransfers, currentStock, computedAt }`. Index: `{ itemCode: 1, computedAt: -1 }`.

### Acceptance criteria

- Accurate per-item `currentStock` calculation for selected inputs.
- Negative stocks flagged; processing halts until resolution.

### Risk & mitigation

- **Risk:** Mismatched units. **Mitigation:** Normalize unit fields during Phase 1 (unit mapping); flag unit mismatches for manual review.

---

# Phase 3 — Vendor / Manufacturer enrichment

### Objectives

- Enrich reorder candidates with latest vendor and manufacturer data from `items` or `orders` collection.

### Detailed requirements

- Bulk fetch `items` for the candidate set; if `latestVendor` or `latestManufacturer` missing, fallback to query `orders` sorted by `orderDate` desc.
- Display vendor, manufacturer, last ordered date, and last paid unit rate if available.
- Allow inline override of vendor (audit stored).

### APIs

- `GET /api/reorders?startDate=&endDate=&location=` returns enriched reorder rows.
- `GET /api/orders/latest/:itemCode`.
- `POST /api/reorders/:itemCode/override` body `{ vendor, reason }`.

### UI

- Reorder Suggestions page with vendor/manufacturer, last unit rate, and editable suggested qty.

### Acceptance criteria

- All reorder rows display vendor & manufacturer where present; fallback queries retrieve data when `items` lacks it.

---

# Phase 4 — Reorder quantity algorithm (MVP + extensibility)

### MVP rule (your spec)

- `LastSaleQty` = total sales during the chosen period or recent month (configurable)
- `TargetStock = ceil(LastSaleQty × 1.05)`
- `SuggestedOrderQty = max(0, TargetStock - CurrentStock)`

### Extensibility points

- Toggle between period-based vs last-month sales.
- Add pack-size rounding, min-order-qty, vendor lead-time, and safety stock multiplier.
- Advanced forecasting: Moving average, Prophet/ARIMA, or ML models once historical data retention is enabled.

### APIs

- `POST /api/predict/mvp` — returns suggested qtys for current `reorderCandidates`.
- `POST /api/predict/config` — set multiplier, period type, rounding rules.

### UI

- Show calculation details per item; allow bulk accept/export.

### Acceptance criteria

- Suggested quantities follow the formula and export matches UI.

---

# Functional requirements (user stories)

1. As an Inventory Manager, I can upload a GRN file and have new items added to Item Master.
2. As an Inventory Manager, I can map file headers if auto-detection fails.
3. As an Inventory Manager, I can run a reconciliation for a start-date and selected departments to get current stock per item.
4. As an Inventory Manager, I can see which items are below target stock and view the suggested order qty.
5. As an Inventory Manager, I can edit/override suggested qtys and vendor selections; all overrides are audit-logged.
6. As an Admin, I can view processing logs and errors for each upload.

---

# Non-functional requirements

- **Scalability:** Use MongoDB Atlas. Index keys: `itemCode`, `orderDate`, `date` fields.
- **Performance:** 10k rows parse within 60s; aggregation queries return first page within 2s.
- **Security:** TLS, auth (JWT/session), role-based actions for override
- **Cost:** Do not persist raw files by default; store minimal metadata and aggregates.

---

# Data validation & column-mapping heuristics

- Header similarity: lowercase, remove non-alphanumerics, common synonyms map (`item code` → `itemCode`, `qty` → `quantity`).
- Date parsing: support `DD-MM-YYYY`, `YYYY-MM-DD`, and Excel serials.
- Number parsing: remove commas and currency symbols.
- If an `itemCode` is missing entirely or contains whitespace/linebreaks, flag row.
- If unit mismatch is detected (same `itemCode` with different units), flag for review.

---

# Error handling & audit

- Critical errors (missing `itemCode`, negative currentStock) halt the pipeline and present the error list.
- Non-critical warnings (unit mismatches, missing price) are shown but do not halt.
- Overrides and exclusions: store `{ itemCode, uploadId, action, reason, user, timestamp }` in `overrides` collection.

---
