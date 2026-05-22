# Frontend Refactoring Plan

6 focused phases, ordered by risk. Each phase is independently deployable. No behaviour changes, no new dependencies.

---

## Phase 1 — Delete Dead Code (Zero Risk)

Five files never imported by anything.

| File | Action | Reason |
|------|--------|--------|
| `features/members/MemberDetailPage_old.tsx` | Delete | Replaced by current MemberDetailPage |
| `features/members/components/MemberForm_old.tsx` | Delete | Replaced by MemberForm/ folder structure |
| `api/billing.api.ts` | Delete | All callers migrated to Orval-generated hooks |
| `api/trainer.api.ts` | Delete | All callers migrated to Orval-generated hooks |
| `features/billing/components/MetricCard.tsx` | Delete | Defined but never imported anywhere |

---

## Phase 2 — Consolidate Duplicate Utilities (Zero Risk)

### `fmt` date helper
Duplicated in `DashboardPage.tsx` and `ReportsPage.tsx` as:
```ts
const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
```
**Fix:** Export `formatApiDate` from `utils/format.ts`, update both imports.

### `CHART_COLORS` array
Independently defined in `ReportsPage.tsx` and `ExpenseAnalyticsPage.tsx`.
**Fix:** Create `lib/constants.ts`, export a single `CHART_COLORS` array.

### `pkr` / `pkrFull` compact currency formatters
Only in `ReportsPage.tsx` but generally useful.
**Fix:** Export as `formatCurrencyCompact` from `utils/format.ts`.

### Note on billing `StatusBadge`
`features/billing/components/StatusBadge.tsx` is a different visual variant (icons + colored backgrounds) from the shared `StatusBadge`. It is used by 5 billing-internal components. Keep it in the billing feature but add a barrel `index.ts` so imports are consistent.

---

## Phase 3 — Fix Naming Inconsistency (Low Risk)

### Hook file naming — standardise to `use-kebab-case.ts`
```
billing/hooks/useInvoicePayments.ts     → use-invoice-payments.ts
member-portal/hooks/useMemberPortal.ts  → use-member-portal.ts
trainer-portal/hooks/useTrainerPortal.ts → use-trainer-portal.ts
```
Update imports in each consuming component after renaming.

### Extract `RootRedirect` from router
Move the `RootRedirect` component from `router.tsx` (inline) to `features/auth/RootRedirect.tsx` and import it. The router file should only contain route configuration.

---

## Phase 4 — Split Oversized Page Files (Medium Effort)

### `trainers/TrainerDetailPage.tsx` — 1,252 lines
Create `features/trainers/components/TrainerDetail/`:
- `ProfileTab.tsx` — trainer info, branches, availability cards
- `AssignmentsTab.tsx` — assignments table + end confirm dialog
- `AssignMemberDialog.tsx` — extracted from AssignmentsTab
- `NotesTab.tsx` — notes list + pagination
- `NoteCard.tsx` — single note display
- `TrainingNoteDialog.tsx` — log note form dialog

Zod schemas and `Stars` component move with their respective dialog files. Page file drops to ~80 lines.

### `reports/ReportsPage.tsx` — 965 lines
Create `features/reports/components/`:
- `DashboardTab.tsx`
- `RevenueTab.tsx`
- `MembersTab.tsx`
- `AttendanceTab.tsx`
- `TrainersTab.tsx`
- `ReportsShared.tsx` — `DateRangeSelector`, `ChartCard`, `GrowthBadge`, `ChartSkeleton`

### `billing/InvoiceDetailPage.tsx` — 935 lines
Create `features/billing/components/InvoiceDetail/`:
- `InvoiceHeader.tsx`
- `InvoiceLineItems.tsx`
- `InvoiceActionsPanel.tsx`

The existing `InvoicePaymentTimeline.tsx` already lives in components — use that as the reference pattern.

### `billing/BillingDashboard.tsx` — 808 lines
- Move the due-payments table into `components/DuePaymentsTable.tsx`
- Move local types (`DueRow`, `PopulatedMember`, `PopulatedBranch`) to `types/billing.types.ts`

---

## Phase 5 — Extract Custom Hooks (Medium Effort)

Only extract hooks when there are 2+ `useState` calls or meaningful derived state. Don't extract trivial cases.

| Hook to create | Extracts from |
|----------------|--------------|
| `trainers/hooks/use-trainer-detail.ts` | Trainer data fetching, status variants, edit dialog state |
| `billing/hooks/use-billing-dashboard.ts` | Sort/filter state, branch filter, search, `useMemo` derivations |
| `reports/hooks/use-reports.ts` | Active tab, date preset, computed dateFrom/dateTo, granularity |
| `dashboard/hooks/use-dashboard.ts` | Year/month/branch filters, date range computation |

---

## Phase 6 — Type Hygiene (Low Risk)

### `types/trainer.types.ts` — expand
- `TrainerDetailPage.tsx`: `AssignFormValues`, `NoteFormValues` (inline) → move here
- `TrainerNotesPage.tsx`: `NoteAuthor`, `NoteMember`, `TrainingNote` (redefined locally) → merge with existing types

### `types/billing.types.ts` — expand
- `BillingDashboard.tsx`: `DueRow`, `PopulatedMember`, `PopulatedBranch` → move here

### Rule of thumb
Types derived from Zod schemas (e.g. `type LoginForm = z.infer<typeof loginSchema>`) are fine co-located with their schema. Only move types that describe backend data shapes or are shared across multiple components.

---

## Suggested Execution Order

Do phases 1–3 in one session (all low/zero risk). Then tackle phases 4–6 feature by feature:

1. Start with **TrainerDetail** — biggest file, clearest tab boundaries, good reference pattern
2. Complete all 3 phases (split → hook → types) for that feature before moving on
3. Repeat for **ReportsPage**, then **BillingDashboard / InvoiceDetailPage**

This keeps the codebase in a working state at every commit.
