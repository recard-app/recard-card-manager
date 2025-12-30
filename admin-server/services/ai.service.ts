import { GoogleGenAI } from '@google/genai';
import { getCondensedRules } from './schema-rules.service';
import {
  AI_CARD_SCHEMA,
  AI_CREDIT_SCHEMA,
  AI_PERK_SCHEMA,
  AI_MULTIPLIER_SCHEMA,
} from '../constants/ai-response-schema';

// Types
export type GenerationType = 'card' | 'credit' | 'perk' | 'multiplier';

export interface GeneratedField {
  key: string;
  label: string;
  value: string | number | null;
}

export interface GeneratedItem {
  fields: GeneratedField[];
  json: Record<string, unknown>;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerationResult {
  items: GeneratedItem[];
  modelUsed: string;
  tokenUsage?: TokenUsage;
}

// Internal type for parsed response before adding model info
interface ParsedResponse {
  items: GeneratedItem[];
}

export interface GenerateParams {
  rawData: string;
  generationType: GenerationType;
  batchMode?: boolean;
  refinementPrompt?: string;
  previousOutput?: Record<string, unknown> | Record<string, unknown>[];
  model?: string; // Optional model override
}

// Model constants - exported for validation
export const MODELS = {
  GEMINI_3_PRO_PREVIEW: 'gemini-3-pro-preview',
  GEMINI_25_PRO: 'gemini-2.5-pro',
  GEMINI_3_FLASH_PREVIEW: 'gemini-3-flash-preview',
};

export const VALID_MODELS = Object.values(MODELS);

/**
 * Determines which Gemini models to try based on generation parameters.
 * Returns an array of models in priority order (first to try, then fallback to Flash).
 */
function getModelsForGeneration(type: GenerationType, batchMode: boolean, isRefinement: boolean, selectedModel?: string): string[] {
  // All refinements use Flash only
  if (isRefinement) return [MODELS.GEMINI_3_FLASH_PREVIEW];

  // If user selected a specific model, use it with Flash as fallback
  if (selectedModel && VALID_MODELS.includes(selectedModel)) {
    if (selectedModel === MODELS.GEMINI_3_FLASH_PREVIEW) {
      return [MODELS.GEMINI_3_FLASH_PREVIEW];
    }
    return [selectedModel, MODELS.GEMINI_3_FLASH_PREVIEW];
  }

  // Default: Card details and batch mode use Pro with Flash fallback
  if (type === 'card' || batchMode) {
    return [MODELS.GEMINI_3_PRO_PREVIEW, MODELS.GEMINI_3_FLASH_PREVIEW];
  }

  // Single item uses Flash only
  return [MODELS.GEMINI_3_FLASH_PREVIEW];
}

/**
 * Checks if an error is a rate limit error (429 / RESOURCE_EXHAUSTED)
 */
function isRateLimitError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return message.includes('429') || 
         message.includes('resource_exhausted') || 
         message.includes('too many requests') ||
         message.includes('rate limit');
}

// Schema aliases for prompt generation (imported from ai-response-schema)
const CARD_SCHEMA = AI_CARD_SCHEMA;
const CREDIT_SCHEMA = AI_CREDIT_SCHEMA;
const PERK_SCHEMA = AI_PERK_SCHEMA;
const MULTIPLIER_SCHEMA = AI_MULTIPLIER_SCHEMA;

const CATEGORIES = {
  travel: ['flights', 'hotels', 'portal', 'lounge access', 'ground transportation', 'car rental', 'tsa'],
  dining: [],
  shopping: ['supermarkets', 'online shopping', 'online grocery', 'drugstores', 'retail', 'department stores'],
  gas: ['gas stations', 'ev charging'],
  entertainment: ['streaming'],
  transportation: ['rideshare'],
  transit: [],
  general: ['entertainment'],
  portal: [],
  rent: [],
  insurance: ['purchase', 'travel', 'car rental', 'cell phone protection', 'rental car protection'],
  'rewards boost': [],
};

function getSystemPrompt(generationType: GenerationType, batchMode: boolean = false): string {
  const baseInstructions = `You are a credit card data extraction assistant. 

CRITICAL JSON REQUIREMENTS:
1. Output ONLY valid, complete JSON - no text before or after
2. Do NOT wrap JSON in code blocks, backticks, or markdown
3. Do NOT include explanations, comments, or any prose text
4. Ensure ALL strings are properly closed with quotes
5. Ensure ALL objects and arrays are properly closed with braces/brackets
6. The response must be parseable by JSON.parse() without any modifications

Your response should start with { and end with } (or [ and ] for arrays). Nothing else.`;

  const categoryInfo = `
Available categories and subcategories:
${Object.entries(CATEGORIES).map(([cat, subs]) => `- ${cat}${subs.length > 0 ? `: ${subs.join(', ')}` : ''}`).join('\n')}
`;

  // Load condensed schema rules for this generation type
  const schemaRules = getCondensedRules(generationType);

  switch (generationType) {
    case 'card':
      return `${baseInstructions}

Extract credit card details and output a JSON object with the following schema:
${JSON.stringify(CARD_SCHEMA, null, 2)}

${categoryInfo}

=== COLOR SELECTION INSTRUCTIONS ===
For CardPrimaryColor and CardSecondaryColor, use your best guess of what the physical credit card looks like in real life:
- **CardPrimaryColor**: The base/background color that covers the MAJORITY of the card surface. This is the dominant color you see when looking at the card.
- **CardSecondaryColor**: The accent color used for details, logos, text, or decorative elements on the card. This is a secondary/highlight color.

Examples:
- Chase Sapphire Reserve: Primary #0A1F2E (dark navy), Secondary #A8C7DA (light blue accent)
- American Express Platinum: Primary #B1B3B3 (silver), Secondary #FFFFFF (white text)
- American Express Gold: Primary #D4AF37 (gold), Secondary #1A1A1A (black accents)
- Capital One Venture X: Primary #1A1A1A (black), Secondary #E31837 (red accents)
=====================================

=== SCHEMA RULES (FOLLOW EXACTLY) ===
${schemaRules}
=====================================`;

    case 'credit':
      if (batchMode) {
        return `${baseInstructions}

Extract ONLY credits/statement credits from the data and output a JSON ARRAY of objects.
Each object should follow this schema:
${JSON.stringify(CREDIT_SCHEMA, null, 2)}

Output format: JSON array, e.g., [{...}, {...}, {...}]
If no credits are found, return an empty array: []

${categoryInfo}

=== SCHEMA RULES (FOLLOW EXACTLY) ===
${schemaRules}
=====================================`;
      }
      return `${baseInstructions}

Extract credit/benefit details and output a JSON object with the following schema:
${JSON.stringify(CREDIT_SCHEMA, null, 2)}

${categoryInfo}

=== SCHEMA RULES (FOLLOW EXACTLY) ===
${schemaRules}
=====================================`;

    case 'perk':
      if (batchMode) {
        return `${baseInstructions}

Extract ONLY perks/benefits from the data and output a JSON ARRAY of objects.
Each object should follow this schema:
${JSON.stringify(PERK_SCHEMA, null, 2)}

Output format: JSON array, e.g., [{...}, {...}, {...}]
If no perks are found, return an empty array: []

${categoryInfo}

=== PERKS TO EXCLUDE (DO NOT CREATE) ===
Do NOT create perks for the following - they are either redundant or standard for all cards:
- No Foreign Transaction Fee (already in Card Details ForeignExchangeFee field)
- Unauthorized Charge Protection / Zero Liability / Fraud Protection (standard for all cards by law)
- Purchase Protection (too common/standard)
- Extended Warranty Protection (too common/standard)
- 24/7 Customer Support / Customer Service (standard for all cards)
- Return Protection (too common/standard)
- Price Protection (too common/standard)

If the input text mentions these, SKIP them entirely.
=====================================

=== SCHEMA RULES (FOLLOW EXACTLY) ===
${schemaRules}
=====================================`;
      }
      return `${baseInstructions}

Extract perk/benefit details and output a JSON object with the following schema:
${JSON.stringify(PERK_SCHEMA, null, 2)}

${categoryInfo}

=== PERKS TO EXCLUDE (DO NOT CREATE) ===
Do NOT create perks for the following - they are either redundant or standard for all cards:
- No Foreign Transaction Fee (already in Card Details ForeignExchangeFee field)
- Unauthorized Charge Protection / Zero Liability / Fraud Protection (standard for all cards by law)
- Purchase Protection (too common/standard)
- Extended Warranty Protection (too common/standard)
- 24/7 Customer Support / Customer Service (standard for all cards)
- Return Protection (too common/standard)
- Price Protection (too common/standard)

If the input text mentions these, SKIP them entirely.
=====================================

=== SCHEMA RULES (FOLLOW EXACTLY) ===
${schemaRules}
=====================================`;

    case 'multiplier':
      if (batchMode) {
        return `${baseInstructions}

Extract ONLY multipliers/rewards rates from the data and output a JSON ARRAY of objects.
Each object should follow this schema:
${JSON.stringify(MULTIPLIER_SCHEMA, null, 2)}

Output format: JSON array, e.g., [{...}, {...}, {...}]
If no multipliers are found, return an empty array: []

${categoryInfo}

=== PORTAL BOOKING CATEGORIZATION ===
IMPORTANT: When a multiplier requires booking through a card issuer's travel portal (Chase Travel, Amex Travel, Capital One Travel, etc.), use:
- Category: "travel" (this is the MAIN category - NOT "portal")
- SubCategory: "portal" (this specifies it's portal-booked travel)

Look for requirements like "BOOK THROUGH AMEXTRAVEL.COM", "MUST BE BOOKED ON CHASE TRAVEL PORTAL", etc.
These are TRAVEL purchases made through a portal, so Category must be "travel" with SubCategory "portal".
=====================================

=== ROTATING MULTIPLIER SCHEDULE ENTRIES ===
When multiplierType is "rotating", you MUST include a "scheduleEntries" array with the current quarter/period categories.

Each scheduleEntry object must have:
- category: string (e.g., "shopping", "dining", "gas")
- subCategory: string (e.g., "amazon.com", "gas stations", or "" if none)
- periodType: "quarter" | "month" | "half_year" | "year"
- periodValue: number (1-4 for quarter, 1-12 for month, 1-2 for half_year)
- year: number (e.g., 2025)
- title: string (REQUIRED) - A descriptive name for display

IMPORTANT: The "title" field is REQUIRED and should be human-readable. Do NOT just repeat the category name.
Good examples: "Amazon.com purchases", "Grocery stores & supermarkets", "Streaming services", "Dining & Restaurants"
Bad examples: "shopping", "dining" (too generic)

Example rotating multiplier with schedule:
{
  "Name": "Rotating 5% Categories",
  "Category": "",
  "SubCategory": "",
  "Description": "Earn 5% cash back on bonus categories that rotate each quarter.",
  "Multiplier": 5,
  "Requirements": "MUST ACTIVATE EACH QUARTER",
  "Details": "Up to $1,500 in combined purchases per quarter",
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
  ]
}

Note: Multiple categories can exist for the same period (e.g., Q1 2025 with both Amazon and Dining).
=====================================

=== SCHEMA RULES (FOLLOW EXACTLY) ===
${schemaRules}
=====================================`;
      }
      return `${baseInstructions}

Extract multiplier/rewards rate details and output a JSON object with the following schema:
${JSON.stringify(MULTIPLIER_SCHEMA, null, 2)}

${categoryInfo}

=== PORTAL BOOKING CATEGORIZATION ===
IMPORTANT: When a multiplier requires booking through a card issuer's travel portal (Chase Travel, Amex Travel, Capital One Travel, etc.), use:
- Category: "travel" (this is the MAIN category - NOT "portal")
- SubCategory: "portal" (this specifies it's portal-booked travel)

Look for requirements like "BOOK THROUGH AMEXTRAVEL.COM", "MUST BE BOOKED ON CHASE TRAVEL PORTAL", etc.
These are TRAVEL purchases made through a portal, so Category must be "travel" with SubCategory "portal".
=====================================

=== ROTATING MULTIPLIER SCHEDULE ENTRIES ===
When multiplierType is "rotating", you MUST include a "scheduleEntries" array with the current quarter/period categories.

Each scheduleEntry object must have:
- category: string (e.g., "shopping", "dining", "gas")
- subCategory: string (e.g., "amazon.com", "gas stations", or "" if none)
- periodType: "quarter" | "month" | "half_year" | "year"
- periodValue: number (1-4 for quarter, 1-12 for month, 1-2 for half_year)
- year: number (e.g., 2025)
- title: string (REQUIRED) - A descriptive name for display

IMPORTANT: The "title" field is REQUIRED and should be human-readable. Do NOT just repeat the category name.
Good examples: "Amazon.com purchases", "Grocery stores & supermarkets", "Streaming services", "Dining & Restaurants"
Bad examples: "shopping", "dining" (too generic)

Example rotating multiplier with schedule:
{
  "Name": "Rotating 5% Categories",
  "Category": "",
  "SubCategory": "",
  "Description": "Earn 5% cash back on bonus categories that rotate each quarter.",
  "Multiplier": 5,
  "Requirements": "MUST ACTIVATE EACH QUARTER",
  "Details": "Up to $1,500 in combined purchases per quarter",
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
  ]
}

Note: Multiple categories can exist for the same period (e.g., Q1 2025 with both Amazon and Dining).
=====================================

=== SCHEMA RULES (FOLLOW EXACTLY) ===
${schemaRules}
=====================================`;

    default:
      return baseInstructions;
  }
}

function schemaToFields(generationType: GenerationType): GeneratedField[] {
  const schema = generationType === 'card' ? CARD_SCHEMA :
                 generationType === 'credit' ? CREDIT_SCHEMA :
                 generationType === 'perk' ? PERK_SCHEMA :
                 MULTIPLIER_SCHEMA;

  return Object.entries(schema).map(([key, description]) => ({
    key,
    label: key.replace(/([A-Z])/g, ' $1').trim(),
    value: typeof description === 'string' ? description : null,
  }));
}

function jsonToFields(json: Record<string, unknown>, generationType: GenerationType): GeneratedField[] {
  const sourceObj = json;
  
  const labelMap: Record<string, string> = {
    id: 'ID',
    VersionName: 'Version Name',
    ReferenceCardId: 'Reference Card ID',
    IsActive: 'Is Active',
    CardName: 'Card Name',
    CardIssuer: 'Card Issuer',
    CardNetwork: 'Card Network',
    CardDetails: 'Card Details',
    CardImage: 'Card Image',
    CardPrimaryColor: 'Primary Color',
    CardSecondaryColor: 'Secondary Color',
    effectiveFrom: 'Effective From',
    effectiveTo: 'Effective To',
    lastUpdated: 'Last Updated',
    AnnualFee: 'Annual Fee',
    ForeignExchangeFee: 'Foreign Exchange Fee',
    ForeignExchangeFeePercentage: 'FX Fee Percentage',
    RewardsCurrency: 'Rewards Currency',
    PointsPerDollar: 'Points Per Dollar',
    Title: 'Title',
    Category: 'Category',
    SubCategory: 'Subcategory',
    Description: 'Description',
    Value: 'Value',
    TimePeriod: 'Time Period',
    Requirements: 'Requirements',
    Details: 'Details',
    Name: 'Name',
    Multiplier: 'Multiplier',
    EffectiveFrom: 'Effective From',
    EffectiveTo: 'Effective To',
    LastUpdated: 'Last Updated',
  };

  // Filter out complex objects/arrays for the fields view
  return Object.entries(sourceObj)
    .filter(([_, value]) => !Array.isArray(value) && typeof value !== 'object')
    .map(([key, value]) => ({
      key,
      label: labelMap[key] || key.replace(/([A-Z])/g, ' $1').trim(),
      value: value as string | number | null,
    }));
}

/**
 * Attempts to fix common JSON issues like unterminated strings
 */
function fixJsonIssues(jsonStr: string): string {
  // Remove trailing commas before closing braces/brackets
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
  
  // Try to close unterminated strings (look for unclosed quotes)
  // This is a heuristic - find strings that start with " but don't have a closing "
  // within reasonable distance
  const lines = jsonStr.split('\n');
  const fixedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const quoteCount = (line.match(/"/g) || []).length;
    
    // If odd number of quotes, might be unterminated
    if (quoteCount % 2 === 1) {
      // Check if we're in a string that's not closed
      const lastQuoteIndex = line.lastIndexOf('"');
      const afterLastQuote = line.substring(lastQuoteIndex + 1);
      
      // If there's content after the last quote that looks like it should be in quotes
      if (afterLastQuote.trim() && !afterLastQuote.includes('"') && !afterLastQuote.includes(',')) {
        // Try to close the string
        line = line.trim();
        if (!line.endsWith('"') && !line.endsWith('",')) {
          line = line + '"';
        }
      }
    }
    
    fixedLines.push(line);
  }
  
  return fixedLines.join('\n');
}

/**
 * Extracts JSON from a text response that might contain additional prose.
 * Handles cases where the AI includes explanatory text around the JSON.
 */
function extractJsonFromText(text: string): string {
  // First, try to parse as-is (ideal case)
  try {
    JSON.parse(text);
    return text;
  } catch {
    // Continue with extraction
  }

  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  
  // Try to find JSON object or array in the text
  const jsonObjectMatch = cleaned.match(/\{[\s\S]*\}/);
  const jsonArrayMatch = cleaned.match(/\[[\s\S]*\]/);
  
  // Prefer object match for our use case (most responses are objects)
  if (jsonObjectMatch) {
    // Find the outermost balanced braces, accounting for strings
    const match = jsonObjectMatch[0];
    let depth = 0;
    let start = -1;
    let end = -1;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < match.length; i++) {
      const char = match[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') {
          if (depth === 0) start = i;
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            end = i + 1;
            break;
          }
        }
      }
    }
    
    if (start !== -1 && end !== -1) {
      let extracted = match.slice(start, end);
      
      // Try to fix common issues
      extracted = fixJsonIssues(extracted);
      
      try {
        JSON.parse(extracted);
        return extracted;
      } catch (parseError) {
        // If still failing, try to truncate at the last complete field
        // This handles cases where the response was cut off mid-field
        const lastCompleteField = extracted.lastIndexOf('",');
        if (lastCompleteField > 0) {
          // Try to close the JSON object
          const truncated = extracted.substring(0, lastCompleteField + 2);
          // Find the last complete object level
          let truncatedDepth = 0;
          let truncatedEnd = truncated.length;
          for (let i = 0; i < truncated.length; i++) {
            if (truncated[i] === '{') truncatedDepth++;
            if (truncated[i] === '}') truncatedDepth--;
          }
          // Add closing braces if needed
          while (truncatedDepth > 0) {
            truncatedEnd = truncated.lastIndexOf('}');
            if (truncatedEnd === -1) break;
            truncatedDepth--;
          }
          if (truncatedEnd < truncated.length) {
            const fixed = truncated.substring(0, truncatedEnd + 1) + '}'.repeat(truncatedDepth);
            try {
              JSON.parse(fixed);
              return fixed;
            } catch {
              // Continue to next attempt
            }
          }
        }
      }
    }
    
    // Fallback: try the full match with fixes
    try {
      const fixed = fixJsonIssues(match);
      JSON.parse(fixed);
      return fixed;
    } catch {
      // Continue
    }
  }
  
  if (jsonArrayMatch) {
    try {
      const fixed = fixJsonIssues(jsonArrayMatch[0]);
      JSON.parse(fixed);
      return fixed;
    } catch {
      // Continue
    }
  }
  
  // Last resort: return cleaned text and let the caller handle the error
  return cleaned.trim();
}

function parseAndValidateResponse(text: string, generationType: GenerationType, batchMode: boolean): ParsedResponse {
  const extracted = extractJsonFromText(text);
  
  try {
    const json = JSON.parse(extracted);
    
    // Handle batch mode - response should be an array
    if (batchMode && Array.isArray(json)) {
      const items: GeneratedItem[] = json.map((item: Record<string, unknown>) => ({
        fields: jsonToFields(item, generationType),
        json: item,
      }));
      return { items };
    }
    
    // Single item mode - wrap in array
    const fields = jsonToFields(json, generationType);
    return { items: [{ fields, json }] };
  } catch (error) {
    // Log more context for debugging
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const preview = extracted.substring(0, 500);
    const errorPosition = errorMsg.match(/position (\d+)/);
    
    if (errorPosition) {
      const pos = parseInt(errorPosition[1]);
      const contextStart = Math.max(0, pos - 100);
      const contextEnd = Math.min(extracted.length, pos + 100);
      console.error('Failed to parse JSON at position', pos);
      console.error('Context:', extracted.substring(contextStart, contextEnd));
    } else {
      console.error('Failed to parse JSON:', preview);
    }
    
    throw new Error(`Failed to parse AI response as JSON: ${errorMsg}`);
  }
}

export async function generateData(params: GenerateParams): Promise<GenerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const ai = new GoogleGenAI({ apiKey });
  const isRefinement = !!(params.refinementPrompt && params.previousOutput);
  // If previousOutput is an array, we're refining batch results
  const isBatchRefinement = isRefinement && Array.isArray(params.previousOutput);
  const batchMode = isBatchRefinement || (params.batchMode ?? false);
  const modelsToTry = getModelsForGeneration(params.generationType, batchMode, isRefinement, params.model);

  const systemPrompt = getSystemPrompt(params.generationType, batchMode);
  
  let userPrompt = `Extract and structure the following credit card information:\n\n${params.rawData}`;
  
  if (params.refinementPrompt && params.previousOutput) {
    const outputFormat = Array.isArray(params.previousOutput) 
      ? 'Output ONLY the updated JSON array.'
      : 'Output ONLY the updated JSON object.';
    userPrompt = `Previous output:\n${JSON.stringify(params.previousOutput, null, 2)}\n\nRefinement instructions: ${params.refinementPrompt}\n\nPlease update the output according to the refinement instructions. ${outputFormat}`;
  }

  let lastError: Error | null = null;

  // Try each model in order, falling back on rate limit errors
  for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex++) {
    const model = modelsToTry[modelIndex];
    console.log(`Trying model: ${model} (${modelIndex + 1}/${modelsToTry.length})`);

    const maxRetries = 2;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
          ],
          config: {
            temperature: 0.1, // Low temperature for more deterministic JSON output
            topP: 0.8,
            maxOutputTokens: 8192, // Increased for full card data with all credits/perks/multipliers
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error('Empty response from Gemini');
        }

        // Check if response might be truncated (doesn't end with } or ])
        const trimmed = text.trim();
        const mightBeTruncated = !trimmed.endsWith('}') && !trimmed.endsWith(']');
        
        if (mightBeTruncated && attempt === 0) {
          console.warn('Warning: Response might be truncated. Last 100 chars:', trimmed.substring(Math.max(0, trimmed.length - 100)));
        }

        // Log the raw response for debugging (first 500 chars)
        if (attempt === 0) {
          console.log(`Raw Gemini response (${model}) length:`, text.length);
          console.log('Raw Gemini response (first 500 chars):', text.substring(0, 500));
          if (text.length > 500) {
            console.log('Raw Gemini response (last 200 chars):', text.substring(Math.max(0, text.length - 200)));
          }
        }

        const result = parseAndValidateResponse(text, params.generationType, batchMode);

        // Extract token usage from response
        if (response.usageMetadata) {
          console.log('Token usage:', JSON.stringify(response.usageMetadata, null, 2));
        }
        const tokenUsage: TokenUsage | undefined = response.usageMetadata ? {
          inputTokens: response.usageMetadata.promptTokenCount || 0,
          outputTokens: (response.usageMetadata.candidatesTokenCount || 0) + (response.usageMetadata.thoughtsTokenCount || 0),
        } : undefined;

        return { ...result, modelUsed: model, tokenUsage };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Gemini generation error (${model}):`, lastError.message);
        
        // Check if this is a rate limit error - if so, try the next model
        if (isRateLimitError(lastError)) {
          console.warn(`Rate limit hit for ${model}, trying fallback model...`);
          break; // Exit retry loop, try next model
        }
        
        // Only retry on JSON parsing errors
        if (!lastError.message.includes('JSON') && !lastError.message.includes('parse')) {
          throw lastError;
        }
        
        if (attempt < maxRetries - 1) {
          // Add a small delay before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  }

  throw lastError || new Error('Failed to generate data after trying all models');
}
