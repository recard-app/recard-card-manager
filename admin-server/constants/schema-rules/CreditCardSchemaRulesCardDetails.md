# Credit Card Schema Rules: Card Details

This document defines the schema rules, field requirements, types, formatting guidelines, and examples for the **CardDetails** type (credit card-level fields).

---

## Schema Overview

The CardDetails schema represents a credit card version with all its metadata. Cards are versioned, meaning multiple versions of the same card can exist with different effective dates.

### Master Template Reference

See: `Data/CreditCards/DATAENTRYSampleJsonStructureOneCard.json`

---

## Field Reference

### id

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | kebab-case (lowercase letters, numbers, hyphens only) |
| **Description** | Unique identifier for this card version. Should be based on the card name. |

**Rules:**
- Use kebab-case: lowercase letters, numbers, and hyphens only
- No spaces, underscores, or special characters
- Should be descriptive and derived from the card name
- For the base/reference card, this equals ReferenceCardId

**Good Examples:**
- `chase-sapphire-reserve`
- `american-express-platinum`
- `capital-one-venture-x`
- `bank-of-america-unlimited-cash-rewards`

**Bad Examples:**
- `Chase Sapphire Reserve` (has spaces and uppercase)
- `chase_sapphire_reserve` (uses underscores)
- `CSR` (not descriptive)

---

### VersionName

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | kebab-case with date suffix |
| **Description** | Name/label for this specific version of the card. |

**Rules:**
- Use kebab-case format
- Include a date reference (month and year) to indicate when this version became active
- Format: `{card-id}-{month}-{year}` (e.g., `chase-sapphire-reserve-sept-2025`)

**Good Examples:**
- `chase-sapphire-reserve-sept-2025`
- `american-express-platinum-nov-2025`
- `capital-one-venture-x-jan-2024`

---

### ReferenceCardId

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | kebab-case |
| **Description** | Reference to the base card this version belongs to. Used to link all versions of the same card. |

**Rules:**
- Must match the `id` of the base/original card
- For the first version of a card, this equals `id`
- All component items (perks, credits, multipliers) use this to reference their parent card

**Examples:**
- `chase-sapphire-reserve`
- `american-express-gold`

---

### IsActive

| Property | Value |
|----------|-------|
| **Type** | `boolean` |
| **Required** | Yes |
| **Default** | `true` |
| **Description** | Whether this version is currently active. |

**Rules:**
- Only one version of a card should be active at a time
- Set to `true` for the current/active version
- Set to `false` for historical or future versions

---

### CardName

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Description** | The official marketing name of the credit card. |

**Rules:**
- Use the official card name as shown on the card issuer's website
- Include the full name, not abbreviations
- Title case formatting

**Good Examples:**
- `Chase Sapphire Reserve`
- `American Express Platinum`
- `Capital One Venture X`
- `Citi Costco`

**Bad Examples:**
- `CSR` (abbreviation)
- `chase sapphire reserve` (wrong case)
- `CHASE SAPPHIRE RESERVE` (all caps)

---

### CardIssuer

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Description** | The financial institution that issues the card. |

**Sample/Common Values:**
| Value | Notes |
|-------|-------|
| `Chase` | |
| `American Express` | |
| `Capital One` | |
| `Citi` | |
| `Bank of America` | |
| `Wells Fargo` | |
| `U.S. Bank` | |
| `Barclays` | |
| `Discover` | |
| `Synchrony` | |

---

### CardNetwork

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Description** | The payment network the card operates on. |

**Sample/Common Values:**
| Value | Notes |
|-------|-------|
| `Visa` | |
| `Mastercard` | |
| `American Express` | Also written as "Amex" on some cards |
| `Discover` | |

---

### CardDetails

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | No (optional) |
| **Description** | A brief description of the card's primary value proposition and target audience. |

**Rules:**
- Keep it concise (1-2 sentences)
- Focus on the card's main benefits and who it's designed for
- Use complete sentences

**Good Examples:**
- `Premium travel card offering benefits for frequent travelers. Great for maximizing travel and dining spending with access to Chase Ultimate Rewards and exclusive perks.`
- `Premium dining and grocery rewards card perfect for those who spend heavily on groceries and dining out.`
- `Versatile no annual fee card that offers cashback rewards on a wide range of purchases.`

---

### CardImage

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | No (optional) |
| **Default** | `""` (empty string) |
| **Description** | URL to an image of the card. |

**Rules:**
- Leave empty if no image is available
- Use a valid URL if providing an image

---

### CardPrimaryColor

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | No (optional) |
| **Format** | Hex color code |
| **Default** | `#5A5F66` |
| **Description** | The primary brand color of the card (used for UI display). |

**Rules:**
- Use 6-digit hex format with # prefix
- **Color Selection**: Use your best guess of what the physical card looks like in real life. This should be the base/background color that covers the majority of the card surface.
- **Usage**: This is the base/background color of the rendered card icon. It covers most of the card area.

**Examples:**
| Card | Color | Notes |
|------|-------|-------|
| Chase Sapphire Reserve | `#0A1F2E` | Dark navy blue (the main color of the physical card) |
| American Express Platinum | `#B1B3B3` | Silver/gray (the metallic finish) |
| American Express Gold | `#D4AF37` | Gold (the dominant gold color) |
| Capital One Venture X | `#1A1A1A` | Black (the main card color) |

---

### CardSecondaryColor

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | No (optional) |
| **Format** | Hex color code |
| **Default** | `#F2F4F6` |
| **Description** | The secondary brand color of the card (used for UI accents). |

**Rules:**
- Use 6-digit hex format with # prefix
- **Color Selection**: Use your best guess of what the physical card looks like in real life. This should be the accent color used for details, logos, text, or decorative elements on the card.
- **Usage**: This is used for the accent stripe on the rendered card icon. The stripe is minimal and small, so this color acts as a highlight or detail accent.

---

### AnnualFee

| Property | Value |
|----------|-------|
| **Type** | `number | null` |
| **Required** | Yes |
| **Description** | The card's annual fee in dollars. |

**Rules:**
- Use a number (not a string)
- Use `0` for cards with no annual fee
- Use `null` only if the fee is truly unknown
- Do NOT include the dollar sign

**Examples:**
| Card | Value |
|------|-------|
| Chase Sapphire Reserve | `550` |
| American Express Gold | `325` |
| Chase Freedom Flex | `0` |
| Capital One Venture X | `395` |

---

### ForeignExchangeFee

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Description** | Description of foreign transaction fees. |

**Common Values:**
| Value | When to Use |
|-------|-------------|
| `None` | Card has no foreign transaction fee |
| `3%` | Card charges 3% FX fee |
| `3% of each transaction in U.S. dollars` | More detailed description |

**Rules:**
- Use `None` for cards without FX fees
- For cards with fees, describe the percentage

---

### ForeignExchangeFeePercentage

| Property | Value |
|----------|-------|
| **Type** | `number` | `null` |
| **Required** | Yes |
| **Description** | The foreign transaction fee as a percentage. |

**Rules:**
- Use `0` for cards with no foreign transaction fee
- Use the numeric value (e.g., `3` for 3%)
- Use `null` only if unknown

**Examples:**
| FX Fee Description | Percentage Value |
|-------------------|------------------|
| `none` | `0` |
| `3%` | `3` |
| `2.7%` | `2.7` |

---

### RewardsCurrency

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Description** | The type of rewards currency earned. |

**Common Values:**
| Value | When to Use |
|-------|-------------|
| `points` | Generic points (Chase Ultimate Rewards, Amex MR) |
| `miles` | Travel miles (Capital One, airline cards) |
| `cash back` | Cashback rewards |

**Rules:**
- should be all lowercase when stored as value. It will be capitalized in the UI if needed via CSS. 

**Issuer-Specific Examples:**
| Issuer | Typical Value |
|--------|---------------|
| Chase | `points` (Ultimate Rewards) |
| American Express | `points` (Membership Rewards) |
| Capital One | `miles` |
| Discover | `cash back` |

---

### PointsPerDollar

| Property | Value |
|----------|-------|
| **Type** | `number | null` |
| **Required** | Yes |
| **Description** | The base earning rate (points/miles/cashback per dollar spent). |

**Rules:**
- This is the BASE rate, not category-specific multipliers
- Usually `1` for most cards
- Some cards have a higher base rate (e.g., Capital One Quicksilver at `1.5`)
- Use `null` only if unknown

**Examples:**
| Card | Value | Notes |
|------|-------|-------|
| Chase Sapphire Reserve | `1` | Base 1x, categories earn more |
| Capital One Quicksilver | `1.5` | 1.5% on everything |
| Capital One Venture X | `2` | 2x on everything |

---

### effectiveFrom

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | `YYYY-MM-DD` format |
| **Description** | When this card version became active. |

**Rules:**
- Use YYYY-MM-DD format (e.g., `2025-01-01`)
- Should reflect when this version's terms took effect

**Examples:**
- `2025-09-19`
- `2025-01-01`
- `2025-11-10`

---

### effectiveTo

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | `YYYY-MM-DD` format or sentinel value |
| **Description** | When this card version expires/ended. |

**Rules:**
- Use `9999-12-31` for ongoing/current versions with no end date (sentinel value)
- Use a specific date if this version has been superseded

**Sentinel Value:**
```
9999-12-31
```
This represents "ongoing" or "no end date" and is preferred over empty string for better database indexing.

---

### lastUpdated

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | Full ISO 8601 timestamp |
| **Description** | When this record was last modified. |

**Rules:**
- Use full ISO timestamp format (e.g., `2025-12-01T03:46:43.574Z`)
- Must include date, time, and timezone (Z)
- Automatically updated when changes are saved

**Example:**
```
2025-12-01T03:46:43.574Z
```

---

### Perks, Credits, Multipliers

| Property | Value |
|----------|-------|
| **Type** | `array` |
| **Required** | Yes |
| **Description** | Arrays containing references to component items. |

**In Full/Enhanced Format:**
These contain the full component objects with all details.

**In Reference Format:**
These contain only ID references:
```json
"Perks": [
  { "id": "perk-id-1" },
  { "id": "perk-id-2" }
]
```

---

## Complete Example

```json
{
  "id": "chase-sapphire-reserve",
  "VersionName": "chase-sapphire-reserve-sept-2025",
  "ReferenceCardId": "chase-sapphire-reserve",
  "IsActive": true,
  "CardName": "Chase Sapphire Reserve",
  "CardIssuer": "Chase",
  "CardNetwork": "Visa",
  "CardDetails": "Premium travel card offering benefits for frequent travelers. Great for maximizing travel and dining spending with access to Chase Ultimate Rewards and exclusive perks.",
  "CardImage": "",
  "CardPrimaryColor": "#0A1F2E",
  "CardSecondaryColor": "#A8C7DA",
  "AnnualFee": 550,
  "ForeignExchangeFee": "none",
  "ForeignExchangeFeePercentage": 0,
  "RewardsCurrency": "points",
  "PointsPerDollar": 1,
  "effectiveFrom": "2025-09-19",
  "effectiveTo": "9999-12-31",
  "lastUpdated": "2025-12-01T03:46:43.574Z",
  "Perks": [],
  "Credits": [],
  "Multipliers": []
}
```

---

## Validation Summary

| Field | Required | Type | Format/Enum |
|-------|----------|------|-------------|
| id | Yes | string | kebab-case |
| VersionName | Yes | string | kebab-case with date |
| ReferenceCardId | Yes | string | kebab-case |
| IsActive | Yes | boolean | true/false |
| CardName | Yes | string | Title case |
| CardIssuer | Yes | string | String (see common values) |
| CardNetwork | Yes | string | Visa/Mastercard/American Express/Discover |
| CardDetails | No | string | 1-2 sentences |
| CardImage | No | string | URL or empty |
| CardPrimaryColor | No | string | Hex (#XXXXXX) |
| CardSecondaryColor | No | string | Hex (#XXXXXX) |
| AnnualFee | Yes | number/null | Numeric, no $ |
| ForeignExchangeFee | Yes | string | Description (e.g. "None" or "3%") |
| ForeignExchangeFeePercentage | Yes | number/null | Numeric percentage |
| RewardsCurrency | Yes | string | points/miles/cash back (lowercase) |
| PointsPerDollar | Yes | number/null | Base earning rate |
| effectiveFrom | Yes | string | YYYY-MM-DD |
| effectiveTo | Yes | string | YYYY-MM-DD or 9999-12-31 |
| lastUpdated | Yes | string | Full ISO 8601 timestamp |
| Perks | Yes | array | Component references |
| Credits | Yes | array | Component references |
| Multipliers | Yes | array | Component references |

