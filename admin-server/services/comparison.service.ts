import { GoogleGenAI } from '@google/genai';
import { db } from '../firebase-admin';
import { CreditCardDetails, CardCredit, CardPerk, CardMultiplier } from '../types';
import { getCondensedRules } from './schema-rules.service';
import {
  ComparisonResponse,
  AIComparisonResponse,
  isValidComparisonResponse,
  AI_COMPARISON_SCHEMA,
  CARD_FIELD_LABELS,
} from '../constants/ai-response-schema/comparison-schema';
import {
  AI_CARD_SCHEMA,
  AI_CREDIT_SCHEMA,
  AI_PERK_SCHEMA,
  AI_MULTIPLIER_SCHEMA,
} from '../constants/ai-response-schema';

// Model constants (same as ai.service.ts)
const MODELS = {
  GEMINI_3_PRO_PREVIEW: 'gemini-3-pro-preview',
  GEMINI_25_PRO: 'gemini-2.5-pro',
};

// Request interface
export interface ComparisonRequest {
  referenceCardId: string;
  versionId: string;
  websiteText: string;
}

// Aggregated card data with all components
interface AggregatedCardData {
  cardDetails: CreditCardDetails;
  credits: CardCredit[];
  perks: CardPerk[];
  multipliers: CardMultiplier[];
}

/**
 * Checks if an error is a rate limit error (429 / RESOURCE_EXHAUSTED)
 */
function isRateLimitError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('429') ||
    message.includes('resource_exhausted') ||
    message.includes('too many requests') ||
    message.includes('rate limit')
  );
}

/**
 * Fetches card version details and all associated components
 */
async function aggregateCardData(
  referenceCardId: string,
  versionId: string
): Promise<AggregatedCardData> {
  // Fetch the card version
  const cardDoc = await db.collection('credit_cards_history').doc(versionId).get();
  if (!cardDoc.exists) {
    throw new Error(`Card version ${versionId} not found`);
  }

  const cardDetails = {
    ...cardDoc.data(),
    id: cardDoc.id,
  } as CreditCardDetails;

  // Verify the version belongs to the referenced card
  if (cardDetails.ReferenceCardId !== referenceCardId) {
    throw new Error(`Version ${versionId} does not belong to card ${referenceCardId}`);
  }

  // Fetch all components by ReferenceCardId (components are shared across versions)
  const [creditsSnapshot, perksSnapshot, multipliersSnapshot] = await Promise.all([
    db
      .collection('credit_cards_credits')
      .where('ReferenceCardId', '==', referenceCardId)
      .get(),
    db
      .collection('credit_cards_perks')
      .where('ReferenceCardId', '==', referenceCardId)
      .get(),
    db
      .collection('credit_cards_multipliers')
      .where('ReferenceCardId', '==', referenceCardId)
      .get(),
  ]);

  const credits: CardCredit[] = [];
  creditsSnapshot.forEach((doc) => {
    credits.push({
      ...(doc.data() as CardCredit),
      id: doc.id,
    });
  });

  const perks: CardPerk[] = [];
  perksSnapshot.forEach((doc) => {
    perks.push({
      ...(doc.data() as CardPerk),
      id: doc.id,
    });
  });

  const multipliers: CardMultiplier[] = [];
  multipliersSnapshot.forEach((doc) => {
    multipliers.push({
      ...(doc.data() as CardMultiplier),
      id: doc.id,
    });
  });

  return { cardDetails, credits, perks, multipliers };
}

/**
 * Builds the comparison prompt for the AI
 */
function buildComparisonPrompt(
  aggregatedData: AggregatedCardData,
  websiteText: string
): string {
  const { cardDetails, credits, perks, multipliers } = aggregatedData;

  // Get condensed schema rules for all types
  const cardRules = getCondensedRules('card');
  const creditRules = getCondensedRules('credit');
  const perkRules = getCondensedRules('perk');
  const multiplierRules = getCondensedRules('multiplier');

  // Extract only the relevant card fields for comparison (exclude metadata and custom colors)
  const cardFieldsForComparison = {
    CardName: cardDetails.CardName,
    CardIssuer: cardDetails.CardIssuer,
    CardNetwork: cardDetails.CardNetwork,
    CardDetails: cardDetails.CardDetails,
    AnnualFee: cardDetails.AnnualFee,
    ForeignExchangeFee: cardDetails.ForeignExchangeFee,
    ForeignExchangeFeePercentage: cardDetails.ForeignExchangeFeePercentage,
    RewardsCurrency: cardDetails.RewardsCurrency,
    PointsPerDollar: cardDetails.PointsPerDollar,
  };

  // Build the prompt
  const systemPrompt = `You are a credit card data comparison assistant. Your task is to compare structured database data against raw website text to identify discrepancies.

CRITICAL JSON REQUIREMENTS:
1. Output ONLY valid, complete JSON - no text before or after
2. Do NOT wrap JSON in code blocks, backticks, or markdown
3. Do NOT include explanations, comments, or any prose text
4. Ensure ALL strings are properly closed with quotes
5. Ensure ALL objects and arrays are properly closed with braces/brackets
6. The response must be parseable by JSON.parse() without any modifications

Your response should start with { and end with }. Nothing else.

=== CARD DETAILS SCHEMA ===
${JSON.stringify(AI_CARD_SCHEMA, null, 2)}

=== CREDIT SCHEMA ===
${JSON.stringify(AI_CREDIT_SCHEMA, null, 2)}

=== PERK SCHEMA ===
${JSON.stringify(AI_PERK_SCHEMA, null, 2)}

=== MULTIPLIER SCHEMA ===
${JSON.stringify(AI_MULTIPLIER_SCHEMA, null, 2)}

=== PORTAL BOOKING CATEGORIZATION (IMPORTANT FOR MULTIPLIERS) ===
When a multiplier requires booking through a card issuer's travel portal (Chase Travel, Amex Travel, Capital One Travel, etc.), it should use:
- Category: "travel" (MAIN category - NOT "portal")
- SubCategory: "portal" (specifies portal-booked travel)

If a database multiplier has Category "portal" instead of Category "travel" with SubCategory "portal", this is INCORRECT categorization and should be flagged as a mismatch.
Look for Requirements mentioning portal booking (e.g., "BOOK THROUGH AMEXTRAVEL.COM", "MUST BE BOOKED ON CHASE TRAVEL PORTAL").

=== PERKS TO EXCLUDE (DO NOT FLAG AS "NEW") ===
The following perks should NOT be flagged as "new" even if found on website, as they are either redundant or too common/standard to track:
- No Foreign Transaction Fee (already tracked in Card Details ForeignExchangeFee field)
- Unauthorized Charge Protection / Zero Liability / Fraud Protection (standard for all cards)
- Purchase Protection (too common/standard)
- Extended Warranty Protection (too common/standard)
- 24/7 Customer Support / Customer Service (standard for all cards)
- Return Protection (too common/standard)
- Price Protection (too common/standard)

If these perks exist in the database, mark them as "questionable" with a note that they should potentially be removed.

=== FIELD LABELS (for reference) ===
${JSON.stringify(CARD_FIELD_LABELS, null, 2)}

=== SCHEMA RULES ===
--- Card Rules ---
${cardRules}

--- Credit Rules ---
${creditRules}

--- Perk Rules ---
${perkRules}

--- Multiplier Rules ---
${multiplierRules}
`;

  const userPrompt = `=== DATABASE CARD DETAILS ===
${JSON.stringify(cardFieldsForComparison, null, 2)}

=== DATABASE CREDITS (${credits.length} items) ===
${JSON.stringify(
  credits.map((c) => ({
    id: c.id,
    Title: c.Title,
    Category: c.Category,
    SubCategory: c.SubCategory,
    Description: c.Description,
    Value: c.Value,
    TimePeriod: c.TimePeriod,
    Requirements: c.Requirements,
    Details: c.Details,
  })),
  null,
  2
)}

=== DATABASE PERKS (${perks.length} items) ===
${JSON.stringify(
  perks.map((p) => ({
    id: p.id,
    Title: p.Title,
    Category: p.Category,
    SubCategory: p.SubCategory,
    Description: p.Description,
    Requirements: p.Requirements,
    Details: p.Details,
  })),
  null,
  2
)}

=== DATABASE MULTIPLIERS (${multipliers.length} items) ===
${JSON.stringify(
  multipliers.map((m) => ({
    id: m.id,
    Name: m.Name,
    Category: m.Category,
    SubCategory: m.SubCategory,
    Description: m.Description,
    Multiplier: m.Multiplier,
    Requirements: m.Requirements,
    Details: m.Details,
  })),
  null,
  2
)}

=== WEBSITE TEXT TO COMPARE ===
${websiteText}

=== YOUR TASK ===
Compare the database data against the website text and identify discrepancies.

SUMMARY FIELD REQUIREMENTS:
- The summary should be an ANALYSIS of how up-to-date the database is compared to the website
- Highlight what is WRONG (mismatches), MISSING (items removed from website), or NEW (items on website not in database)
- Do NOT summarize what the credit card is or its features
- Focus on actionable insights: what needs to be updated, added, or removed
- Example: "The database is mostly current but has 2 outdated perks and is missing 1 new credit benefit announced on the website. The annual fee and reward rates are accurate."

Compare the database data against the website text and identify:

1. **Card Details**: For each field in the card details, determine:
   - "match": Field value matches the website information
   - "mismatch": Field is outdated or incorrect (website shows different info)
   - "questionable": Unclear if correct, needs human review
   - "missing_from_website": Field not mentioned on website (cannot verify)

   SPECIAL HANDLING for CardDetails field:
   - CardDetails is a summary/description of the card, NOT a specific data point
   - Do NOT look for exact text matches in the website
   - Instead, evaluate if the summary GENERALLY LOOKS CORRECT based on the card's features
   - Use "match" if the summary accurately reflects the card's key benefits/features
   - Use "mismatch" only if the summary contains clearly incorrect or outdated information
   - Use "questionable" if some aspects might be outdated but you're not sure
   - NEVER use "missing_from_website" for CardDetails

2. **Components (Credits, Perks, Multipliers)**: For each component, determine:
   - "match": Component matches website (same title, values, etc.)
   - "outdated": Component exists but has different values on website
   - "questionable": Unclear, needs human review
   - "missing": Component is in database but NOT found on website (may have been removed)
   - "new": Found on website but NOT in database (NEW item to add)

MATCHING STRATEGY:
- Match components by Title (for credits/perks) or Name (for multipliers)
- If a website component doesn't match any database Title/Name, mark it as "new"
- If a database component Title/Name is not found on website, mark it as "missing"

=== OUTPUT SCHEMA ===
${JSON.stringify(AI_COMPARISON_SCHEMA, null, 2)}`;

  return `${systemPrompt}\n\n${userPrompt}`;
}

/**
 * Attempts to fix common JSON issues like unterminated strings
 */
function fixJsonIssues(jsonStr: string): string {
  // Remove trailing commas before closing braces/brackets
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

  // Try to close unterminated strings (look for unclosed quotes)
  const lines = jsonStr.split('\n');
  const fixedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const quoteCount = (line.match(/"/g) || []).length;

    // If odd number of quotes, might be unterminated
    if (quoteCount % 2 === 1) {
      const lastQuoteIndex = line.lastIndexOf('"');
      const afterLastQuote = line.substring(lastQuoteIndex + 1);

      if (
        afterLastQuote.trim() &&
        !afterLastQuote.includes('"') &&
        !afterLastQuote.includes(',')
      ) {
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
 * Extracts JSON from a text response that might contain additional prose
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

  // Try to find JSON object in the text
  const jsonObjectMatch = cleaned.match(/\{[\s\S]*\}/);

  if (jsonObjectMatch) {
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
      extracted = fixJsonIssues(extracted);

      try {
        JSON.parse(extracted);
        return extracted;
      } catch {
        // Continue to fallback
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

  // Last resort: return cleaned text and let the caller handle the error
  return cleaned.trim();
}

/**
 * Parses and validates the AI response
 */
function parseAndValidateResponse(text: string): AIComparisonResponse {
  const extracted = extractJsonFromText(text);

  try {
    const json = JSON.parse(extracted);

    if (!isValidComparisonResponse(json)) {
      throw new Error('Response does not match expected schema');
    }

    return json;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const preview = extracted.substring(0, 500);
    console.error('Failed to parse comparison JSON:', preview);
    throw new Error(`Failed to parse AI response as JSON: ${errorMsg}`);
  }
}

/**
 * Main function to analyze card comparison
 */
export async function analyzeComparison(
  request: ComparisonRequest
): Promise<ComparisonResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelsToTry = [MODELS.GEMINI_3_PRO_PREVIEW, MODELS.GEMINI_25_PRO];

  // Aggregate card data from database
  const aggregatedData = await aggregateCardData(
    request.referenceCardId,
    request.versionId
  );

  // Build the comparison prompt
  const prompt = buildComparisonPrompt(aggregatedData, request.websiteText);

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
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.1, // Low temperature for more deterministic JSON output
            topP: 0.8,
            maxOutputTokens: 16384, // Larger for comprehensive comparison results
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error('Empty response from Gemini');
        }

        // Check if response might be truncated
        const trimmed = text.trim();
        const mightBeTruncated = !trimmed.endsWith('}');

        if (mightBeTruncated && attempt === 0) {
          console.warn(
            'Warning: Response might be truncated. Last 100 chars:',
            trimmed.substring(Math.max(0, trimmed.length - 100))
          );
        }

        // Log the raw response for debugging
        if (attempt === 0) {
          console.log(`Raw Gemini response (${model}) length:`, text.length);
          console.log(
            'Raw Gemini response (first 500 chars):',
            text.substring(0, 500)
          );
          if (text.length > 500) {
            console.log(
              'Raw Gemini response (last 200 chars):',
              text.substring(Math.max(0, text.length - 200))
            );
          }
        }

        const result = parseAndValidateResponse(text);
        return {
          ...result,
          modelUsed: model,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Gemini comparison error (${model}):`, lastError.message);

        // Check if this is a rate limit error - if so, try the next model
        if (isRateLimitError(lastError)) {
          console.warn(`Rate limit hit for ${model}, trying fallback model...`);
          break; // Exit retry loop, try next model
        }

        // Only retry on JSON parsing errors
        if (
          !lastError.message.includes('JSON') &&
          !lastError.message.includes('parse')
        ) {
          throw lastError;
        }

        if (attempt < maxRetries - 1) {
          // Add a small delay before retry
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
  }

  throw lastError || new Error('Failed to analyze comparison after trying all models');
}
