# Credit Card Schema Rules: Credits

This document defines the schema rules, field requirements, types, formatting guidelines, and examples for the **Credit** type (statement credits and monetary benefits).

---

## Schema Overview

A Credit represents a statement credit, reimbursement, or dollar-value benefit associated with a credit card. Credits have specific monetary values and reset on defined time periods.

### What Qualifies as a Credit?
- Statement credits with a specific dollar value
- Reimbursements for specific purchases
- Dollar-value benefits that appear on your statement

### What Does NOT Qualify as a Credit?
- Multipliers/rewards rates (e.g., "3X on dining") → use Multiplier
- Non-monetary perks (e.g., "lounge access") → use Perk
- Benefits with a cadence longer than annually (e.g., every 2 years, every 4 years) → use Perk

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
  "Value": "15",
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
  "Value": "300",
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
  "Value": "50",
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
| Value | Yes | string | Numeric, no $, PER PERIOD |
| TimePeriod | Yes | string | monthly/quarterly/semiannually/annually (lowercase) |
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

