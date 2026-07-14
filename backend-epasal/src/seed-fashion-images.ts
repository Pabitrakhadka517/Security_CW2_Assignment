/**
 * Curated, CSP-safe stock photo pool for the fashion seed scripts
 * (seed-fashion.ts, seed-fashion-bulk.ts).
 * ----------------------------------------------------------------------------
 * Every URL below is images.unsplash.com — the one third-party image host
 * allowed by the app's CSP img-src directive — and was checked with an HTTP
 * HEAD request before being added here (same URLs already vetted for
 * seed/fashionProducts.js). `pickFashionImage()` buckets a seed script's
 * free-text keyword string into the closest category below and picks a
 * photo deterministically, so the same product always renders the same
 * image without needing a live, keyword-searchable photo API.
 */

const POOLS: Record<string, string[]> = {
  footwear: [
    'https://images.unsplash.com/photo-1460353581641-37baddab0fa2',
    'https://images.unsplash.com/photo-1465453869711-7e174808ace9',
    'https://images.unsplash.com/photo-1483721310020-03333e577078',
    'https://images.unsplash.com/photo-1520639888713-7851133b1ed0',
    'https://images.unsplash.com/photo-1562273138-f46be4ebdf33',
    'https://images.unsplash.com/photo-1518049362265-d5b2a6467637',
    'https://images.unsplash.com/photo-1560343090-f0409e92791a',
    'https://images.unsplash.com/photo-1533867617858-e7b97e060509',
  ],
  bags: [
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa',
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62',
    'https://images.unsplash.com/photo-1577733966973-d680bffd2e80',
    'https://images.unsplash.com/photo-1627123424574-724758594e93',
    'https://images.unsplash.com/photo-1601592996763-f05c9c80a7f1',
  ],
  jewelry: [
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338',
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1',
    'https://images.unsplash.com/photo-1524592094714-0f0654e20314',
    'https://images.unsplash.com/photo-1508296695146-257a814070b4',
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083',
  ],
  accessories: [
    'https://images.unsplash.com/photo-1517941823-815bea90d291',
    'https://images.unsplash.com/photo-1521369909029-2afed882baee',
    'https://images.unsplash.com/photo-1624222247344-550fb60583dc',
    'https://images.unsplash.com/photo-1677478863154-55ecce8c7536',
    'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82',
    'https://images.unsplash.com/photo-1727498830440-339a797d8423',
  ],
  kids: [
    'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4',
    'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea',
    'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7',
    'https://images.unsplash.com/photo-1726153049464-f423dd75cdf9',
    'https://images.unsplash.com/photo-1519689680058-324335c77eba',
    'https://images.unsplash.com/photo-1522771930-78848d9293e8',
  ],
  men: [
    'https://images.unsplash.com/photo-1503341504253-dff4815485f1',
    'https://images.unsplash.com/photo-1563630423918-b58f07336ac9',
    'https://images.unsplash.com/photo-1544923246-77307dd654cb',
    'https://images.unsplash.com/photo-1509942774463-acf339cf87d5',
    'https://images.unsplash.com/photo-1542272604-787c3835535d',
    'https://images.unsplash.com/photo-1473966968600-fa801b869a1a',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf',
    'https://images.unsplash.com/photo-1593032465175-481ac7f401a0',
  ],
  women: [
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c',
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105',
    'https://images.unsplash.com/photo-1475178626620-a4d074967452',
    'https://images.unsplash.com/photo-1574201635302-388dd92a4c3f',
    'https://images.unsplash.com/photo-1544022613-e87ca75a784a',
    'https://images.unsplash.com/photo-1577900232427-18219b9166a0',
    'https://images.unsplash.com/photo-1560243563-062bfc001d68',
    'https://images.unsplash.com/photo-1518310383802-640c2de311b2',
  ],
  generic: [
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c',
    'https://images.unsplash.com/photo-1544923246-77307dd654cb',
    'https://images.unsplash.com/photo-1460353581641-37baddab0fa2',
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa',
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1',
  ],
};

// Checked in order — specific product-type keywords win over a bare
// gender/age keyword, which wins over the generic fallback pool.
const BUCKET_RULES: Array<{ pattern: RegExp; pool: keyof typeof POOLS }> = [
  { pattern: /sneaker|running-shoe|formal-shoe|heel|sandal|boot|footwear/, pool: 'footwear' },
  { pattern: /bag|backpack|wallet/, pool: 'bags' },
  { pattern: /jewelry|necklace|earring|watch/, pool: 'jewelry' },
  { pattern: /belt|cap|scarf|sock|sunglasses/, pool: 'accessories' },
  { pattern: /kids/, pool: 'kids' },
  { pattern: /mens-fashion|^men$/, pool: 'men' },
  { pattern: /womens-fashion|^women$/, pool: 'women' },
];

function resolvePool(keywords: string): string[] {
  const needle = keywords.toLowerCase();
  for (const rule of BUCKET_RULES) {
    if (rule.pattern.test(needle)) return POOLS[rule.pool];
  }
  return POOLS.generic;
}

/** Deterministically pick a CSP-safe fashion photo URL for the given keywords + seed hash. */
export function pickFashionImage(keywords: string, seedHash: number, w = 900, h = 1100): string {
  const pool = resolvePool(keywords);
  const base = pool[seedHash % pool.length];
  return `${base}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
}
