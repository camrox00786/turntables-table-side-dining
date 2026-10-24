# Turntables: Table-Side Dining

Build **Turntables**, a premium, playful, mobile-first restaurant SaaS web app for cafes, restaurants and breweries in Bangalore, India.

**Core concept:** Customers walk into a venue, sit at a table, scan that table's unique QR code using their phone camera, and open a web menu in their browser. No app download is required.

**Technology**

- React, TypeScript and Vite
- Tailwind CSS and shadcn/ui
- Framer Motion for animations
- Supabase and PostgreSQL for the backend
- Recharts for analytics

**Visual identity**
Create a dark, premium craft-brewery aesthetic with charcoal backgrounds, electric lime accents, warm white text, restrained orange highlights, expressive typography, food photography and polished animations. The experience should feel fun, modern and memorable.

**Customer experience**

- Every venue has its own branded menu.
- Every table has a unique QR URL, such as `/v/neon-taproom/t/12`.
- Scanning the QR opens the correct venue and table.
- Customers browse items, customize orders, add to cart and submit orders.
- Include WFH / Client Call Mode, Vibe Menu, Mystery Tap, simulated weather offers, SquadTab group ordering and digital loyalty stamps.
## SIGNATURE FEATURES — IMPLEMENT FUNCTIONAL DEMO FLOWS

Every feature below must have a real, clickable demo interaction. Do not create decorative buttons that do nothing. Use deterministic demo data where real integrations are not configured.

### 1. WFH / CLIENT CALL MODE — QUICK ORDERS

**Purpose:** Help customers who are working remotely, attending a video call or taking a short break order food and drinks quickly without browsing the entire menu.

**Customer experience:**
- Display a toggle at the top of the QR menu called "WFH / Client Call Mode."
- When enabled, filter the menu to show available items with short, configurable preparation times.
- Prioritize finger foods, low-mess snacks, coffee, cold brew and other suitable quick-service items.
- Display each item's estimated preparation time.
- Add a quick-order section with options such as "Coffee in 5 min" and "Quick Bites."
- Let customers add items to the cart without navigating through multiple screens.

**Restaurant owner controls:**
- Mark items as suitable for quick ordering.
- Configure their preparation-time estimates.
- Choose which categories appear in quick mode.

**Demo behavior:** Toggling the mode immediately changes the menu. Use sample preparation times and label them as estimates. Never guarantee that food will arrive within seven minutes unless the restaurant can substantiate that promise.

### 2. SQUADTAB — GROUP ORDERING AND BILL SPLITTING

**Purpose:** Allow friends sitting at the same table to order individually while sharing one table session.

**Customer experience:**
- Every table has a unique QR code. For example, Table 12 opens its own menu.
- A customer can create a shared session and invite friends using a shareable link or session code.
- Each participant chooses a display name and adds items to their own cart within the shared table session.
- Display the combined order and each participant's subtotal.
- Allow the group to calculate an equal split, split by individual items or enter custom amounts.
- Show a clear breakdown of item totals, taxes, discounts and the outstanding balance.
- Provide a "Request payment" action and a WhatsApp-sharing option for a prepared payment request.

**Restaurant owner controls:**
- View the shared table order.
- See the items and subtotals associated with each participant.
- Track order and payment status.

**Demo behavior:** Use simulated participants and sample orders. Make split calculations functional. A WhatsApp share action may open a prepared message or share intent if supported, but must not claim that a message was delivered or payment completed.

**Future integration:** Real group synchronization, payment links and payment confirmation must be implemented and verified separately. Never treat a generated payment link as proof of payment.

### 3. MONSOON MODE — WEATHER-TRIGGERED OFFERS

**Purpose:** Let restaurants promote relevant menu items when local weather changes.

**Customer experience:**
- Display an offer card when the configured weather condition matches a promotion.
- For example: "Rainy outside? Warm up with filter coffee. Enjoy 10% off for the next 30 minutes."
- Show the eligible items, discount, expiry time and terms.
- Let the customer add an eligible item to their cart directly from the offer.
- Avoid showing the same expired or ineligible offer repeatedly.

**Restaurant owner controls:**
- Configure weather conditions, such as rain or high temperatures.
- Choose eligible menu items.
- Set the discount, maximum redemptions and offer duration.
- Enable or disable the campaign.

**Demo behavior:** Include a weather simulator with selectable conditions such as Sunny, Rainy and Hot. Selecting a condition should immediately update the eligible offer. Clearly label simulated weather.

**Future integration:** A weather API must provide actual conditions before real weather-triggered campaigns can run. Validate offer eligibility and expiry on the backend.

### 4. MYSTERY TAP — SURPRISE FOOD AND DRINK DISCOVERY

**Purpose:** Help undecided customers discover new items while allowing restaurants to promote selected dishes and drinks.

**Customer experience:**
- Display a prominent "Mystery Tap" or "Blind Date" button.
- Clicking it starts a playful animated spinning wheel.
- The wheel selects an item from the restaurant's configured eligible items.
- Show the item's photo, description, price and a short explanation of why it was selected.
- Offer "Add to Cart" and "Try Again" actions.
- If the customer orders the qualifying item, apply the configured reward, such as a free side of fries.

**Restaurant owner controls:**
- Choose which items appear on the wheel.
- Prioritize new launches or under-ordered items.
- Configure rewards, eligibility rules and redemption limits.
- Exclude unavailable items.

**Demo behavior:** Use a deterministic sample item list and a functional animated wheel. Selecting an item must update the recommendation. Adding the item to the cart should preserve its identity and calculate any eligible reward correctly.

**Important:** Do not claim the wheel uses AI or actual historical sales unless those capabilities have been implemented. Do not award duplicate rewards for the same qualifying order.

### 5. FREQUENT SIPPER — DIGITAL LOYALTY STAMPS

**Purpose:** Encourage repeat visits through a digital loyalty card that customers can access without installing an app.

**Customer experience:**
- Let customers opt into a loyalty account using a verified phone number or supported account.
- Display a progress card, such as "3 of 5 stamps collected."
- Award stamps only after a qualifying completed purchase.
- When the customer reaches the configured threshold, unlock a reward such as a free cold brew.
- Display available rewards, expiry terms and redemption status.

**Restaurant owner controls:**
- Configure the number of qualifying purchases needed for a reward.
- Select the reward and eligible products.
- Set expiry and redemption rules.
- View stamp issuance, redemptions and returning-customer activity.

**Demo behavior:** Provide a clearly labelled demo customer whose stamps can be advanced through simulated qualifying purchases. Demonstrate the reward unlocking and redemption flow.

**Future integration:** Persist loyalty records securely in the backend, prevent duplicate stamps and require appropriate consent for marketing messages. WhatsApp notifications must use a configured provider and follow applicable opt-in and messaging requirements.

### SHARED REQUIREMENTS FOR ALL FEATURES

- All features must use the same restaurant menu, table, cart and order models.
- The owner must be able to configure eligible items and relevant offer rules.
- Respect item availability, pricing and promotion expiry.
- Keep demo and real integration modes separate.
- Make all buttons, toggles, animations and calculations functional.
- Include loading, empty, success and error states.
- Never fake payment confirmation, external message delivery or real weather data.
- Design the architecture so the demo adapters can later be replaced by secure backend implementations without rewriting the entire UI.

- Clearly display prices, item availability and order status.

**Restaurant owner dashboard**

- Manage venues, tables and QR codes.
- Edit menu items, prices, modifiers and availability.
- View and manage orders by table.
- Configure promotions, rewards and loyalty.
- View sales, average order value, popular items and repeat-customer metrics.
- Provide a convincing demo with realistic sample data.

**Multi-tenant design**
The architecture must support multiple restaurants, each with isolated menus, tables, orders, staff and analytics. Plan for backend authorization and PostgreSQL row-level security.

**Demo rules**
Start with realistic demo data and functional simulated interactions. Clearly label simulated payments, WhatsApp messages, weather data and kitchen notifications. Never claim an external integration succeeded unless it has actually been implemented and verified.

First build the complete responsive UI, navigation, table-specific QR flow, menu, cart, simulated ordering experience and owner dashboard. Then verify the main customer journey before adding further integrations.
Audit every signature feature in Turntables. Click through WFH / Client Call Mode, SquadTab, Monsoon Mode, Mystery Tap and Frequent Sipper as a real customer would.

For each feature, verify:

The main action produces a visible, meaningful change.

The result affects the correct menu, cart, order or reward state.

Prices and discounts are calculated correctly.

Unavailable items and expired promotions are handled.

The restaurant owner can configure the relevant settings.

Demo integrations are explicitly labelled as simulated.

No payment, WhatsApp message or weather API call is falsely reported as successful.

Fix broken interactions and calculation errors. Summarize what you actually tested, what passed, what failed and what still requires a real integration. Do not report a test as passed unless you ran it.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4c0c4959-aa13-4140-b058-10f72d32ef7a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
