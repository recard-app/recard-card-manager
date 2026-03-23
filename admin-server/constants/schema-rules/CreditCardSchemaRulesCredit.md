# Credit Card Schema Rules: Credits

This document defines the schema rules, field requirements, types, formatting guidelines, and examples for the **Credit** type (statement credits and monetary benefits).

---

## Schema Overview

A Credit represents a statement credit, reimbursement, or dollar-value benefit associated with a credit card. Credits have specific monetary values and reset on defined time periods.

### What Qualifies as a Credit?
- Statement credits with a specific dollar value
- Reimbursements for specific purchases
- Dollar-value benefits that appear on your statement
- **Redeemable benefits**: passes, vouchers, or free access that the cardholder must actively claim or use (e.g., "10 Priority Pass visits per year", "1 companion pass per card year", "1 free hotel night annually")
- Benefits where something is **completely free** and the cardholder redeems/uses it on a recurring basis

### Redeemable vs Auto-Applied (CRITICAL)
The key test for whether a recurring benefit is a Credit or a Perk is: **Does the cardholder need to redeem, claim, or actively use it?**

- **Credits** = Benefits that must be **redeemed or claimed**. The cardholder takes an action to use the benefit each time (e.g., using a lounge pass, booking a free night, spending a statement credit).
- **Perks** = Benefits that are **auto-applied or passively received**. The cardholder gets the benefit without needing to redeem anything (e.g., status upgrades, recurring discounts, automatic membership access).

**Examples:**

| Benefit | Classification | Why |
|---------|---------------|-----|
| 10 Priority Pass lounge visits/year | **Credit** (isNonMonetary: true) | Must redeem each visit |
| 1 companion pass per card year | **Credit** (isNonMonetary: true) | Must redeem the pass |
| 1 free hotel night certificate annually | **Credit** (isNonMonetary: true) | Must book/redeem the night |
| $300 annual travel credit | **Credit** | Must make purchases to use it |
| $10/month Uber Cash | **Credit** | Must spend the Uber Cash |
| Hilton Gold status | **Perk** | Auto-applied to your account |
| Recurring discount on Target membership | **Perk** | Discount applied automatically |
| Marriott Silver Elite status | **Perk** | Auto-applied to your account |
| Complimentary DoorDash DashPass access | **Perk** | Membership auto-activated |
| $5/month discount on a streaming service | **Perk** | Discount applied automatically |
| 10,000 bonus points every card anniversary | **Perk** | Points auto-deposited, no action needed |
| 5,000 miles annually for holding the card | **Perk** | Auto-deposited, cardholder does nothing |
| 1,500 PQP each year | **Perk** | Qualifying points auto-awarded, not redeemed |
| Earn 1 PQP per $15 spent | **Perk** | Spending-based earning rate, not a redeemable credit |
| Use Bilt Cash toward hotel bookings | **Perk** | Requires spending earned points/cash, not a free credit |
| Redeem Bilt Cash toward fitness class | **Perk** | Requires spending earned points/cash, not a free credit |
| Cover guest fees by redeeming $35 Bilt Cash | **Perk** | Requires spending earned points/cash, not a free credit |

**Discounts are always Perks, NOT Credits** -- even if they are recurring. A discount reduces the price of something; it is not a redeemable benefit with a trackable value the cardholder claims.

**Benefits that require redeeming special points/cash are always Perks, NOT Credits** -- if using the benefit requires the cardholder to spend proprietary points, cash, or rewards currency (e.g., "requires redeeming Bilt Cash", "redeem points toward...", "use points as a credit toward..."), it is a Perk. A credit should be something the cardholder receives for free or as a statement credit -- not something they pay for with their own earned points/cash. Examples:
- "Use Bilt Cash as a credit toward hotel bookings" → **Perk** (requires spending Bilt Cash)
- "Redeem Bilt Cash toward a fitness class" → **Perk** (requires spending Bilt Cash)
- "Cover guest pass fees by redeeming $35 of Bilt Cash per person" → **Perk** (requires spending Bilt Cash)
- "Redeem points for statement credit toward travel" → **Perk** (requires spending points)
- "$300 annual travel credit" → **Credit** (free statement credit, no points spent)

**Statuses are always Perks, NOT Credits** -- even if they recur annually. A hotel or airline status upgrade is auto-applied to the cardholder's account; they do not "redeem" it.

**Auto-awarded points, miles, qualifying points, or rewards are always Perks, NOT Credits** -- even if they recur annually and have a specific numeric value. If points are automatically deposited/awarded to the cardholder's account without any action required, this is a Perk. This includes:
- Bonus points/miles deposited on card anniversary (e.g., "10,000 bonus miles each year")
- Premier qualifying points/miles awarded automatically (e.g., "1,500 PQP each year", "500 PQF each year")
- Status-qualifying metrics (PQP, PQF, EQM, EQS, MQM, MQS, etc.)
- Points earned per dollar spent (e.g., "earn 1 PQP per $15 spent") -- this is a spending-based earning rate, NOT a redeemable credit
- Any points/miles the cardholder receives just for holding the card or spending on it

These are NOT "countable non-monetary benefits" even though they have numbers. The key distinction: a lounge visit pass must be actively redeemed (credit), but PQP/bonus points just appear in your account (perk).

### What Does NOT Qualify as a Credit?
- Multipliers/rewards rates (e.g., "3X on dining") → use Multiplier
- Non-monetary perks without a trackable recurring count (e.g., "lounge access" without a visit limit) -> use Perk. Note: countable non-monetary benefits (e.g., "10 Priority Pass visits per year") ARE credits with `isNonMonetary: true`
- Benefits with a cadence longer than annually (e.g., every 2 years, every 4 years) → use Perk
- **Auto-applied discounts** (e.g., recurring discount on a subscription or membership) → use Perk
- **Status upgrades** (e.g., Hilton Gold, Marriott Silver Elite) → use Perk, even if they renew annually
- **Auto-activated memberships or access** where the cardholder does not redeem a specific credit or pass → use Perk
- **Auto-awarded points, miles, or qualifying points** (e.g., "10,000 bonus points on card anniversary", "1,500 PQP each year", "earn 1 PQP per $15 spent") → use Perk. These are passively received, not redeemed. Includes all status-qualifying metrics (PQP, PQF, EQM, EQS, MQM, MQS, etc.).
- **Benefits requiring redemption of points/cash** (e.g., "redeem Bilt Cash toward hotel bookings", "use points as credit toward travel", "requires redeeming $35 of Bilt Cash") → use Perk. If the cardholder must spend their own earned points or proprietary cash to access the benefit, it is NOT a free credit.

### Separation Rule (CRITICAL)
Credits and perks must be kept **separate**. If a benefit clearly meets the criteria for a credit (redeemable, has a dollar value or trackable count, recurring cadence of 1 year or less), it belongs in credits ONLY -- do not also place it in perks. If you are **unsure** whether something is a credit or a perk, include it in **both** credits and perks rather than risk missing it entirely.

### Multi-Card Pages (CRITICAL)
Source text may list benefits for **multiple cards** on the same page. Only extract benefits that apply to the **specific card being entered**. If a benefit says something like "Platinum Card only", "exclusive to Gold Card", "available on Reserve card", or similar language restricting it to a different card, **skip it entirely**. When in doubt about which card a benefit belongs to, skip it rather than assign it to the wrong card.

### Cadence Rule (CRITICAL)
Credits MUST have a recurring cadence of one year or less:
- `monthly` - resets every month
- `quarterly` - resets every 3 months
- `semiannually` - resets every 6 months
- `annually` - resets once per year

**If a benefit has a cadence longer than annually (e.g., every 4 years for Global Entry/TSA PreCheck), it is a PERK, not a Credit.**

Example: "$120 Global Entry or TSA PreCheck Credit" that resets every 4 years should be classified as a **Perk** with Category="travel", SubCategory="tsa", NOT as a Credit.

### Master Template Reference

See: `Data/CreditCards/DATAENTRYSampleJsonStructureCredit.json`

---

## Field Reference

### id

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | UUID |
| **Description** | Unique identifier for this credit. |

**Rules:**
- Use UUID format (auto-generated)
- Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Example:**
```
44ff81c1-2c93-43e6-bb96-2b3ba7f521a3
```

---

### ReferenceCardId

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | kebab-case |
| **Description** | The ID of the card this credit belongs to. |

**Rules:**
- Must match the `ReferenceCardId` of the parent card
- Links this credit to its parent card

**Examples:**
- `chase-sapphire-reserve`
- `american-express-platinum`
- `american-express-gold`

---

### Title

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Description** | A short, descriptive name for the credit. |

**Rules:**
- Keep it concise but descriptive
- Include the credit amount if it helps identify it
- Use Title Case
- Only use the dollar amount in the title for Annually, Semiannually, or Quarterly credits. Do not put the dollar amount for Monthly credits.  

**Good Examples:**
- `$300 Annual Travel Credit`
- `Uber Credit`
- `Dining Credit`
- `Statement Credit for Lyft`
- `Saks Fifth Avenue`
- `Digital Entertainment Credit`
- `Walmart+ Credit`

**Bad Examples:**
- `credit` (too vague)
- `TRAVEL CREDIT` (all caps)
- `$300 annual travel credit for purchases made through Chase Travel portal` (too long)

---

### Category

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Description** | The primary category this credit falls under. |

**Allowed Values:**

| Category | Description | Common Credit Examples |
|----------|-------------|----------------------|
| `travel` | Travel-related credits | Travel credits, airline fee credits, hotel credits |
| `dining` | Food and restaurant credits | Dining credits, DoorDash, restaurant credits |
| `shopping` | Retail and merchandise | Saks credit, Walmart+ credit |
| `entertainment` | Entertainment services | Streaming credits, entertainment credits |
| `transportation` | Ground transportation | Uber credits, Lyft credits |
| `general` | General/catch-all | StubHub credits, miscellaneous |
| `gas` | Fuel-related | Gas station credits |
| `insurance` | Insurance-related | (rare for credits) |
| `rent` | Rent payments | Rent credits |

---

### SubCategory

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | No (optional) |
| **Description** | A more specific classification within the category. |

**Subcategories by Category:**

| Category | Available Subcategories |
|----------|------------------------|
| travel | `flights`, `hotels`, `portal`, `lounge access`, `ground transportation`, `car rental`, `tsa` |
| shopping | `supermarkets`, `online shopping`, `online grocery`, `drugstores`, `retail`, `department stores` |
| gas | `gas stations`, `ev charging` |
| entertainment | `streaming` |
| transportation | `rideshare` |
| insurance | `purchase`, `travel`, `car rental`, `cell phone protection`, `rental car protection` |
| dining | (none - leave empty) |
| general | (none - leave empty) |

**Rules:**
- Leave as empty string `""` if no subcategory applies
- Must be from the allowed list for the chosen category

**Examples:**
| Category | SubCategory | Credit Example |
|----------|-------------|----------------|
| travel | `portal` | Chase Travel $300 credit |
| travel | `hotels` | Hotel credit |
| travel | `flights` | Airline fee credit |
| transportation | `rideshare` | Uber/Lyft credits |
| entertainment | `streaming` | Streaming credit |
| shopping | `online shopping` | Walmart+ credit |
| dining | `""` | Dining credit (no subcategory) |

---

### Description

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | No (optional, but recommended) |
| **Description** | A detailed explanation of what the credit covers. |

**Rules:**
- Explain what purchases qualify
- Mention any special conditions
- Keep it informative but concise

**Good Examples:**
- `Automatically applied as a statement credit for travel purchases.`
- `Get $10 in Uber Cash each month to use on orders and rides in the U.S. when an Amex Card is selected for the transaction.`
- `Up to $200 annual credit for incidentals like baggage fees or in-flight purchases.`
- `Get up to $12.95 statement credit back each month after you pay for a monthly Walmart+ membership`

---

### Value

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | Numeric string (no $ sign) |
| **Description** | The dollar amount of the credit PER TIME PERIOD. |

**CRITICAL RULES:**
- **Enter the value PER TIME PERIOD, not the total annual value**
- Use a numeric string without the dollar sign
- Can include decimals (e.g., `12.95`)

**Calculation Examples:**

| Annual Total | Time Period | Value Field |
|--------------|-------------|-------------|
| $120/year, paid monthly | Monthly | `10` |
| $300/year, annual credit | Annually | `300` |
| $100/year, $50 every 6 months | Semiannually | `50` |
| $80/year, $20 per quarter | Quarterly | `20` |
| $15/month | Monthly | `15` |
| $12.95/month | Monthly | `12.95` |

**Good Examples:**
- `300` (for a $300 annual credit, annually)
- `10` (for a $120/year credit paid monthly)
- `50` (for a $100/year credit paid semiannually)
- `12.95` (for $12.95/month)

**Bad Examples:**
- `$300` (includes dollar sign)
- `120` (for a monthly credit of $10 - used annual total instead)
- `three hundred` (not numeric)

---

### TimePeriod

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Description** | How often the credit resets/renews. |

**Allowed Values (Enum):**

| Value | Description | Example |
|-------|-------------|---------|
| `monthly` | Resets every month | $15 Uber credit/month |
| `quarterly` | Resets every 3 months | $20 entertainment credit/quarter |
| `semiannually` | Resets every 6 months | $50 Saks credit twice/year |
| `annually` | Resets once per year | $300 travel credit/year |

**Rules:**
- Use exact spelling as shown (all lowercase)
- Choose the period that matches how the credit resets

---

### isAnniversaryBased

| Property | Value |
|----------|-------|
| **Type** | `boolean` |
| **Required** | No (optional, defaults to false) |
| **Description** | Indicates whether the credit resets on the card anniversary date vs calendar boundaries. |

**When to Use `true`:**
- Credit resets on the cardholder's card open date anniversary
- Common examples:
  - Priority Pass lounge visits (e.g., "10 visits per card year")
  - Companion certificates (e.g., "issued each anniversary")
  - Annual travel credits tied to membership year
  - Credits with language like "per card year" or "membership year"

**When to Use `false` (default):**
- Credit resets on calendar boundaries (monthly, quarterly, annually on Jan 1)
- Common examples:
  - Monthly statement credits
  - Quarterly bonus categories
  - Calendar year travel credits
  - Credits with language like "per calendar year" or "each month"

**Detection Tips:**

| Language Pattern | isAnniversaryBased |
|-----------------|-------------------|
| "per card year" | `true` |
| "per membership year" | `true` |
| "upon renewal" | `true` |
| "each anniversary" | `true` |
| "per calendar year" | `false` |
| "monthly" / "each month" | `false` |
| "quarterly" | `false` |
| "annually" (ambiguous) | Check context |

**Examples:**
```json
// Anniversary-based credit (resets on card anniversary)
{
  "Title": "Priority Pass Visits",
  "TimePeriod": "annually",
  "isAnniversaryBased": true
}

// Calendar-based credit (resets on Jan 1)
{
  "Title": "$300 Annual Travel Credit",
  "TimePeriod": "annually",
  "isAnniversaryBased": false
}
```

**Note:** When `isAnniversaryBased` is `true`, the `TimePeriod` must always be `"annually"` since anniversary credits are always annual (one year from card open date to the next).

---

### isNonMonetary

| Property | Value |
|----------|-------|
| **Type** | `boolean` |
| **Required** | No (optional, defaults to false) |
| **Description** | Indicates whether the credit value is a count/quantity rather than a dollar amount. |

**When to Use `true`:**
- The benefit is measured in uses, visits, passes, nights, subscriptions, or other non-dollar units
- The value represents a COUNT of something, not a dollar amount
- **The benefit RECURS** on a regular cadence (monthly, quarterly, semiannually, annually, or per card year)
- Common examples:
  - Priority Pass lounge visits (e.g., "10 complimentary visits per year")
  - Companion certificates/passes that renew (e.g., "1 companion pass per card year")
  - Free hotel night certificates that renew annually (e.g., "1 free night each card year")
  - Lounge access visits with a cap (e.g., "4 visits per quarter")
  - Recurring complimentary subscriptions (e.g., "DoorDash DashPass included each year you hold the card")
  - Guest passes that renew (e.g., "2 guest passes per year")

**When to Use `false` (default):**
- The benefit is a dollar amount, statement credit, or cash value
- Common examples:
  - "$300 annual travel credit"
  - "$10/month Uber Cash"
  - "$12.95/month Walmart+ credit" (dollar credit toward subscription cost)

**When to classify as a PERK instead (not a credit at all):**
- The benefit is **one-time only** and does NOT renew/recur (e.g., "complimentary DoorDash DashPass for 1 year" as a sign-up bonus)
- The benefit recurs less frequently than annually (e.g., "Global Entry credit every 4 years")
- The benefit has no trackable count or value (e.g., "lounge access" without a visit limit)
- **Key test:** Ask "does this benefit reset/renew on a regular cadence?" If NO, it is a PERK.

**Key Distinction:** A subscription credit that gives a DOLLAR AMOUNT toward a subscription cost (e.g., "$12.95 monthly statement credit for Walmart+") is monetary (`isNonMonetary: false`). A subscription that is COMPLIMENTARY / included free AND renews each year (e.g., "complimentary DoorDash DashPass membership, renews annually") is non-monetary (`isNonMonetary: true`, Value: 1). A subscription given ONCE that does NOT renew (e.g., "1 year of DoorDash DashPass as a sign-up bonus") is a **PERK**, not a credit.

**Behavior When `true`:**
- Excluded from all dollar-value statistics (usedValue, possibleValue, unusedValue)
- Included in expiring credit counts (but not expiring dollar values)
- Displayed without `$` prefix in the UI
- Must RECUR with a cadence of 1 year or shorter (monthly, quarterly, semiannually, annually)

**Examples:**
```json
// Non-monetary credit (lounge visits)
{
  "Title": "Priority Pass Visits",
  "Value": 10,
  "TimePeriod": "annually",
  "isAnniversaryBased": true,
  "isNonMonetary": true
}

// Non-monetary credit (companion pass)
{
  "Title": "Companion Pass",
  "Value": 1,
  "TimePeriod": "annually",
  "isAnniversaryBased": true,
  "isNonMonetary": true
}

// Monetary credit (dollar statement credit)
{
  "Title": "$300 Annual Travel Credit",
  "Value": 300,
  "TimePeriod": "annually",
  "isNonMonetary": false
}
```

**Note:** When `isNonMonetary` is `true`, the `Value` field represents a count (e.g., 10 visits, 1 pass) rather than a dollar amount. This field is immutable after creation -- delete and recreate the credit to change it.

---

### Requirements

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | No (optional) |
| **Description** | Any special requirements or restrictions to use this credit. |

**Rules:**
- Use UPPERCASE for emphasis on critical requirements
- Be specific about where/how to use the credit
- Leave empty if no special requirements

**Common Patterns:**
- `MUST BE BOOKED ON CHASE TRAVEL PORTAL`
- `MUST BE BOOKED ON AmexTravel.com`
- `MUST BE USED ON UBER.COM`
- `MUST BE USED AT COSTCO`
- `MUST BE USED ON RESY.COM`
- `Must be booked through the Edit`

**Good Examples:**
- `MUST BE BOOKED ON CHASE TRAVEL PORTAL`
- `Must be used on Saks.com`
- `Enrollment required with selected airline each year.`
- `""` (empty if no requirements)

---

### Details

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | No (optional) |
| **Description** | Additional details or notes about the credit. |

**Rules:**
- Use for supplementary information not covered elsewhere
- Can include tips or clarifications

**Examples:**
- `Covers travel-related expenses`
- `Enrollment required.`
- `Monthly credits with additional benefits for US Eats Pass.`
- `""` (empty if no additional details)

---

### EffectiveFrom

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | ISO date (YYYY-MM-DD preferred) |
| **Description** | When this credit became available. |

**Rules:**
- Use YYYY-MM-DD format
- Full ISO timestamp also accepted

**Examples:**
- `2025-01-01`
- `2025-09-19`
- `2025-12-01`

---

### EffectiveTo

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | ISO date or sentinel value |
| **Description** | When this credit expires. |

**Rules:**
- Use `9999-12-31` for ongoing credits with no end date
- Use empty string `""` as alternative (legacy)
- Use specific date if the credit has an expiration

**Sentinel Value:**
```
9999-12-31
```

---

### LastUpdated

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | ISO timestamp |
| **Description** | When this record was last modified. |

**Example:**
```
2025-09-19T04:03:22.168Z
```

---

## Complete Examples

### Monthly Credit Example (Uber)

```json
{
  "id": "de237c66-6d4d-4326-8003-f0fc6fb5cd74",
  "ReferenceCardId": "american-express-platinum",
  "Title": "Uber Credits",
  "Category": "travel",
  "SubCategory": "ground transportation",
  "Description": "$15 Uber credits per month for rides or Uber Eats. Earn an extra $20 in December every year.",
  "Value": 15,
  "TimePeriod": "monthly",
  "Requirements": "MUST BE USED ON UBER.COM",
  "Details": "Monthly credits with additional benefits for US Eats Pass.",
  "EffectiveFrom": "2025-09-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

### Annual Credit Example (Travel)

```json
{
  "id": "44ff81c1-2c93-43e6-bb96-2b3ba7f521a3",
  "ReferenceCardId": "chase-sapphire-reserve",
  "Title": "$300 Annual Travel Credit",
  "Category": "travel",
  "SubCategory": "portal",
  "Description": "Automatically applied as a statement credit for travel purchases.",
  "Value": 300,
  "TimePeriod": "annually",
  "Requirements": "MUST BE BOOKED ON CHASE TRAVEL PORTAL",
  "Details": "Covers travel-related expenses",
  "EffectiveFrom": "2025-01-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

### Semiannual Credit Example (Saks)

```json
{
  "id": "912fc0c8-c0b6-44e1-8698-a2cc97e663e9",
  "ReferenceCardId": "american-express-platinum",
  "Title": "Saks Fifth Avenue",
  "Category": "shopping",
  "SubCategory": "department stores",
  "Description": "Up to $100 annual credit for Saks Fifth Avenue purchases. $50 every 6 months",
  "Value": 50,
  "TimePeriod": "semiannually",
  "Requirements": "Must be used on Saks.com",
  "Details": "",
  "EffectiveFrom": "2025-09-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

---

## Validation Summary

| Field | Required | Type | Format/Enum |
|-------|----------|------|-------------|
| id | Yes | string | UUID |
| ReferenceCardId | Yes | string | kebab-case |
| Title | Yes | string | Title Case, descriptive |
| Category | Yes | string | See category list |
| SubCategory | No | string | See subcategory list or empty |
| Description | No | string | Detailed explanation |
| Value | Yes | number | No $, PER PERIOD |
| TimePeriod | Yes | string | monthly/quarterly/semiannually/annually (lowercase) |
| isAnniversaryBased | No | boolean | true = anniversary-based, false/undefined = calendar |
| isNonMonetary | No | boolean | true = count/quantity, false/undefined = monetary |
| Requirements | No | string | UPPERCASE for emphasis |
| Details | No | string | Additional notes |
| EffectiveFrom | Yes | string | YYYY-MM-DD |
| EffectiveTo | Yes | string | YYYY-MM-DD or 9999-12-31 |
| LastUpdated | Yes | string | Full ISO 8601 timestamp |

---

## Common Mistakes to Avoid

1. **Wrong Value**: Using annual total instead of per-period value
   - Wrong: `120` for a $10/month credit
   - Right: `10` for a $10/month credit

2. **Including $ sign**: The Value field should be numeric only
   - Wrong: `$300`
   - Right: `300`

3. **Wrong TimePeriod capitalization**:
   - Wrong: `Monthly`, `MONTHLY`
   - Right: `monthly` (all lowercase)

4. **Confusing Credits with Perks**: If there's no specific dollar value, it's probably a Perk, not a Credit

5. **Missing Requirements**: If the credit requires a specific portal or merchant, document it

6. **Wrong SubCategory spelling for hotels**:
   - Wrong: `SubCategory: "hotel"` (missing 's')
   - Right: `SubCategory: "hotels"` (with 's')

