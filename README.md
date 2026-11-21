# Bishop Technologies

Bishop Technologies offers device repairs, a technology store, and websites and software for businesses in Sri Lanka. This repository uses React, Vite, JavaScript, and CSS. The Windows launcher is a loopback PC editor. The Vercel build uses Supabase Auth, PostgreSQL, and Storage for the hosted catalog and staff dashboard.

## Run the Windows site

Install Node.js 22.13 or newer and open `START-BISHOP.cmd`. It uses an existing `dist/index.html`, or installs dependencies and builds if the build is missing. It opens the PC editor at <http://127.0.0.1:8787/admin>. The customer site is at <http://127.0.0.1:8787/>.

Build a fresh Windows copy with:

```powershell
npm ci
npm run build
npm start
```

The launcher stores edits in `data/content.json` and photos in `data/images/`. Stop the server before copying the `data` folder for a complete backup or restoring it. The PC copy and hosted Supabase records are independent. Existing PC data can be backed up through the legacy editor. Enter confirmed products and photos into the hosted catalog after reviewing that data.

If you already use the separately hosted [ChatGPT Site Editor](https://bishop-technologies.praiseworthydaffodil2.chatgpt.site/admin), use its own owner sign-in and Backups section for that copy. Export its content and keep the original photos before switching a public domain.

## Development

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite frontend development server for the PC version. |
| `npm run build` | Generate the PC build in `dist/`. |
| `npm start` | Serve the PC build and filesystem content API on loopback. |
| `npm run dev:hosted` | Develop against a non-production Supabase project. Use a Vercel Preview to test the image endpoint. |
| `npm run build:hosted` | Generate the hosted build. Use `-- --outDir dist-hosted` if retaining a separate PC build. |
| `npm test` | Run WhatsApp tests and the database fixture when its test runtime is configured. |

See the [hosting and staff guide](docs/hosting.md) for Supabase setup, local integration tests, owner onboarding, and Vercel deployment. The bundled categories illustrate types of products. The hosted Store only displays published database records with active categories. Both versions preserve the business’s Google Maps and WhatsApp links.

Repair and software enquiries are sent by the customer through WhatsApp. The current WhatsApp Business short link opens the conversation. When no confirmed phone number is configured for prefilling, customers can copy the enquiry text and paste it themselves.
