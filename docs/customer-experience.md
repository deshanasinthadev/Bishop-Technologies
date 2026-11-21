# Customer experience audit

| Priority | Journey | Finding and implementation plan |
| --- | --- | --- |
| Launch | Home to Repair, Store or Digital Services | Repeated repair calls to action compete for attention. Lead with the three destinations and give undecided customers a simple finder. |
| Launch | Repair to WhatsApp | The single form combines device information, symptoms and contact details. Break the request into short steps with a review, preserve answers while navigating, and explain the WhatsApp handoff and optional attachments. |
| Launch | Store to product to WhatsApp | All filters have equal visual weight. Lead with search and category, disclose extra filters on demand, and show compatibility prompts using the customer's device model and confirmed product details. |
| Launch | Digital services to contact | Keep the existing quote form and label the next action in plain English. |
| Important | Reviews to contact | Keep verified Google listing links and explain repair assessment, pricing and warranty enquiries. In-page reviews require a verified listing and an approved integration. |
| Important | Owner to product update to Store | Existing drafts, inventory, and publish controls work. Add direct paths from Overview to drafts and low stock. Keep current RPC authorization and publication rules. |

## Changes

- The homepage presents Repair, Store, and Digital Services, followed by a finder that carries selected device symptoms into the repair request. `src/main.jsx`, `src/ServiceFinder.jsx`, and `src/customer-copy.js`.
- The repair request keeps progress in the current page, validates required input, and provides a review with a WhatsApp handoff. Photos can be attached directly in the chat. The quote form retains its existing WhatsApp flow. `src/RepairRequest.jsx`, `src/repair-request.js`, and `src/Enquiry.jsx`.
- The hosted Store highlights search and category, keeps optional filters and compatibility advice in disclosures, and carries variant context into WhatsApp. `src/HostedStore.jsx` and `src/catalog.css`.
- Repair process and FAQs use shared copy and native disclosure elements. The existing Google review links and attribution remain configuration-driven. An owner can publish consented repair photos with structured details. General completed work keeps its existing fields. `src/TrustSections.jsx`, `src/styles.css`, and `supabase/migrations/202611210003_repair_gallery.sql`.
- The staff Overview includes draft and low-stock shortcuts. The gallery save continues to require an owner. `src/HostedAdmin.jsx` and `tests/catalog-db.test.js`.

## Verification

- Nine Node tests passed with the isolated PostgreSQL fixture. The fixture verified the repair gallery projection, invalid record rejection, and existing staff authorization.
- Windows, hosted Preview, and hosted Production builds passed their route and indexing checks. The dependency audit returned zero known vulnerabilities. The repository has no separate lint or type-check script.
- Chromium passed six hosted routes at 360, 768 and 1440 pixels, plus the repair review at 390 pixels. The tests exercised the finder, focus and Back behavior, invalid phone feedback, WhatsApp handoff controls, digital quote form, FAQ keyboard interaction, variant compatibility, staff shortcuts, price changes, sign-out, and the Windows home and editor. Hosted API responses were mocked. An initial run timed out on the staff status locator and the corrected run passed.
- The browser confirmed the configured Maps and WhatsApp link targets. Live third-party redirects, message delivery, hosted Supabase Auth and Storage, screen-reader coverage, and Core Web Vitals remain unverified.

## Launch status

| Status | Scope |
| --- | --- |
| Implemented for preview verification | Customer navigation, WhatsApp handoff, Store filtering and enquiry, FAQs, gallery data entry, and staff shortcuts. |
| Must fix before launch | Verify a real Vercel Preview against the intended Supabase project. Confirm the catalog, Maps and WhatsApp destinations, address and hours, approved policy terms, and any published gallery entries and review links. Review and apply the gallery migration before using gallery fields. |
| Optional improvements | Complete Sinhala translations and language-specific browser testing. Add a repair inbox or scheduling only after agreeing on the operating process. Consider an approved embedded review integration if needed. |

Owner inputs include published products, prices, stock, compatibility specifications, repair photos cleared for publication, verified Google listing and review links, hours and address, public contact details, and approved warranty, returns and device-handling terms. The site uses English and keeps new journey copy together for translation. The site has no scheduler, repair inbox or embedded review feed.
