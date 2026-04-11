# Improvement Backlog (Critical Check)

Last updated: 2026-04-11

## High Priority

1. **Decouple buy flow from menu navigation entirely**
   - **Impact:** removes remaining confusion around optional PIN vs protected pages.
   - **Effort:** medium.
   - **Next step:** add a dedicated lightweight buy landing route that goes straight to fridge selection.

2. **Run restore drills for backups**
   - **Impact:** verifies backups are actually usable during incidents.
   - **Effort:** medium.
   - **Next step:** monthly restore test on staging/temporary DB and checklist signoff.

3. **Session and auth observability**
   - **Impact:** faster debugging for login/PIN issues.
   - **Effort:** low.
   - **Next step:** structured logs for auth failures with route + outcome + rate-limit hits.

## Medium Priority

1. **Manager/Admin workflow shortcuts**
   - **Impact:** fewer clicks for frequent operations.
   - **Effort:** medium.
   - **Next step:** add top-level quick actions (resident edit, fridge item update, billing run).

2. **Fridge item analytics**
   - **Impact:** better stocking and pricing decisions.
   - **Effort:** medium.
   - **Next step:** per-item consumption trends and simple CSV export.

3. **UI consistency pass**
   - **Impact:** cleaner professional feel across all pages.
   - **Effort:** medium.
   - **Next step:** apply shared spacing/typography/card patterns to manager and admin secondary pages.

## Low Priority

1. **Print-ready bulk QR sheet**
   - **Impact:** easier physical setup in houses.
   - **Effort:** low.
   - **Next step:** one page showing all fridge QR codes with labels.

2. **PWA installability**
   - **Impact:** faster mobile access from dorm devices.
   - **Effort:** medium.
   - **Next step:** add manifest/icons and basic offline fallback page.

3. **Optional alerting for failed backup sends**
   - **Impact:** quicker response when email delivery breaks.
   - **Effort:** low.
   - **Next step:** add alert email or webhook when backup script exits with error.
