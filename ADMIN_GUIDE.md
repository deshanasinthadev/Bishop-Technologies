# Staff guide

Open `/admin` on the approved hosted domain. Sign in with the email invited by the owner. Use **Forgot password?** for recovery and enter the authenticator code when prompted. Sign out when finished. Refreshing or closing the tab ends the in-memory session.

| Task | Dashboard |
| --- | --- |
| Find drafts or low stock | From **Overview**, use **Draft Products** or **Low Stock** to open the matching list. |
| Maintain categories | In **Categories**, add, rename, or reorder categories. An inactive category hides its listings from the Store. |
| List a product | In **Products**, select **Add Product**, add a description and active variant, and choose an active category. Use **Save Draft** for review or **Publish Product** to make it visible. |
| Update price and stock | Edit the product's variants. Enter confirmed LKR prices, exact quantity, and the low-stock threshold. A blank price shows **Enquire for price**. Use **Inventory** to review stock. |
| Manage photos | Upload JPEG, PNG, or WebP files up to 2 MiB each. Add descriptive alt text and place the primary photo first. Save to apply the order and detach removed photos. |
| Remove a listing from the Store | Use **Unpublish** or **Archive**. |

Editors manage the catalog. Owners can also manage editor access, update business details, and review activity. In **Settings**, choose the device under **Work type** to create a repair gallery entry. Provide a general problem, a description of the work, and an HTTPS photo cleared for public use. A date is optional. Saving settings publishes the entry. Keep identifying details out of the photo and text. If another staff member saved first, reopen the product and reapply your changes to the latest revision. If the editor reports incomplete photo cleanup, the owner can check detached files in Supabase Storage after confirming they are unreferenced.

Windows editing and backups are covered in the [README](README.md). Hosted onboarding and Auth settings are in the [hosting guide](docs/hosting.md).
