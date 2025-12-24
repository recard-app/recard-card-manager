# Credit Card Schema Rules: Perks

This document defines the schema rules, field requirements, types, formatting guidelines, and examples for the **Perk** type (non-monetary benefits and features).

---

## Schema Overview

A Perk represents a non-monetary benefit, feature, or service associated with a credit card. Perks provide value through access, protection, or convenience rather than direct dollar credits.

### What Qualifies as a Perk?
- Access to services (lounge access, concierge)
- Insurance and protection benefits
- Memberships and subscriptions (when there's no specific dollar credit)
- Status benefits (hotel/airline status)
- Convenience features (TSA PreCheck, Global Entry credit eligibility)

### What Does NOT Qualify as a Perk?
- Statement credits with dollar values → use Credit
- Multipliers/rewards rates → use Multiplier

### Perks to EXCLUDE (Do NOT create entries for these)
The following are either redundant (covered elsewhere) or standard for all cards and should NOT be added as perks:

| Exclude | Reason |
|---------|--------|
| **No Foreign Transaction Fee** | Already captured in Card Details (`ForeignExchangeFee` and `ForeignExchangeFeePercentage` fields) |
| **Unauthorized Charge Protection / Zero Liability / Fraud Protection** | Standard for all credit cards by law - not a distinguishing perk |
| **Purchase Protection** | Too common/standard across most cards - not a distinguishing benefit |
| **Extended Warranty Protection** | Too common/standard across most cards - not a distinguishing benefit |
| **24/7 Customer Support / Customer Service** | Standard for all credit cards - not a distinguishing perk |
| **Return Protection** | Too common/standard across most cards - not a distinguishing benefit |
| **Price Protection** | Too common/standard across most cards - not a distinguishing benefit |

**Why these are excluded:**
- Foreign transaction fees are already tracked in the card's main details
- Fraud/unauthorized charge protection is legally required and standard
- Basic insurance (purchase protection, extended warranty) and support are too ubiquitous to be meaningful differentiators

### Gray Area: Credits vs Perks
Some benefits blur the line:
- **TSA PreCheck/Global Entry Credit** - Almost always a Perk because the cadence is every 4-5 years. Use Perk with Category="travel", SubCategory="tsa".
- **Streaming Subscriptions** - If there's a specific dollar credit that resets monthly/quarterly/semiannually/annually, it's a Credit. If it's "complimentary access," it's a Perk.

### Multi-Year Cadence Benefits (CRITICAL)
**Any benefit with a cadence longer than annually belongs in Perks, NOT Credits.**

Credits are restricted to recurring benefits that reset:
- Monthly, Quarterly, Semiannually, or Annually (one year or less)

If a benefit has a cadence like:
- Every 2 years
- Every 4 years (e.g., Global Entry/TSA PreCheck)
- Every 5 years
- One-time or irregular

→ It is a **PERK**, even if it has a specific dollar value.

**Example - Global Entry/TSA PreCheck:**
```json
{
  "Title": "Global Entry or TSA PreCheck Credit",
  "Category": "travel",
  "SubCategory": "tsa",
  "Description": "Statement credit for Global Entry or TSA PreCheck application fees.",
  "Requirements": "ONE STATEMENT CREDIT EVERY FOUR YEARS, MUST PAY APPLICATION FEE WITH CARD",
  "Details": "Credit applies to whichever program is applied for first. Appears within two billing cycles."
}
```
This is a PERK because the cadence (every 4 years) exceeds the annual limit for Credits.

### Master Template Reference

See: `Data/CreditCards/DATAENTRYSampleJsonStructurePerk.json`

---

## Field Reference

### id

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | UUID |
| **Description** | Unique identifier for this perk. |

**Rules:**
- Use UUID format (auto-generated)
- Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Example:**
```
fbbda0f9-7422-47a4-ad8f-3f3a0d7858c0
```

---

### ReferenceCardId

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | kebab-case |
| **Description** | The ID of the card this perk belongs to. |

**Rules:**
- Must match the `ReferenceCardId` of the parent card
- Links this perk to its parent card

**Examples:**
- `chase-sapphire-reserve`
- `american-express-platinum`
- `capital-one-venture-x`

---

### Title

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Description** | A short, descriptive name for the perk. |

**Rules:**
- Keep it concise but descriptive
- Use Title Case
- Should clearly identify the benefit

**Good Examples:**
- `Priority Pass Select`
- `Airport Lounge Access`
- `TSA/Global Entry Credit`
- `Fine Hotels & Resorts Program`
- `DoorDash DashPass`
- `Peloton Membership`
- `Travel and Emergency Assistance`
- `Trip Cancellation Insurance`
- `Rental Car Insurance`
- `Cell Phone Protection`

**Common Perk Titles by Category:**

| Category | Common Perk Titles |
|----------|-------------------|
| Travel - Lounge | `Priority Pass Select`, `Airport Lounge Access`, `Centurion Lounge Access` |
| Travel - TSA | `TSA PreCheck Credit`, `Global Entry Credit`, `TSA/Global Entry Credit`, `Clear and TSA Credit` |
| Travel - Hotels | `Fine Hotels & Resorts Program`, `Hotel Status` |
| Insurance | `Trip Cancellation Insurance`, `Rental Car Insurance`, `Cell Phone Protection`, `Baggage Insurance` |
| Dining | `DoorDash DashPass` |
| Entertainment | `Peloton Membership`, `Apple TV+ Membership` |

**Note:** Do NOT include Purchase Protection, Extended Warranty, or similar basic insurance perks - see exclusions above.

---

### Category

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Description** | The primary category this perk falls under. |

**Allowed Values:**

| Category | Description | Common Perk Examples |
|----------|-------------|---------------------|
| `travel` | Travel-related benefits | Lounge access, hotel programs, TSA credits |
| `insurance` | Protection benefits | Purchase protection, travel insurance, car rental coverage |
| `dining` | Food-related benefits | DashPass, restaurant reservations |
| `entertainment` | Entertainment access | Streaming, event access |
| `shopping` | Retail benefits | Extended returns, price protection |
| `general` | General/catch-all | Concierge, miscellaneous |

**Most Common Categories for Perks:**
- `travel` - By far the most common (lounge access, hotel programs, TSA)
- `insurance` - Second most common (various protection benefits)

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
| insurance | `purchase`, `travel`, `car rental`, `cell phone protection`, `rental car protection` |
| shopping | `supermarkets`, `online shopping`, `online grocery`, `drugstores`, `retail` |
| entertainment | `streaming` |
| dining | (none - leave empty) |
| general | `entertainment` (can be used here too) |

**Common Perk Category/SubCategory Combinations:**

| Perk Type | Category | SubCategory |
|-----------|----------|-------------|
| Lounge Access | `travel` | `lounge access` |
| TSA PreCheck/Global Entry | `travel` | `tsa` |
| Hotel Programs | `travel` | `hotels` |
| Portal/Booking Programs | `travel` | `portal` |
| Purchase Protection | `insurance` | `purchase` |
| Travel Insurance | `insurance` | `travel` |
| Rental Car Insurance | `insurance` | `car rental` or `rental car protection` |
| Cell Phone Protection | `insurance` | `cell phone protection` |
| Streaming Services | `general` | `entertainment` |

**IMPORTANT - Portal Booking Categorization:**

When a perk requires booking through a specific service, website, or method related to the **card issuer** or **card network**, use:
- **Category:** `travel`
- **SubCategory:** `portal`

This applies to perks like:
- Visa Luxury Hotel Collection / Visa Signature Luxury Hotel Collection
- Amex Fine Hotels & Resorts (when emphasizing the booking requirement)
- Amex Hotel Collection
- Chase Travel portal benefits
- Capital One Travel portal benefits
- Mastercard Travel & Lifestyle Services

**Example - Visa Signature Luxury Hotel Collection:**
```json
{
  "Title": "Visa Signature Luxury Hotel Collection",
  "Category": "travel",
  "SubCategory": "portal",
  "Description": "Access to a premium collection of benefits at prestigious properties worldwide.",
  "Requirements": "Reservations must be booked through Visa Luxury Hotel Collection website or Visa Concierge.",
  "Details": "Benefits vary by property."
}
```

**Note:** If the perk is specifically about hotel status or benefits (not the booking method), use `SubCategory: "hotels"` instead. Use `portal` when the booking method through a specific issuer/network service is the key aspect.

---

### Description

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Description** | A detailed explanation of what the perk provides. |

**Rules:**
- Explain the benefit clearly
- Include relevant details about coverage or access
- Keep it informative

**Good Examples:**
- `Access to 1,300+ airport lounges worldwide.`
- `Get coverage for damaged or stolen items purchased with the card.`
- `VIP amenities, upgrades, and privileges at select luxury hotels worldwide.`
- `Access to various airport lounges worldwide including Priority Pass, Centurion Lounges, and more.`
- `Complimentary DashPass membership`
- `Use your Card to cover cost of a CLEAR Plus Membership, excluding any applicable taxes and fees, and get up to $199 back in statement credit per calendar year`

---

### Requirements

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | No (optional) |
| **Description** | Any special requirements to access or use this perk. |

**Rules:**
- Use for enrollment requirements, eligibility conditions
- Leave empty if no special requirements
- Can use UPPERCASE for emphasis

**Examples:**
- `Must be enrolled in Priority Pass program`
- `Must be dined at a Sapphire Reserve Exclusive Tables`
- `Cardholder must present card and valid boarding pass`
- `""` (empty if no requirements)

---

### Details

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | No (optional) |
| **Description** | Additional details or notes about the perk. |

**Rules:**
- Use for supplementary information
- Include coverage limits, guest policies, exclusions

**Good Examples:**
- `Cardholder + guests` (for lounge access guest policy)
- `Up to $500 per claim and $50,000 per account.` (for insurance limits)
- `Must book through Amex Travel to receive benefits.`
- `Cardholder must enroll and show valid card and boarding pass for access.`
- `Administered by a third-party provider.`

---

### EffectiveFrom

| Property | Value |
|----------|-------|
| **Type** | `string` |
| **Required** | Yes |
| **Format** | `YYYY-MM-DD` format |
| **Description** | When this perk became available. |

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
| **Description** | When this perk expires. |

**Rules:**
- Use `9999-12-31` for ongoing perks with no end date
- Use specific date for limited-time perks

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

### Lounge Access Perk

```json
{
  "id": "fbbda0f9-7422-47a4-ad8f-3f3a0d7858c0",
  "ReferenceCardId": "chase-sapphire-reserve",
  "Title": "Priority Pass Select",
  "Category": "travel",
  "SubCategory": "lounge access",
  "Description": "Access to 1,300+ airport lounges worldwide.",
  "Requirements": "",
  "Details": "Cardholder + guests",
  "EffectiveFrom": "2025-09-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

### TSA/Global Entry Perk

```json
{
  "id": "504b6d96-eaf1-4e37-99ec-76b1bf07fbaa",
  "ReferenceCardId": "chase-sapphire-reserve",
  "Title": "TSA/Global Entry Credit",
  "Category": "travel",
  "SubCategory": "tsa",
  "Description": "Use your Card to cover cost of a CLEAR Plus Membership, excluding any applicable taxes and fees, and get up to $199 back in statement credit per calendar year",
  "Requirements": "",
  "Details": "",
  "EffectiveFrom": "2025-09-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

### Hotel Program Perk

```json
{
  "id": "39b30262-b05e-4da3-8a63-e3a7f23bfb7a",
  "ReferenceCardId": "american-express-platinum",
  "Title": "Fine Hotels & Resorts Program",
  "Category": "travel",
  "SubCategory": "hotels",
  "Description": "VIP amenities, upgrades, and privileges at select luxury hotels worldwide.",
  "Requirements": "",
  "Details": "Must book through Amex Travel to receive benefits.",
  "EffectiveFrom": "2025-09-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

### Insurance Perk (Trip Cancellation)

```json
{
  "id": "0a638020-5eef-4de3-b3ea-7e8885cdd3ae",
  "ReferenceCardId": "chase-sapphire-reserve",
  "Title": "Trip Cancellation/Interruption Insurance",
  "Category": "insurance",
  "SubCategory": "travel",
  "Description": "Coverage for non-refundable trip costs if your trip is cancelled or cut short due to covered reasons.",
  "Requirements": "Trip must be paid with the card",
  "Details": "Up to $10,000 per person and $20,000 per trip.",
  "EffectiveFrom": "2025-09-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

**Note:** Do NOT create perks for Purchase Protection or Extended Warranty - these are excluded.

### Streaming/Entertainment Perk

```json
{
  "id": "e15fa460-1ef5-4bf5-b0d1-e5726acafd4b",
  "ReferenceCardId": "chase-sapphire-reserve",
  "Title": "Apple TV+ Membership",
  "Category": "general",
  "SubCategory": "entertainment",
  "Description": "Complimentary Apple TV+ subscription",
  "Requirements": "",
  "Details": "",
  "EffectiveFrom": "2025-09-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

### Dining Perk

```json
{
  "id": "1f4a394c-9eb0-43f5-97b2-08c58310e433",
  "ReferenceCardId": "chase-sapphire-reserve",
  "Title": "DoorDash DashPass",
  "Category": "dining",
  "SubCategory": "",
  "Description": "Complimentary DashPass membership",
  "Requirements": "Must be dined at a Sapphire Reserve Exclusive Tables",
  "Details": "",
  "EffectiveFrom": "2025-09-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

### Travel Assistance Perk

```json
{
  "id": "bea31c51-9335-40de-b245-fbc596c6082c",
  "ReferenceCardId": "citi-costco",
  "Title": "Travel and emergency assistance",
  "Category": "travel",
  "SubCategory": "",
  "Description": "Access to travel and emergency assistance services.",
  "Requirements": "",
  "Details": "Administered by a third-party provider.",
  "EffectiveFrom": "2025-09-19",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-09-19T04:03:22.168Z"
}
```

---

## Common Perks Reference

Here are the most common perks found on credit cards:

### Travel Perks

| Perk | Category | SubCategory | Cards That Have It |
|------|----------|-------------|-------------------|
| Priority Pass Lounge Access | travel | lounge access | CSR, Amex Platinum, Venture X |
| Centurion Lounge Access | travel | lounge access | Amex Platinum |
| TSA PreCheck/Global Entry | travel | tsa | CSR, Amex Platinum, many premium cards |
| Hotel Elite Status | travel | hotels | Various co-branded cards |
| Fine Hotels & Resorts | travel | hotels | Amex Platinum |

### Insurance Perks

| Perk | Category | SubCategory | What It Covers |
|------|----------|-------------|----------------|
| Trip Cancellation | insurance | travel | Non-refundable trip costs |
| Trip Delay | insurance | travel | Expenses due to delays |
| Rental Car Insurance | insurance | rental car protection | Collision damage waiver |
| Cell Phone Protection | insurance | cell phone protection | Phone damage/theft |
| Baggage Insurance | insurance | travel | Lost/delayed baggage |

**Note:** Purchase Protection and Extended Warranty are excluded - see "Perks to EXCLUDE" section above.

### Entertainment/Lifestyle Perks

| Perk | Category | SubCategory |
|------|----------|-------------|
| DoorDash DashPass | dining | |
| Peloton Membership | general | entertainment |
| Apple TV+ | general | entertainment |
| Walmart+ | shopping | |

---

## Validation Summary

| Field | Required | Type | Format/Enum |
|-------|----------|------|-------------|
| id | Yes | string | UUID |
| ReferenceCardId | Yes | string | kebab-case |
| Title | Yes | string | Title Case, descriptive |
| Category | Yes | string | See category list |
| SubCategory | No | string | See subcategory list or empty |
| Description | Yes | string | What the perk provides |
| Requirements | No | string | Access requirements |
| Details | No | string | Additional notes, limits |
| EffectiveFrom | Yes | string | YYYY-MM-DD |
| EffectiveTo | Yes | string | YYYY-MM-DD or 9999-12-31 |
| LastUpdated | Yes | string | Full ISO 8601 timestamp |

---

## Common Mistakes to Avoid

1. **Confusing Perks with Credits**: If there's a specific dollar value that appears on your statement, it's probably a Credit, not a Perk.
   - Perk: "Complimentary lounge access"
   - Credit: "$300 travel credit"

2. **Wrong Category for Lounge Access**:
   - Wrong: `Category: "general"`
   - Right: `Category: "travel"`, `SubCategory: "lounge access"`

3. **Missing Details for Insurance**: Insurance perks should include coverage limits in the Details field

4. **Vague Descriptions**: Be specific about what the perk provides
   - Wrong: `Description: "Travel benefits"`
   - Right: `Description: "Access to 1,300+ airport lounges worldwide."`

5. **Note on `general` + `entertainment`**: For streaming/entertainment perks, using `Category: "general"` with `SubCategory: "entertainment"` is acceptable and commonly used

6. **Including excluded perks**: Do NOT create perks for:
   - No Foreign Transaction Fee (already in Card Details)
   - Unauthorized Charge Protection / Zero Liability / Fraud Protection (standard for all cards)
   - Purchase Protection (too common/standard)
   - Extended Warranty Protection (too common/standard)
   - 24/7 Customer Support (standard for all cards)
   - Return Protection / Price Protection (too common/standard)

---

## Difference Between Perks, Credits, and Multipliers

| Type | Has Dollar Value? | Appears on Statement? | Example |
|------|------------------|----------------------|---------|
| **Credit** | Yes, specific $ | Yes, as credit | "$300 travel credit" |
| **Multiplier** | No | Yes, as rewards | "3X points on dining" |
| **Perk** | No | No | "Priority Pass access" |

