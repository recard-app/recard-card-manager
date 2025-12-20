import { GoogleGenAI } from '@google/genai';

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

export interface GenerationResult {
  items: GeneratedItem[];
  modelUsed: string;
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
}

// Model constants
const MODELS = {
  GEMINI_3_PRO_PREVIEW: 'gemini-3-pro-preview',
  GEMINI_25_PRO: 'gemini-2.5-pro',
  GEMINI_3_FLASH_PREVIEW: 'gemini-3-flash-preview',
};

/**
 * Determines which Gemini models to try based on generation parameters.
 * Returns an array of models in priority order (first to try, then fallbacks).
 */
function getModelsForGeneration(type: GenerationType, batchMode: boolean, isRefinement: boolean): string[] {
  // All refinements use Flash (no fallback needed for Flash)
  if (isRefinement) return [MODELS.GEMINI_3_FLASH_PREVIEW];
  
  // Card details use Pro - try Gemini 3 Pro first, fall back to 2.5 Pro
  if (type === 'card') return [MODELS.GEMINI_3_PRO_PREVIEW, MODELS.GEMINI_25_PRO];
  
  // Batch mode uses Pro for better quality - try Gemini 3 Pro first, fall back to 2.5 Pro
  if (batchMode) return [MODELS.GEMINI_3_PRO_PREVIEW, MODELS.GEMINI_25_PRO];
  
  // Single item uses Flash (no fallback needed for Flash)
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

// Sample data structures for prompts
const CARD_SCHEMA = {
  id: 'string (kebab-case, e.g., chase-sapphire-preferred)',
  VersionName: 'string (e.g., "2024 Version")',
  ReferenceCardId: 'string (same as id for base cards)',
  IsActive: 'boolean',
  CardName: 'string',
  CardIssuer: 'string (e.g., "Chase", "American Express", "Capital One")',
  CardNetwork: 'string (e.g., "Visa", "Mastercard", "Amex")',
  CardDetails: 'string (brief description)',
  CardImage: 'string (URL or empty)',
  CardPrimaryColor: 'string (hex color, e.g., "#1A1F71")',
  CardSecondaryColor: 'string (hex color)',
  effectiveFrom: 'ISO date string',
  effectiveTo: 'ISO date string',
  lastUpdated: 'ISO date string',
  AnnualFee: 'number or null',
  ForeignExchangeFee: 'string (e.g., "3%" or "None")',
  ForeignExchangeFeePercentage: 'number or null',
  RewardsCurrency: 'string (e.g., "Ultimate Rewards", "Membership Rewards")',
  PointsPerDollar: 'number or null',
  Perks: '[{id: "perk-id"}]',
  Credits: '[{id: "credit-id"}]',
  Multipliers: '[{id: "multiplier-id"}]',
};

const CREDIT_SCHEMA = {
  id: 'string (kebab-case)',
  ReferenceCardId: 'string',
  Title: 'string',
  Category: 'string (e.g., "travel", "dining", "entertainment", "shopping")',
  SubCategory: 'string (e.g., "streaming", "hotels", "flights")',
  Description: 'string',
  Value: 'string (e.g., "$200", "$100/year")',
  TimePeriod: 'string (e.g., "annual", "monthly", "quarterly")',
  Requirements: 'string',
  Details: 'string',
  EffectiveFrom: 'ISO date string',
  EffectiveTo: 'ISO date string',
  LastUpdated: 'ISO date string',
};

const PERK_SCHEMA = {
  id: 'string (kebab-case)',
  ReferenceCardId: 'string',
  Title: 'string',
  Category: 'string (e.g., "travel", "insurance", "shopping")',
  SubCategory: 'string',
  Description: 'string',
  Requirements: 'string',
  Details: 'string',
  EffectiveFrom: 'ISO date string',
  EffectiveTo: 'ISO date string',
  LastUpdated: 'ISO date string',
};

const MULTIPLIER_SCHEMA = {
  id: 'string (kebab-case)',
  ReferenceCardId: 'string',
  Name: 'string (e.g., "3X on Dining")',
  Category: 'string',
  SubCategory: 'string',
  Description: 'string',
  Multiplier: 'number (e.g., 3 for 3X points)',
  Requirements: 'string',
  Details: 'string',
  EffectiveFrom: 'ISO date string',
  EffectiveTo: 'ISO date string',
  LastUpdated: 'ISO date string',
};

const CATEGORIES = {
  travel: ['flights', 'hotels', 'portal', 'lounge access', 'ground transportation', 'car rental', 'tsa'],
  dining: [],
  shopping: ['supermarkets', 'online shopping', 'online grocery', 'drugstores', 'retail'],
  gas: ['gas stations', 'ev charging'],
  entertainment: ['streaming'],
  transportation: ['rideshare'],
  Transit: [],
  general: [],
  'custom category': [],
  insurance: ['purchase', 'travel', 'car rental', 'cell phone protection', 'rental car protection'],
  rent: [],
  'Rewards Boost': [],
};

function getSystemPrompt(generationType: GenerationType, batchMode: boolean = false): string {
  const baseInstructions = `You are a credit card data extraction assistant. 

CRITICAL REQUIREMENTS:
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

  switch (generationType) {
    case 'card':
      return `${baseInstructions}

Extract credit card details and output a JSON object with the following schema:
${JSON.stringify(CARD_SCHEMA, null, 2)}

Important notes:
- Generate a unique kebab-case id from the card name (e.g., "chase-sapphire-preferred")
- ReferenceCardId should be the same as id for base cards
- Use current date for lastUpdated
- Set effectiveFrom to current date and effectiveTo to end of next year
- IsActive should be true by default
- For colors, try to match the card's actual brand colors if known
- Leave Perks, Credits, and Multipliers as empty arrays - they will be added separately

${categoryInfo}`;

    case 'credit':
      if (batchMode) {
        return `${baseInstructions}

Extract ONLY credits/statement credits from the data and output a JSON ARRAY of objects. Each object should follow this schema:
${JSON.stringify(CREDIT_SCHEMA, null, 2)}

CRITICAL - ONLY EXTRACT CREDITS:
- A credit is a statement credit, reimbursement, or dollar-value benefit (e.g., "$200 travel credit", "$10/month streaming credit")
- Do NOT include multipliers/rewards rates (like "3X on dining") - those are NOT credits
- Do NOT include perks/benefits without a specific dollar value (like "lounge access") - those are NOT credits
- If something doesn't clearly fit as a credit, SKIP IT entirely
- If no credits are found, return an empty array: []

Important notes:
- Output a JSON array, e.g., [{...}, {...}, {...}]
- Generate a descriptive kebab-case id for each credit (e.g., "dining-credit-200-annual")
- Value should include the dollar sign and amount
- TimePeriod should be: annual, monthly, quarterly, or one-time
- Match Category and SubCategory to available options

${categoryInfo}`;
      }
      return `${baseInstructions}

Extract credit/benefit details and output a JSON object with the following schema:
${JSON.stringify(CREDIT_SCHEMA, null, 2)}

Important notes:
- Generate a descriptive kebab-case id (e.g., "dining-credit-200-annual")
- Value should include the dollar sign and amount
- TimePeriod should be: annual, monthly, quarterly, or one-time
- Match Category and SubCategory to available options

${categoryInfo}`;

    case 'perk':
      if (batchMode) {
        return `${baseInstructions}

Extract ONLY perks/benefits from the data and output a JSON ARRAY of objects. Each object should follow this schema:
${JSON.stringify(PERK_SCHEMA, null, 2)}

CRITICAL - ONLY EXTRACT PERKS:
- A perk is a non-monetary benefit or feature (e.g., "lounge access", "travel insurance", "priority boarding", "concierge service")
- Do NOT include multipliers/rewards rates (like "3X on dining") - those are NOT perks
- Do NOT include statement credits with dollar values (like "$200 travel credit") - those are credits, NOT perks
- If something doesn't clearly fit as a perk, SKIP IT entirely
- If no perks are found, return an empty array: []

Important notes:
- Output a JSON array, e.g., [{...}, {...}, {...}]
- Generate a descriptive kebab-case id for each perk (e.g., "priority-pass-lounge-access")
- Match Category and SubCategory to available options

${categoryInfo}`;
      }
      return `${baseInstructions}

Extract perk/benefit details and output a JSON object with the following schema:
${JSON.stringify(PERK_SCHEMA, null, 2)}

Important notes:
- Generate a descriptive kebab-case id (e.g., "priority-pass-lounge-access")
- Match Category and SubCategory to available options

${categoryInfo}`;

    case 'multiplier':
      if (batchMode) {
        return `${baseInstructions}

Extract ONLY multipliers/rewards rates from the data and output a JSON ARRAY of objects. Each object should follow this schema:
${JSON.stringify(MULTIPLIER_SCHEMA, null, 2)}

CRITICAL - ONLY EXTRACT MULTIPLIERS:
- A multiplier is a rewards rate or points multiplier (e.g., "3X on dining", "5X on flights", "2% cashback on groceries")
- Do NOT include statement credits with dollar values (like "$200 travel credit") - those are credits, NOT multipliers
- Do NOT include perks/benefits (like "lounge access") - those are NOT multipliers
- If something doesn't clearly fit as a multiplier/rewards rate, SKIP IT entirely
- If no multipliers are found, return an empty array: []

Important notes:
- Output a JSON array, e.g., [{...}, {...}, {...}]
- Generate a descriptive kebab-case id for each multiplier (e.g., "3x-dining")
- Multiplier should be a number (e.g., 3 for 3X, 5 for 5X)
- Name should be descriptive (e.g., "3X on Dining", "5X on Flights")
- Match Category and SubCategory to available options

${categoryInfo}`;
      }
      return `${baseInstructions}

Extract multiplier/rewards rate details and output a JSON object with the following schema:
${JSON.stringify(MULTIPLIER_SCHEMA, null, 2)}

Important notes:
- Generate a descriptive kebab-case id (e.g., "3x-dining")
- Multiplier should be a number (e.g., 3 for 3X, 5 for 5X)
- Name should be descriptive (e.g., "3X on Dining", "5X on Flights")
- Match Category and SubCategory to available options

${categoryInfo}`;

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
  const modelsToTry = getModelsForGeneration(params.generationType, batchMode, isRefinement);

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
        return { ...result, modelUsed: model };
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
