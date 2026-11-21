# Bishop Technologies

This project includes the customer website and the admin dashboard for updating the business details, Store, and completed work.

## Start on Windows

1. Install [Node.js 22.13 or newer](https://nodejs.org/).
2. Extract all files from `Bishop-Technologies-PC.zip` into a folder on your PC.
3. Open the extracted folder and double-click `START-BISHOP.cmd`. Keep its window open while you use the site.
4. The browser opens the admin dashboard at <http://127.0.0.1:8787/admin>. The customer website is at <http://127.0.0.1:8787/>.

The PC ZIP includes the built website, so it can start offline after you install Node.js. To stop it, press **Ctrl+C** in the launcher window or close it.

## Update the website

For the online site, sign in to the [Bishop Technologies Site Editor](https://bishop-technologies.praiseworthydaffodil2.chatgpt.site/admin) with your owner account. Select **Save changes** to update what visitors see online. Choose **Download PC ZIP** next to **Site editor** to get the Windows project. The **Backups** section has a JSON export of your content. The JSON export records image links, so keep copies of your original photos.

Open the admin dashboard to add the WhatsApp number and shop details, list products, and add completed projects. Upload your own images where available. Save your changes and open the customer website to review them.

The local server listens on your PC. Changes made here are stored in `data/content.json` and any uploaded images are stored in `data/images/`. Copy the entire `data` folder to back them up. To restore, stop the website, copy the saved `data` folder into the project folder, and start the website again. Changes to the PC copy and the hosted copy are saved separately.

With the business WhatsApp number blank, visitors can copy their enquiry text. Add the real business number to let visitors open a prefilled WhatsApp message.

## PC eke run karana hati

1. Node.js 22.13 ho eta wada aluth version ekak install karanna.
2. ZIP file eka sampoornayen extract karala `START-BISHOP.cmd` double-click karanna.
3. Browser eke admin dashboard eka open wei. Eken WhatsApp number eka, shop details, products saha iwara karapu projects add karala save karanna puluwan.
4. Website eka use karana welawata launcher window eka wahanna epa. Data backup karaganna `data` folder eka copy karanna.

## Build from source

```sh
npm ci
npm run build
npm start
```

Use Node.js 22.13 or newer. `npm run dev` is the frontend development server. `npm start` serves the built site with the local content API and admin dashboard.
