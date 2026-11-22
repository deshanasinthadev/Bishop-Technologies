# Production readiness audit

The initial Git worktree was clean. The baseline Node suite passed three tests and skipped the PostgreSQL fixture because its optional runtime was absent. This review covers the checked-in Windows and hosted implementations. The production service state requires verification in an approved preview.

| Severity | Verified finding | Priority |
| --- | --- | --- |
| High | The admin access request can complete after a session change and put stale staff data back into component state. | Bind dashboard data and pending authorization to the current user. |
| High | The hosted image proxy buffers the entire upstream body before enforcing its 2 MiB limit. | Limit bytes as the response is read and share media validation with the local API. |
| Medium | The public catalog depends on unbounded fetches and treats absent hosted configuration like a transient catalog outage. | Validate configuration and display actionable retry states. |
| Medium | Active stock and the lowest price can come from different variants on a product card. | Label stock as variant-dependent and retain selected-variant detail. |
| Medium | Product photo attachment, removal, and order changes had no dedicated audit record. | Add a product photo audit trigger in a forward migration. |
| Medium | The full staff catalog is loaded in one RPC while the public listing uses 24-item pages. | Measure with a representative catalog before introducing staff pagination. |
| Medium | The local Vite development and preview scripts bind to all network interfaces by default. | Use loopback defaults suited to local development. |
| Low | The static SEO build and product endpoint implement separate HTML escaping. | Share escaping and canonical-origin validation. |
| Low | Hosted route assets and preview indexing had no automated release gate. | Check both builds and generated metadata in CI. |
| Low | `fflate` and the direct `esbuild` dependency had no direct callers. | Remove the declarations and retain Vite's own esbuild dependency. |

No critical defect was confirmed in the reviewed source. The isolated fixture and an approved preview exercise different boundaries. The fixture checks database roles, public projections, product revisions, and Storage policies. Preview checks must also cover live Auth email and MFA, Storage delivery, direct product URLs, and deployment headers. A production launch also requires approved catalog and contact information.

## Implementation and verification

| Phase | Change and verification | Remaining release work |
| --- | --- | --- |
| Stabilization | Bound hosted image reads, constrained catalog errors, and scoped staff results to the active session in `api/`, `server/media.js`, and `src/HostedAdmin.jsx`. Endpoint tests passed. | Verify sign-in and live image delivery in Preview. |
| Architecture | Shared hosted configuration, image validation, and SEO helpers across the existing build and server boundaries. Both build modes passed. | Measure staff snapshot size with representative inventory before choosing pagination. |
| Functionality | Added a catalog setup fallback, variant availability labels, and product photo audit events. Tests passed using the isolated database fixture. | Verify approved products, descriptions, prices, availability, and photo permissions. Review the migration before remote application. |
| Design and accessibility | Kept the existing visual identity, added page failure feedback, and refined disabled and reduced-motion interaction styles. Chromium checks passed at 360, 768, and 1440 pixels with no horizontal overflow on the six tested hosted routes. | Complete keyboard, assistive technology, and contrast checks on the deployed preview. |
| Testing and tooling | Six Node tests passed with the isolated PostgreSQL fixture. Chromium checks passed for navigation, Store search, variant selection, repair validation, fixture owner sign-in, price update, sign-out, and the Windows homepage and editor. The dependency audit reported zero known vulnerabilities. | Run the new GitHub workflow remotely and expand browser checks to live MFA, image uploads, and editor accounts. |
| Optimization and SEO | Separated editor bundles by build mode and checked generated route assets, canonical metadata, sitemap, and indexing rules for both hosted environments. | Measure Core Web Vitals and check product URL behavior through Vercel. |
| Deployment preparation | Added architecture, staff and deployment guides and the GitHub verification workflow. | Verify the approved Vercel and Supabase environment and obtain release approval. |

**Release status** · **NOT YET PRODUCTION-READY**. Local fixtures do not establish the state of the production catalog, Supabase Auth and Storage, or Vercel routing and headers.
