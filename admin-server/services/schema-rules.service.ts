import fs from 'fs';
import path from 'path';

export type SchemaRuleType = 'card' | 'credit' | 'perk' | 'multiplier';

const RULES_DIR = path.resolve(__dirname, '../constants/schema-rules');

// Cache for condensed rules
const rulesCache: Record<string, string> = {};

const FILE_MAP: Record<SchemaRuleType, string> = {
  card: 'CreditCardSchemaRulesCardDetails.md',
  credit: 'CreditCardSchemaRulesCredit.md',
  perk: 'CreditCardSchemaRulesPerk.md',
  multiplier: 'CreditCardSchemaRulesMultiplier.md',
};

/**
 * Extracts "What Qualifies" and "What Does NOT Qualify" sections
 */
function extractQualificationRules(content: string): string {
  const qualifies = content.match(/### What Qualifies[\s\S]*?(?=###|---)/);
  const notQualifies = content.match(/### What Does NOT Qualify[\s\S]*?(?=###|---)/);
  
  let result = '';
  if (qualifies) result += qualifies[0].trim() + '\n\n';
  if (notQualifies) result += notQualifies[0].trim();
  
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
    rules.push('- CardName: Format is "Issuer CardName" (e.g., "American Express Gold", "Chase Sapphire Preferred"). Do NOT include the word "Card" at the end');
    rules.push('- AnnualFee: number (not string), no $ sign');
    rules.push('- ForeignExchangeFee: Use "None" if no fee, or "Applied on international purchases" if there is a fee');
    rules.push('- ForeignExchangeFeePercentage: number (0 for no fee)');
    rules.push('- RewardsCurrency: lowercase ("points", "miles", "cash back")');
  }
  
  if (type === 'credit') {
    rules.push('- DO NOT include id, ReferenceCardId, LastUpdated, EffectiveFrom, or EffectiveTo fields (auto-generated)');
    rules.push('- Title: Title Case. Only include $ amount for Annually/Semiannually/Quarterly credits, NOT for Monthly');
    rules.push('- Value: Numeric string WITHOUT $ sign, PER TIME PERIOD (not annual total)');
    rules.push('- TimePeriod: lowercase only - "monthly" | "quarterly" | "semiannually" | "annually"');
    rules.push('- CADENCE RULE: Credits MUST have a cadence of one year or less. Benefits with cadence >1 year (e.g., every 4 years for TSA/Global Entry) are PERKS, not Credits');
    rules.push('- Requirements: Use UPPERCASE for critical requirements (e.g., "MUST BE BOOKED ON CHASE TRAVEL PORTAL")');
    rules.push('- SubCategory: Leave as empty string "" if no subcategory applies');
  }
  
  if (type === 'multiplier') {
    rules.push('- DO NOT include id, ReferenceCardId, LastUpdated, EffectiveFrom, or EffectiveTo fields (auto-generated)');
    rules.push('- Name: Title Case category name (e.g., "Dining", "Travel", "Flights"). Do NOT include multiplier value in Name');
    rules.push('- Multiplier: number type (not string), e.g., 3 for 3X, 1.5 for 1.5%');
    rules.push('- Category: Use "portal" for issuer travel portal purchases (not "travel")');
    rules.push('- Description: Explain what purchases qualify, not just repeat the category name');
    rules.push('- SubCategory: Leave as empty string "" if no subcategory applies');
    rules.push('- Requirements: Use UPPERCASE for portal requirements');
  }
  
  if (type === 'perk') {
    rules.push('- DO NOT include id, ReferenceCardId, LastUpdated, EffectiveFrom, or EffectiveTo fields (auto-generated)');
    rules.push('- Title: Title Case (e.g., "Priority Pass Select", "Global Entry Credit")');
    rules.push('- Description: Required - explain what the perk provides');
    rules.push('- Details: Include coverage limits for insurance perks (e.g., "Up to $500 per claim")');
    rules.push('- SubCategory: Leave as empty string "" if no subcategory applies');
    rules.push('- MULTI-YEAR CADENCE: Benefits with cadence >1 year (e.g., TSA/Global Entry every 4 years) are PERKS, even if they have a dollar value. Use Category="travel", SubCategory="tsa"');
    rules.push('- For lounge access: Category="travel", SubCategory="lounge access"');
    rules.push('- For streaming/entertainment: Category="general", SubCategory="entertainment" is acceptable');
    rules.push('- PORTAL BOOKING: When perk requires booking through issuer/network service (Visa Luxury Hotel Collection, Amex Travel, Chase Travel, etc.), use Category="travel", SubCategory="portal"');
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

