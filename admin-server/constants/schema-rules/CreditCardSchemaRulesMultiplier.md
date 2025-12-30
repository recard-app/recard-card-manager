# Credit Card Schema Rules: Multipliers

This document defines the schema rules, field requirements, types, formatting guidelines, and examples for the **Multiplier** type (rewards rates and points multipliers).

---

## Schema Overview

A Multiplier represents a rewards earning rate for specific spending categories. Multipliers define how many points, miles, or percentage cashback you earn per dollar spent in various categories.

### What Qualifies as a Multiplier?
- Points multipliers (e.g., "3X on dining")
- Miles earning rates (e.g., "5X miles on flights")
- Cashback percentages (e.g., "2% on groceries")
- Category-specific bonus earning rates

### What Does NOT Qualify as a Multiplier?
- Statement credits with dollar values → use Credit
- Non-monetary perks → use Perk

### Master Template Reference

See: `Data/CreditCards/DATAENTRYSampleJsonStructureMultiplier.json`

---

## Field Reference

### id

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | UUID |
| **Description** | Unique identifier for this multiplier. |

**Rules:**
- Use UUID format (auto-generated)
- Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Example:**
```
8fd44e03-90b0-476f-85f5-be1d8de6c89a
```

---

### ReferenceCardId

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | kebab-case |
| **Description** | The ID of the card this multiplier belongs to. |

**Rules:**
- Must match the `ReferenceCardId` of the parent card
- Links this multiplier to its parent card

**Examples:**
- `chase-sapphire-reserve`
- `american-express-gold`
- `capital-one-venture-x`

---

### Name

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Description** | A short, descriptive name for the multiplier. |

**Rules:**
- Keep it concise but descriptive
- Should indicate the category or earning rate
- Use Title Case

**Good Examples:**
- `Dining`
- `Travel`
- `Flights`
- `Hotels & Rental Cars`
- `Supermarkets`
- `Everyday Purchases`
- `Gas Stations`
- `Drugstores`

**Naming Patterns:**

| Pattern | Examples |
|---------|----------|
| Single category | `Dining`, `Travel`, `Gas` |
| Combined categories | `Hotels & Rental Cars`, `Flights & Vacation Rentals` |
| Specific merchant/portal | `Chase Travel Portal` |
| Base rate | `Everyday Purchases`, `All Other Purchases` |

**Bad Examples:**
- `3X on dining` (include multiplier value in Name - put it in Description instead)
- `DINING` (all caps)
- `dining` (lowercase)

---

### Category

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Description** | The primary category this multiplier applies to. |

**Allowed Values:**

| Category | Description | Common Multiplier Examples |
|----------|-------------|---------------------------|
| `travel` | Travel-related spending | Flights, hotels, car rentals, portal bookings |
| `dining` | Restaurants and food | Restaurants, cafes, bars, food delivery |
| `shopping` | Retail purchases | Supermarkets, drugstores, online shopping |
| `gas` | Fuel and EV charging | Gas stations, EV charging |
| `entertainment` | Entertainment spending | Streaming, events |
| `transportation` | Ground transportation | Rideshare |
| `general` | Base/catch-all rate | "Everyday purchases" |
| `portal` | DEPRECATED - use `travel` with subcategory `portal` instead | See note below |
| `transit` | Public transit | Trains, buses |
| `rewards boost` | Special bonus multipliers | Limited-time or conditional bonuses |

**IMPORTANT: Portal Booking Multipliers**
When a multiplier requires booking through a card issuer's travel portal (e.g., Chase Travel, Amex Travel, Capital One Travel), use:
- **Category**: `travel` (this is the MAIN category)
- **SubCategory**: `portal` (this specifies it's portal-booked travel)

This applies when the Requirements field mentions booking through a specific portal (e.g., "MUST BE BOOKED ON AmexTravel.com", "BOOK THROUGH CHASE TRAVEL PORTAL").

Do NOT use `portal` as the Category. Portal bookings are travel purchases, so they belong under the `travel` category with `portal` as the subcategory.

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
| shopping | `supermarkets`, `online shopping`, `online grocery`, `drugstores`, `retail` |
| gas | `gas stations`, `ev charging` |
| entertainment | `streaming` |
| transportation | `rideshare` |
| general | (none - leave empty) |
| portal | (none - leave empty) |

**Rules:**
- Leave as empty string `""` if no subcategory applies
- Use when a multiplier is more specific than just the category

**Examples:**
| Category | SubCategory | Multiplier Example |
|----------|-------------|-------------------|
| travel | `flights` | 5X on flights |
| travel | `hotels` | 4X on hotels |
| travel | `portal` | 10X on Chase Travel Portal bookings |
| shopping | `supermarkets` | 4X at supermarkets |
| shopping | `drugstores` | 3X at drugstores |
| gas | `gas stations` | 5X on gas |
| gas | `ev charging` | 4X on EV charging |
| dining | `""` | 3X on dining (no subcategory) |
| general | `""` | 1X on everything else |

---

### Description

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Description** | A detailed explanation of what purchases qualify for this multiplier. |

**Rules:**
- Explain what types of purchases earn this rate
- Mention any specific merchant categories or restrictions
- Be clear about what's included

**Good Examples:**
- `Covers restaurants, cafes, bars, fast food establishments, and food delivery services.`
- `Flights booked directly with airlines`
- `Hotels booked directly with hotels`
- `All other purchases not falling into any specific category.`
- `US Supermarkets`
- `Earn 1.5x on all purchases`
- `Includes airlines, hotels, motels, timeshares, car rentals, cruises, travel agencies, and more.`

**Bad Examples:**
- `Dining` (too vague - same as Name)
- `3X` (doesn't describe what qualifies)

---

### Multiplier

| Property | Value |
|----------|-------|
| **Type** | `number` |
| **Required** | Yes |
| **Description** | The earning rate (points/miles per dollar or percentage). |

**Rules:**
- Use a number (not a string)
- Represents points/miles per dollar OR percentage cashback
- Can be a decimal (e.g., `1.5` for 1.5X or 1.5%)
- Must be greater than 0

**Examples:**

| Card Type | Rate Display | Multiplier Value |
|-----------|--------------|------------------|
| Points card | 3X points | `3` |
| Points card | 5X points | `5` |
| Miles card | 2X miles | `2` |
| Miles card | 10X miles | `10` |
| Cashback card | 1.5% cashback | `1.5` |
| Cashback card | 5% cashback | `5` |
| Base rate | 1X on everything | `1` |

**Common Values:**
- `1` - Base rate / everyday purchases
- `1.5` - Common cashback rate
- `2` - Common travel card base rate
- `3` - Common dining/travel bonus
- `4` - Premium category bonus
- `5` - Top-tier category bonus
- `8`, `10` - Portal booking bonuses

---

### Requirements

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | No (optional) |
| **Description** | Any special requirements or restrictions to earn this multiplier. |

**Rules:**
- Use UPPERCASE for emphasis on critical requirements
- Be specific about where purchases must be made
- Leave empty if no special requirements

**Common Patterns:**
- `MUST BE BOOKED ON CHASE TRAVEL PORTAL`
- `MUST BE BOOKED ON AmexTravel.com`
- `MUST BE USED ON CAPITAL ONE TRAVEL`
- `MUST BE USED AT COSTCO`
- Portal-specific requirements are very common

**Good Examples:**
- `MUST BE BOOKED ON AmexTravel.com`
- `MUST BE USED ON CAPITAL ONE TRAVEL`
- `First $25,000 per year, then 1X`
- `""` (empty if no requirements)

---

### Details

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | No (optional) |
| **Description** | Additional details or notes about the multiplier. |

**Rules:**
- Use for supplementary information
- Can include spending caps, exclusions, or tips

**Examples:**
- `Up to $1,500 in combined purchases per quarter`
- `Excludes warehouse clubs`
- `""` (empty if no additional details)

---

### multiplierType

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | No (defaults to `standard`) |
| **Description** | The type of multiplier behavior. |

**Allowed Values:**

| Type | Description | Category Field | Additional Data |
|------|-------------|----------------|-----------------|
| `standard` | Fixed category multiplier | Required | None |
| `rotating` | Category changes periodically (quarterly, etc.) | Empty string `""` | Schedule added manually after creation |
| `selectable` | User chooses from allowed categories | Empty string `""` | `allowedCategories` array required |

**Rules:**
- If omitted, defaults to `standard`
- For `rotating`: Leave `Category` as empty string `""`, schedule entries are added manually after creating the multiplier
- For `selectable`: Leave `Category` as empty string `""`, must include `allowedCategories` array

**Examples:**
```json
"multiplierType": "standard"
```
```json
"multiplierType": "rotating"
```
```json
"multiplierType": "selectable"
```

---

### allowedCategories (Selectable Only)

| Property | Value |
|----------|-------|
| **Type** | `array` of objects |
| **Required** | Yes (only when `multiplierType` is `selectable`) |
| **Description** | The categories users can choose from for this multiplier. |

**Array Item Structure:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | string | Yes | Category from standard list (e.g., "dining", "gas") |
| `subCategory` | string | Yes | Subcategory or empty string `""` |
| `displayName` | string | Yes | User-friendly name shown in dropdown |

**Rules:**
- Only include when `multiplierType` is `selectable`
- Must have at least one category entry
- Each entry needs all three fields: `category`, `subCategory`, `displayName`
- Use standard category values from the Category field reference

**Example:**
```json
"allowedCategories": [
  { "category": "dining", "subCategory": "", "displayName": "Restaurants" },
  { "category": "gas", "subCategory": "gas stations", "displayName": "Gas Stations" },
  { "category": "shopping", "subCategory": "supermarkets", "displayName": "Grocery Stores" },
  { "category": "entertainment", "subCategory": "streaming", "displayName": "Streaming Services" }
]
```

---

### scheduleEntries (Rotating Only)

| Property | Value |
|----------|-------|
| **Type** | `array` of objects |
| **Required** | Yes (only when `multiplierType` is `rotating`) |
| **Description** | The schedule entries defining which categories apply to each period. |

**Array Item Structure:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | string | Yes | Category from taxonomy (e.g., "dining", "shopping") |
| `subCategory` | string | Yes | Subcategory or empty string (e.g., "amazon.com", "") |
| `periodType` | string | Yes | One of: "quarter", "month", "half_year", "year" |
| `periodValue` | number | Yes | Period identifier (1-4 for quarter, 1-12 for month, 1-2 for half_year) |
| `year` | number | Yes | The year this entry applies to (e.g., 2025) |
| `title` | string | **Yes** | **REQUIRED** - Descriptive display name (e.g., "Amazon.com purchases") |

**Important:** The `title` field is REQUIRED and should be a human-readable description, NOT just the category name.

**Good Title Examples:**
- "Amazon.com purchases"
- "Dining & Restaurants"
- "Gas Stations & EV Charging"
- "Grocery stores including Target & Walmart"
- "Streaming services"

**Bad Title Examples:**
- "shopping" (too generic, just repeating category)
- "dining" (not descriptive enough)

**Example:**
```json
"scheduleEntries": [
  {
    "category": "shopping",
    "subCategory": "amazon.com",
    "periodType": "quarter",
    "periodValue": 1,
    "year": 2025,
    "title": "Amazon.com purchases"
  },
  {
    "category": "dining",
    "subCategory": "",
    "periodType": "quarter",
    "periodValue": 1,
    "year": 2025,
    "title": "Dining & Restaurants"
  }
]
```

**Note:** Multiple schedule entries can exist for the same period. For example, Q1 2025 might include both "Amazon.com purchases" and "Dining & Restaurants" as separate entries.

---

### EffectiveFrom

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | `YYYY-MM-DD` format |
| **Description** | When this multiplier became available. |

**Rules:**
- Use YYYY-MM-DD format (e.g., `2025-01-01`)

**Examples:**
- `2025-01-01`
- `2025-09-19`

---

### EffectiveTo

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | `YYYY-MM-DD` format or sentinel value |
| **Description** | When this multiplier expires. |

**Rules:**
- Use `9999-12-31` for ongoing multipliers with no end date
- Use specific date for limited-time multipliers

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
| **Format** | Full ISO 8601 timestamp |
| **Description** | When this record was last modified. |

**Rules:**
- Use full ISO timestamp format (e.g., `2025-09-19T04:03:22.168Z`)
- Must include date, time, and timezone (Z)

**Example:**
```
2025-09-19T04:03:22.168Z
```

---

## Complete Examples

### Dining Multiplier

```json
{
  "id": "8fd44e03-90b0-476f-85f5-be1d8de6c89a",
  "ReferenceCardId": "chase-sapphire-reserve",
  "Name": "Dining",
  "Category": "dining",
  "SubCategory": "",
  "Description": "Covers restaurants, cafes, bars, fast food establishments, and food delivery services.",
  "Multiplier": 3,
  "Requirements": "",
  "Details": "",
  "EffectiveFrom": "2025-09-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

### Portal Multiplier (High Rate)

```json
{
  "id": "fbacae42-ce13-42fe-b5ee-7301156b1b0d",
  "ReferenceCardId": "chase-sapphire-reserve",
  "Name": "Chase Travel Portal",
  "Category": "travel",
  "SubCategory": "portal",
  "Description": "Includes airlines, hotels, motels, timeshares, car rentals, cruises, travel agencies, and more.",
  "Multiplier": 8,
  "Requirements": "MUST BE BOOKED ON CHASE TRAVEL PORTAL",
  "Details": "",
  "EffectiveFrom": "2025-09-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

### Amex Travel Portal Multiplier

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "ReferenceCardId": "american-express-platinum",
  "Name": "Prepaid Hotels & Eligible Travel",
  "Category": "travel",
  "SubCategory": "portal",
  "Description": "Earn 2X Membership Rewards points on prepaid hotels and other eligible travel - such as prepaid car rentals, vacation packages and cruises.",
  "Multiplier": 2,
  "Requirements": "BOOK THROUGH AMEXTRAVEL.COM",
  "Details": "",
  "EffectiveFrom": "2025-01-01",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-01-01T00:00:00.000Z"
}
```

### Flights Multiplier

```json
{
  "id": "e0af76f5-5ccc-492a-b42a-bd45222d5950",
  "ReferenceCardId": "chase-sapphire-reserve",
  "Name": "Flights",
  "Category": "travel",
  "SubCategory": "flights",
  "Description": "Flights booked directly with airlines",
  "Multiplier": 4,
  "Requirements": "",
  "Details": "",
  "EffectiveFrom": "2025-09-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

### Base Rate Multiplier

```json
{
  "id": "7c099897-0989-4c6f-8b4d-28073128fa90",
  "ReferenceCardId": "chase-sapphire-reserve",
  "Name": "Everyday Purchases",
  "Category": "general",
  "SubCategory": "",
  "Description": "All other purchases not falling into any specific category.",
  "Multiplier": 1,
  "Requirements": "",
  "Details": "",
  "EffectiveFrom": "2025-09-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

### Cashback Multiplier

```json
{
  "id": "ffd832d7-7cd4-4cc5-a69a-90f93708e07f",
  "ReferenceCardId": "capital-one-quicksilver-cash-rewards",
  "Name": "Everyday Purchases",
  "Category": "general",
  "SubCategory": "",
  "Description": "Earn 1.5x on all purchases",
  "Multiplier": 1.5,
  "Requirements": "",
  "Details": "",
  "EffectiveFrom": "2025-09-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

### Supermarket Multiplier with Cap

```json
{
  "id": "15834cc4-241d-4abb-acee-daf63b055370",
  "ReferenceCardId": "american-express-gold",
  "Name": "Supermarkets",
  "Category": "shopping",
  "SubCategory": "supermarkets",
  "Description": "US Supermarkets",
  "Multiplier": 4,
  "Requirements": "",
  "Details": "Up to $25,000 per year, then 1X",
  "EffectiveFrom": "2025-09-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

### Selectable Multiplier (User Choice)

For cards where users can choose their bonus category from a list of options.

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "ReferenceCardId": "us-bank-cash-plus",
  "Name": "Quarterly Bonus Category",
  "Category": "",
  "SubCategory": "",
  "Description": "Earn 5% cash back on purchases in your chosen category each quarter.",
  "Multiplier": 5,
  "Requirements": "MUST ACTIVATE EACH QUARTER",
  "Details": "Up to $2,000 in combined purchases per quarter",
  "multiplierType": "selectable",
  "allowedCategories": [
    { "category": "dining", "subCategory": "", "displayName": "Restaurants" },
    { "category": "gas", "subCategory": "gas stations", "displayName": "Gas Stations" },
    { "category": "shopping", "subCategory": "supermarkets", "displayName": "Grocery Stores" },
    { "category": "entertainment", "subCategory": "streaming", "displayName": "Streaming Services" },
    { "category": "travel", "subCategory": "", "displayName": "Travel" }
  ],
  "EffectiveFrom": "2025-01-01",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-01-01T00:00:00.000Z"
}
```

**Note:** For selectable multipliers:
- `Category` is empty string (the actual category is determined by user selection)
- `allowedCategories` array defines what users can choose from
- Each allowed category has its own `category`, `subCategory`, and `displayName`

### Rotating Multiplier (Changes Quarterly)

For cards where bonus categories change each quarter (e.g., Chase Freedom, Discover).

```json
{
  "id": "b2c3d4e5-f678-9012-bcde-f12345678901",
  "ReferenceCardId": "chase-freedom-flex",
  "Name": "Rotating 5% Category",
  "Category": "",
  "SubCategory": "",
  "Description": "Earn 5% cash back on bonus categories that rotate each quarter.",
  "Multiplier": 5,
  "Requirements": "MUST ACTIVATE EACH QUARTER",
  "Details": "Up to $1,500 in combined purchases per quarter. Categories announced quarterly.",
  "multiplierType": "rotating",
  "scheduleEntries": [
    {
      "category": "shopping",
      "subCategory": "amazon.com",
      "periodType": "quarter",
      "periodValue": 1,
      "year": 2025,
      "title": "Amazon.com purchases"
    },
    {
      "category": "dining",
      "subCategory": "",
      "periodType": "quarter",
      "periodValue": 1,
      "year": 2025,
      "title": "Dining & Restaurants"
    }
  ],
  "EffectiveFrom": "2025-01-01",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-01-01T00:00:00.000Z"
}
```

**Note:** For rotating multipliers:
- `Category` is empty string (varies by schedule period)
- Include `scheduleEntries` array with current period categories
- Each schedule entry MUST have a `title` field with a descriptive display name
- A single period (e.g., Q1 2025) can have multiple categories - create separate schedule entries for each
- Example: Q1 2025 might include both "Amazon.com purchases" and "Dining & Restaurants" as separate entries

---

## Every Card Should Have...

Most cards should have at least these multipliers:

1. **Base rate** - "Everyday Purchases" with `Category: general` and `Multiplier: 1` (or the card's base rate)
2. **Primary bonus categories** - The card's main earning categories

**Example: Chase Sapphire Reserve**
- Dining: 3X
- Travel: 3X (or broken into flights/hotels at different rates)
- Portal: 8X or 10X
- Everyday Purchases: 1X

---

## Validation Summary

| Field | Required | Type | Format/Enum |
|-------|----------|------|-------------|
| id | Yes | string | UUID |
| ReferenceCardId | Yes | string | kebab-case |
| Name | Yes | string | Title Case, descriptive |
| Category | Yes* | string | See category list (* empty for rotating/selectable) |
| SubCategory | No | string | See subcategory list or empty |
| Description | Yes | string | What qualifies |
| Multiplier | Yes | number | > 0, can be decimal |
| Requirements | No | string | UPPERCASE for emphasis |
| Details | No | string | Additional notes |
| multiplierType | No | string | "standard" (default), "rotating", "selectable" |
| allowedCategories | Conditional | array | Required only when multiplierType is "selectable" |
| scheduleEntries | Conditional | array | Required only when multiplierType is "rotating" |
| EffectiveFrom | Yes | string | YYYY-MM-DD |
| EffectiveTo | Yes | string | YYYY-MM-DD or 9999-12-31 |
| LastUpdated | Yes | string | Full ISO 8601 timestamp |

---

## Common Mistakes to Avoid

1. **String instead of number for Multiplier**:
   - Wrong: `"3"` (string)
   - Right: `3` (number)

2. **Including "X" in Multiplier value**:
   - Wrong: `"3X"`
   - Right: `3`

3. **Putting multiplier value in Name**:
   - Wrong: `"3X on Dining"`
   - Right: Name: `"Dining"`, Description: `"Earn 3X on dining..."`

4. **Missing base rate**: Every card should have an "Everyday Purchases" or equivalent multiplier for the base earning rate

5. **Wrong Category for portal purchases**: When a multiplier requires booking through an issuer's portal (Chase Travel, Amex Travel, etc.), use:
   - Category: `travel`
   - SubCategory: `portal`
   - Wrong: Category `portal` with empty SubCategory
   - Right: Category `travel` with SubCategory `portal`

6. **Wrong SubCategory spelling for hotels**:
   - Wrong: `SubCategory: "hotel"` (missing 's')
   - Right: `SubCategory: "hotels"` (with 's')

7. **Missing allowedCategories for selectable type**:
   - Wrong: `multiplierType: "selectable"` without `allowedCategories`
   - Right: Include full `allowedCategories` array with at least one category

8. **Including allowedCategories for non-selectable types**:
   - Wrong: `multiplierType: "standard"` with `allowedCategories`
   - Right: Only include `allowedCategories` when `multiplierType: "selectable"`

9. **Non-empty Category for rotating/selectable**:
   - Wrong: `multiplierType: "selectable"` with `Category: "dining"`
   - Right: `Category: ""` (empty) for rotating/selectable types

10. **Missing scheduleEntries for rotating multipliers**:
    - Wrong: `multiplierType: "rotating"` without `scheduleEntries`
    - Right: Include `scheduleEntries` array with current period categories

11. **Missing or generic title in scheduleEntries**:
    - Wrong: `"title": "shopping"` (just repeating category)
    - Right: `"title": "Amazon.com purchases"` (descriptive display name)

