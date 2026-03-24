import fs from 'fs';
import path from 'path';

export type SchemaRuleType = 'card' | 'credit' | 'perk' | 'multiplier' | 'rotating-categories';

const RULES_DIR = path.resolve(__dirname, '../constants/schema-rules');

// Cache for condensed rules
const rulesCache: Record<string, string> = {};

const FILE_MAP: Record<SchemaRuleType, string> = {
  card: 'CreditCardSchemaRulesCardDetails.md',
  credit: 'CreditCardSchemaRulesCredit.md',
  perk: 'CreditCardSchemaRulesPerk.md',
  multiplier: 'CreditCardSchemaRulesMultiplier.md',
  'rotating-categories': 'CreditCardSchemaRulesRotatingCategories.md',
};

/**
 * Extracts "What Qualifies", classification rules, and "What Does NOT Qualify" sections
 */
function extractQualificationRules(content: string): string {
  const qualifies = content.match(/### What Qualifies[\s\S]*?(?=###|---)/);
  const notQualifies = content.match(/### What Does NOT Qualify[\s\S]*?(?=###|---)/);
  // Also extract the Redeemable vs Auto-Applied / Auto-Applied vs Redeemable section
  const classificationRules = content.match(/### (?:Redeemable vs Auto-Applied|Auto-Applied vs Redeemable)[\s\S]*?(?=###|---)/);
  // Extract the Multi-Card Pages section
  const multiCardRules = content.match(/### Multi-Card Pages[\s\S]*?(?=###|---)/);
  // Extract the Top N Categories section (multipliers only)
  const topNCategoriesRules = content.match(/### "Top N Categories" Multipliers[\s\S]*?(?=###|---)/);

  let result = '';
  if (qualifies) result += qualifies[0].trim() + '\n\n';
  if (classificationRules) result += classificationRules[0].trim() + '\n\n';
  if (topNCategoriesRules) result += topNCategoriesRules[0].trim() + '\n\n';
  if (notQualifies) result += notQualifies[0].trim() + '\n\n';
  if (multiCardRules) result += multiCardRules[0].trim();

  return result.trim();
}

/**
 * Extracts the "Common Mistakes to Avoid" section
 */
function extractCommonMistakes(content: string): string {
  const match = content.match(/## Common Mistakes to Avoid[\s\S]*?(?=##|$)/);
  return match ? match[0].trim() : '';
}

/**
 * Extracts ONE complete JSON example from the examples section
 */
function extractOneExample(content: string): string {
  // Find the Complete Examples section and get the first JSON block
  const examplesSection = content.match(/## Complete Examples?[\s\S]*?```json[\s\S]*?```/);
  if (examplesSection) {
    // Extract just the first example with its heading
    const firstExample = examplesSection[0].match(/### [\w\s]+[\s\S]*?```json[\s\S]*?```/);
    if (firstExample) {
      return firstExample[0].trim();
    }
    // Fallback: just get the JSON block
    const jsonBlock = examplesSection[0].match(/```json[\s\S]*?```/);
    return jsonBlock ? `## Example\n\n${jsonBlock[0]}` : '';
  }
  return '';
}

/**
 * Extracts critical field rules based on the schema type
 */
function extractCriticalFieldRules(content: string, type: SchemaRuleType): string {
  const rules: string[] = [];
  
  // Card-specific rules - many fields are auto-generated
  if (type === 'card') {
    rules.push('- DO NOT include id, VersionName, ReferenceCardId, IsActive, CardImage, lastUpdated, effectiveFrom, effectiveTo, Perks, Credits, or Multipliers fields (auto-generated)');
    rules.push('- CardName: Format is "[Issuer] [Product Name]". Always start with the card issuer. Drop "Card" from the end UNLESS the name would be too short or ambiguous without it. Always drop "Credit Card". Include co-brand names (Delta SkyMiles, United, Hilton Honors, Marriott Bonvoy, World of Hyatt). No trademark/copyright/service mark symbols (TM, R, SM, C, etc.) -- use only basic keyboard characters. Examples: "Chase Sapphire Reserve", "American Express Gold Card" (keeps Card - ambiguous without it), "Capital One Venture X", "Chase Freedom Flex", "Bank of America Customized Cash Rewards", "Wells Fargo Active Cash", "Apple Card" (keeps Card - too short without it), "Bilt Card" (keeps Card - too short), "Citi Double Cash", "American Express Delta SkyMiles Gold", "Chase United Explorer", "Capital One SavorOne Rewards", "Discover it Cash Back"');
    rules.push('- AnnualFee: number (not string), no $ sign');
    rules.push('- ForeignExchangeFee: Description of the foreign exchange fee policy');
    rules.push('- ForeignExchangeFeePercentage: number (0 for no fee)');
    rules.push('- RewardsCurrency: lowercase ("points", "miles", "cash back")');
  }
  
  if (type === 'credit') {
    rules.push('- DO NOT include id, ReferenceCardId, LastUpdated, EffectiveFrom, or EffectiveTo fields (auto-generated)');
    rules.push('- Title: Title Case. Only include $ amount for Annually/Semiannually/Quarterly credits, NOT for Monthly. No trademark/copyright symbols -- basic keyboard characters only');
    rules.push('- Value: Numeric string WITHOUT $ sign, PER TIME PERIOD (not annual total)');
    rules.push('- TimePeriod: lowercase only - "monthly" | "quarterly" | "semiannually" | "annually"');
    rules.push('- CADENCE RULE: Credits MUST have a cadence of one year or less. Benefits with cadence >1 year (e.g., every 4 years for TSA/Global Entry) are PERKS, not Credits');
    rules.push('- AUTO-AWARDED POINTS ARE NOT CREDITS: Bonus points, miles, PQP, PQF, EQM, EQS, MQM, MQS, or any auto-deposited rewards/qualifying metrics are PERKS, not credits -- even if they have a numeric value and recur annually. The cardholder does not redeem them.');
    rules.push('- POINTS/CASH REDEMPTION BENEFITS ARE NOT CREDITS: If using a benefit requires the cardholder to SPEND their own earned points or proprietary cash (e.g., "redeem Bilt Cash", "use points toward"), it is a PERK. Credits must be FREE to the cardholder.');
    rules.push('- Requirements: Use UPPERCASE for critical requirements (e.g., "MUST BE BOOKED ON CHASE TRAVEL PORTAL")');
    rules.push('- SubCategory: Leave as empty string "" if no subcategory applies. IMPORTANT: Use "hotels" (with s), NOT "hotel"');
  }
  
  if (type === 'multiplier') {
    rules.push('- DO NOT include id, ReferenceCardId, LastUpdated, EffectiveFrom, or EffectiveTo fields (auto-generated)');
    rules.push('- Name: Title Case category name (e.g., "Dining", "Travel", "Flights"). Do NOT include multiplier value in Name. No trademark/copyright symbols -- basic keyboard characters only');
    rules.push('- Multiplier: number type (not string), e.g., 3 for 3X, 1.5 for 1.5%');
    rules.push('- Category: Use "travel" for issuer travel portal purchases, with SubCategory "portal"');
    rules.push('- Description: Explain what purchases qualify, not just repeat the category name');
    rules.push('- SubCategory: Leave as empty string "" if no subcategory applies. IMPORTANT: Use "hotels" (with s), NOT "hotel"');
    rules.push('- Requirements: Use UPPERCASE for portal requirements');
    rules.push('- TOP N CATEGORIES: When a card offers a bonus on the cardholder\'s "top N spending categories" (e.g., "3X on top 2 categories"), create N SEPARATE selectable multipliers labeled "Top Category #1", "Top Category #2", etc. Each with multiplierType: "selectable" and the same allowedCategories list');
  }
  
  if (type === 'perk') {
    rules.push('- DO NOT include id, ReferenceCardId, LastUpdated, EffectiveFrom, or EffectiveTo fields (auto-generated)');
    rules.push('- Title: Title Case (e.g., "Priority Pass Select", "Global Entry Credit"). No trademark/copyright symbols -- basic keyboard characters only');
    rules.push('- Description: Required - explain what the perk provides');
    rules.push('- Details: Include coverage limits for insurance perks (e.g., "Up to $500 per claim")');
    rules.push('- SubCategory: Leave as empty string "" if no subcategory applies. IMPORTANT: Use "hotels" (with s), NOT "hotel"');
    rules.push('- MULTI-YEAR CADENCE: Benefits with cadence >1 year (e.g., TSA/Global Entry every 4 years) are PERKS, even if they have a dollar value. Use Category="travel", SubCategory="tsa"');
    rules.push('- For lounge access: Category="travel", SubCategory="lounge access"');
    rules.push('- For hotel programs/status: Category="travel", SubCategory="hotels" (MUST include the s)');
    rules.push('- For streaming/entertainment: Category="general", SubCategory="entertainment" is acceptable');
    rules.push('- PORTAL BOOKING: When perk requires booking through issuer/network service (Visa Luxury Hotel Collection, Amex Travel, Chase Travel, etc.), use Category="travel", SubCategory="portal"');
    rules.push('- SEPARATION: Do NOT include benefits that clearly belong in Credits (redeemable statement credits, dollar-value benefits, trackable passes/vouchers) or Multipliers (earning rates like "3X on dining", "2% back on groceries"). Multipliers are NEVER perks. If unsure between credit and perk, include it (better to duplicate than miss)');
  }

  if (type === 'rotating-categories') {
    rules.push('- Output must be a JSON ARRAY of schedule entry objects');
    rules.push('- category: lowercase string (e.g., "dining", "gas", "shopping")');
    rules.push('- subCategory: lowercase string or empty string "" if none');
    rules.push('- periodType: must be one of "quarter", "month", "half_year", "year"');
    rules.push('- periodValue: required for quarter (1-4), month (1-12), half_year (1-2); omit for year');
    rules.push('- year: number (e.g., 2025)');
    rules.push('- title: REQUIRED - human-readable display name (e.g., "Amazon.com purchases", NOT just "shopping")');
  }

  return '## Critical Field Rules\n\n' + rules.join('\n');
}

/**
 * Loads and condenses schema rules for a specific type
 */
export function getCondensedRules(type: SchemaRuleType): string {
  // Return cached version if available
  if (rulesCache[type]) {
    return rulesCache[type];
  }
  
  const filePath = path.join(RULES_DIR, FILE_MAP[type]);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const sections: string[] = [];
    
    // 1. What Qualifies / What Does NOT Qualify
    const qualificationRules = extractQualificationRules(content);
    if (qualificationRules) {
      sections.push(qualificationRules);
    }
    
    // 2. Critical Field Rules (type-specific)
    sections.push(extractCriticalFieldRules(content, type));
    
    // 3. Common Mistakes to Avoid
    const mistakes = extractCommonMistakes(content);
    if (mistakes) {
      sections.push(mistakes);
    }
    
    // 4. One Complete Example
    const example = extractOneExample(content);
    if (example) {
      sections.push(example);
    }
    
    const condensed = sections.join('\n\n---\n\n');
    
    // Cache the result
    rulesCache[type] = condensed;
    
    return condensed;
  } catch (error) {
    console.error(`Failed to load schema rules for ${type}:`, error);
    return '';
  }
}

/**
 * Clears the rules cache (useful for testing)
 */
export function clearRulesCache(): void {
  Object.keys(rulesCache).forEach(key => delete rulesCache[key]);
}
