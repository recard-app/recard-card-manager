/**
 * Test script: Run a single end-to-end automated review.
 *
 * Usage:
 *   npx ts-node scripts/test-review.ts --card=<referenceCardId>
 *   npx ts-node scripts/test-review.ts --card=<referenceCardId> --version=<versionId>
 *
 * Notes:
 * - This script writes a real review result document to Firestore.
 * - It reuses the same pipeline as the queue processor (`executeCardReview`).
 */

import dotenv from 'dotenv';
dotenv.config();

import { db } from '../firebase-admin';
import { createReviewResult, getReviewResult } from '../services/review-storage.service';
import { executeCardReview } from '../services/review-execution.service';

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find(value => value.startsWith(prefix));
  return arg ? arg.substring(prefix.length) : undefined;
}

async function resolveVersionId(referenceCardId: string, explicitVersionId?: string): Promise<string> {
  if (explicitVersionId) {
    return explicitVersionId;
  }

  const activeSnapshot = await db.collection('credit_cards_history')
    .where('ReferenceCardId', '==', referenceCardId)
    .where('IsActive', '==', true)
    .limit(1)
    .get();

  if (activeSnapshot.empty) {
    throw new Error(`No active version found for card ${referenceCardId}. Pass --version=<versionId>.`);
  }

  return activeSnapshot.docs[0].id;
}

async function main(): Promise<void> {
  const referenceCardId = getArg('card');
  const explicitVersionId = getArg('version');

  if (!referenceCardId) {
    throw new Error('Missing required --card=<referenceCardId> argument');
  }

  const cardNameDoc = await db.collection('credit_cards_names').doc(referenceCardId).get();
  if (!cardNameDoc.exists) {
    throw new Error(`Card ${referenceCardId} not found in credit_cards_names`);
  }

  const cardNameData = cardNameDoc.data() as {
    CardName: string;
    CardIssuer: string;
    websiteUrls?: string[];
  };

  const versionId = await resolveVersionId(referenceCardId, explicitVersionId);
  const websiteUrls = cardNameData.websiteUrls ?? [];
  const queuedAt = new Date().toISOString();

  console.log('=== Test Review ===');
  console.log(`Card: ${cardNameData.CardName} (${referenceCardId})`);
  console.log(`Issuer: ${cardNameData.CardIssuer}`);
  console.log(`Version: ${versionId}`);
  console.log(`URLs: ${websiteUrls.length}`);
  console.log('');

  const resultId = await createReviewResult({
    referenceCardId,
    versionId,
    cardName: cardNameData.CardName,
    cardIssuer: cardNameData.CardIssuer,
    status: 'queued',
    triggeredBy: 'manual',
    queuedAt,
    websiteUrls,
    contentLength: 0,
  });

  console.log(`Created review result: ${resultId}`);
  console.log('Executing review pipeline...');

  await executeCardReview(referenceCardId, resultId);

  const result = await getReviewResult(resultId);
  if (!result) {
    throw new Error(`Review result ${resultId} not found after execution`);
  }

  console.log('');
  console.log('=== Result ===');
  console.log(`Status: ${result.status}`);
  if (result.failureReason) console.log(`Failure: ${result.failureReason}`);
  if (result.skipReason) console.log(`Skip: ${result.skipReason}`);
  if (result.health) {
    console.log(`Health Score: ${result.health.score}`);
    console.log(
      `Issues -> mismatches: ${result.health.mismatches}, outdated: ${result.health.outdated}, new: ${result.health.new}, missing: ${result.health.missing}, questionable: ${result.health.questionable}`
    );
  }
  if (result.usage) {
    console.log(`Tokens -> scrape: ${result.usage.scraping.totalContentTokens}, input: ${result.usage.gemini.inputTokens}, output: ${result.usage.gemini.outputTokens}`);
    console.log(`Cost -> total: $${result.usage.cost.total.toFixed(3)}`);
  }
  if (result.urlResults?.length) {
    console.log('URL Results:');
    result.urlResults.forEach((urlResult, index) => {
      console.log(`  ${index + 1}. [${urlResult.status}] ${urlResult.url}`);
      if (urlResult.suggestedUrl) {
        console.log(`     Suggested: ${urlResult.suggestedUrl}`);
      }
      if (urlResult.error) {
        console.log(`     Error: ${urlResult.error}`);
      }
    });
  }

  console.log('');
  console.log(`Review result saved at card_review_results/${resultId}`);
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Test review failed: ${message}`);
  process.exit(1);
});

