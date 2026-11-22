# Architecture

Bishop Technologies uses React and Vite with route-specific HTML entry points for Home, Repairs, Store, Web & Software, and Staff. The public pages share navigation, contact details, and the same visual system. The main entry selects the Windows or hosted implementation at build time. The hosted Store and both editors load on demand.

| Boundary | Responsibilities |
| --- | --- |
| Public React app | Marketing pages, WhatsApp enquiry composition, contact and Maps links, product search, filters, and variant selection. |
| Windows launcher | Loopback-only HTTP server, local editor API, images and revisioned content in `data/`. It trusts users on the local machine. The server checks host and write origins and serializes content saves. |
| Hosted Vercel build | Static route assets and two read-only functions. The product page function supplies crawlable metadata and a fallback. The image function forwards publishable access and limits and validates the returned media. |
| Supabase | Auth, normalized products and variants, inventory, private media, audit events, and explicitly granted RPCs. The public catalog paginates results and projects publishable fields. |

Hosted staff sessions stay in memory. PostgreSQL checks the active membership and role on each privileged operation, plus AAL2 for accounts with a verified factor. Owners manage editor access and business details and read audit activity. Editors manage catalog and inventory. Product saves update the product, variants, stock, and image references transactionally and compare the product revision. Storage operations and PostgreSQL writes are separate. Uploaded files can need cleanup after interruption.

The local content API and hosted RPCs use separate storage and data contracts. A Windows backup does not synchronize with Supabase. Enquiry forms compose messages in the browser and hand them to WhatsApp. The application has no enquiry inbox.

The hosted staff catalog loads a complete snapshot. Public pagination, representative staff workload measurements, and separate projects for preview and production are important to how this design is operated. The current findings and remaining verification are in [the release audit](docs/release-audit.md).
