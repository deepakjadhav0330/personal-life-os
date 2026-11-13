/**
 * receiptParser.ts
 * ────────────────
 * Parses raw OCR text from a receipt photo into structured expense data.
 * Pure function — no side effects, no Dexie, no React.
 *
 * Handles common Indian receipt formats:
 *   - Total / Grand Total / Net Payable amounts
 *   - Merchant name from the first prominent line
 *   - Category detection from keywords
 *   - Number formats: 1,250.00 · ₹450 · Rs. 450 · 450.00
 */

export interface ReceiptData {
  amount?: number;
  merchant?: string;
  category: string;
  rawText: string;
  confidence: 'high' | 'medium' | 'low';
}

// ─── Category keyword map ─────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: [
    'restaurant', 'cafe', 'coffee', 'tea', 'hotel', 'dhaba', 'kitchen',
    'foods', 'bakery', 'pizza', 'burger', 'biryani', 'swiggy', 'zomato',
    'dominos', 'kfc', 'mcdonalds', 'subway', 'haldirams', 'barbeque',
    'thali', 'canteen', 'cafeteria', 'eatery', 'diner',
  ],
  groceries: [
    'supermarket', 'grocery', 'mart', 'store', 'bigbasket', 'blinkit',
    'zepto', 'dmart', 'reliance fresh', 'more', 'nature basket',
    'vegetables', 'fruits', 'provision',
  ],
  transport: [
    'petrol', 'fuel', 'diesel', 'pump', 'bpcl', 'hpcl', 'iocl',
    'indian oil', 'hp petrol', 'nayara', 'parking', 'toll', 'uber',
  ],
  healthcare: [
    'pharmacy', 'chemist', 'medical', 'medicine', 'hospital', 'clinic',
    'lab', 'diagnostic', 'apollo', 'netmeds', 'medplus', 'health',
  ],
  shopping: [
    'amazon', 'flipkart', 'myntra', 'mall', 'fashion', 'garments',
    'textiles', 'boutique', 'electronics', 'croma', 'reliance digital',
  ],
  entertainment: [
    'cinema', 'pvr', 'inox', 'movies', 'multiplex', 'theatre', 'gaming',
  ],
  bills: [
    'electricity', 'bescom', 'msedcl', 'bsnl', 'jio', 'airtel',
    'vodafone', 'broadband', 'internet', 'wifi', 'recharge',
  ],
};

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some(kw => lower.includes(kw))) return cat;
  }
  return 'other';
}

// ─── Amount extraction ────────────────────────────────────────

function cleanNumber(raw: string): number {
  // Remove currency symbols, commas, spaces
  return parseFloat(raw.replace(/[₹$€£,\s]/g, ''));
}

function extractAmount(text: string): { amount: number | undefined; confidence: 'high' | 'medium' | 'low' } {
  // Priority-ordered patterns — highest confidence first
  const highConfidencePatterns = [
    /grand\s*total\s*[:\-]?\s*[₹rs.]*\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:net\s+)?payable\s*[:\-]?\s*[₹rs.]*\s*([\d,]+(?:\.\d{1,2})?)/i,
    /total\s+amount\s*[:\-]?\s*[₹rs.]*\s*([\d,]+(?:\.\d{1,2})?)/i,
    /amount\s+due\s*[:\-]?\s*[₹rs.]*\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  const mediumConfidencePatterns = [
    // "total" at start of line or after whitespace
    /(?:^|\n)\s*total\s*[:\-]?\s*[₹rs.]*\s*([\d,]+(?:\.\d{1,2})?)/im,
    // "total" anywhere
    /\btotal\b[:\s]*[₹rs.]*\s*([\d,]+(?:\.\d{1,2})?)/i,
    /\bamount\b[:\s]*[₹rs.]*\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  // Try high confidence patterns first
  for (const pattern of highConfidencePatterns) {
    const m = text.match(pattern);
    if (m?.[1]) {
      const n = cleanNumber(m[1]);
      if (n > 0 && n < 1_000_000) return { amount: n, confidence: 'high' };
    }
  }

  for (const pattern of mediumConfidencePatterns) {
    const m = text.match(pattern);
    if (m?.[1]) {
      const n = cleanNumber(m[1]);
      if (n > 0 && n < 1_000_000) return { amount: n, confidence: 'medium' };
    }
  }

  // Low confidence: find all ₹ amounts, take the largest (usually the total)
  const rupeeAmounts = [...text.matchAll(/[₹₹]\s*([\d,]+(?:\.\d{1,2})?)/g)]
    .map(m => cleanNumber(m[1]))
    .filter(n => n > 0 && n < 1_000_000);

  if (rupeeAmounts.length > 0) {
    return { amount: Math.max(...rupeeAmounts), confidence: 'low' };
  }

  // Last resort: find all plain decimal numbers, take the largest reasonable one
  const allNumbers = [...text.matchAll(/(?<![.\d])([\d,]{1,7}(?:\.\d{1,2})?)(?![.\d])/g)]
    .map(m => cleanNumber(m[1]))
    .filter(n => n >= 10 && n < 100_000);

  if (allNumbers.length > 0) {
    return { amount: Math.max(...allNumbers), confidence: 'low' };
  }

  return { amount: undefined, confidence: 'low' };
}

// ─── Merchant extraction ──────────────────────────────────────

const SKIP_MERCHANT_PATTERNS = [
  /^(?:tax\s+)?invoice/i,
  /^receipt/i,
  /^order\s*[#:]/i,
  /^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}/, // date
  /^\d{2}:\d{2}/,                        // time
  /^(gstin|cin|pan)[:\s]/i,
  /^thank\s+you/i,
  /^www\./i,
  /^powered\s+by/i,
  /^gst\s+no/i,
  /^phone|^email|^tel|^mob/i,
];

function extractMerchant(text: string): string | undefined {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 2 && l.length < 60);

  for (const line of lines.slice(0, 6)) {
    if (SKIP_MERCHANT_PATTERNS.some(p => p.test(line))) continue;
    // Skip lines that are mostly numbers
    if ((line.match(/\d/g)?.length ?? 0) > line.length * 0.5) continue;
    // Clean up special characters
    const cleaned = line.replace(/[^\w\s&'.()\-]/g, '').trim();
    if (cleaned.length >= 3) return cleaned;
  }
  return undefined;
}

// ─── Main exported parser ─────────────────────────────────────

export function parseReceiptText(rawText: string): ReceiptData {
  const text = rawText.trim();
  const { amount, confidence } = extractAmount(text);
  const merchant = extractMerchant(text);
  const category = detectCategory(text);

  return {
    amount,
    merchant,
    category,
    rawText: text,
    confidence: amount ? confidence : 'low',
  };
}
