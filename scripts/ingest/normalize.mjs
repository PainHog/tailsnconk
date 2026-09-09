/**
 * Ingredient + field normalization for the cocktail ingestion pipeline.
 *
 * Turns free-form source strings ("Freshly Squeezed Lime Juice", "Light Rum",
 * "Bourbon Whiskey") into ONE canonical ingredient slug + type + alcohol tag +
 * spirit family, so the availability engine keys on consistent slugs. Anything
 * not explicitly mapped falls through a deterministic keyword classifier and is
 * reported by the audit so it can be promoted into CANON later.
 */

/** Accent-strip + lowercase + drop noise qualifiers (but never color/spirit words). */
export function clean(raw) {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(freshly squeezed|fresh|chilled|raw|plain|premium|quality|your favou?rite|well[- ]aged)\b/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9%+ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugify(raw) {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Spirit families used for base-spirit inference.
const F = { whiskey: 'whiskey', gin: 'gin', vodka: 'vodka', rum: 'rum', tequila: 'tequila', brandy: 'brandy' };

/**
 * Canonical ingredients. `aka` entries are matched against clean() output
 * (already accent/case-normalized), so only genuinely different spellings need
 * listing. type ∈ spirit|liqueur|wine|mixer|juice|syrup|bitters|garnish|other.
 */
const CANON = [
  // --- Whiskey family ---
  { slug: 'bourbon', name: 'Bourbon', type: 'spirit', alcohol: true, base: F.whiskey, aka: ['bourbon', 'bourbon whiskey', 'bourbon or rye whiskey', 'rye whiskey or bourbon'] },
  { slug: 'rye-whiskey', name: 'Rye whiskey', type: 'spirit', alcohol: true, base: F.whiskey, aka: ['rye whiskey', 'rye whisky'] },
  { slug: 'scotch', name: 'Blended scotch', type: 'spirit', alcohol: true, base: F.whiskey, aka: ['scotch whisky', 'blended scotch whisky', 'blended scotch', 'scotch'] },
  { slug: 'islay-scotch', name: 'Islay scotch', type: 'spirit', alcohol: true, base: F.whiskey, aka: ['islay scotch', 'lagavulin 16 y whisky', 'lagavulin'] },
  { slug: 'irish-whiskey', name: 'Irish whiskey', type: 'spirit', alcohol: true, base: F.whiskey, aka: ['irish whiskey'] },
  { slug: 'canadian-whisky', name: 'Canadian whisky', type: 'spirit', alcohol: true, base: F.whiskey, aka: ['canadian whisky'] },
  { slug: 'whiskey', name: 'Whiskey', type: 'spirit', alcohol: true, base: F.whiskey, aka: ['whiskey', 'whisky'] },

  // --- Gin family ---
  { slug: 'gin', name: 'Gin', type: 'spirit', alcohol: true, base: F.gin, aka: ['gin', 'dry gin', 'london dry gin'] },
  { slug: 'old-tom-gin', name: 'Old Tom gin', type: 'spirit', alcohol: true, base: F.gin, aka: ['old tom gin'] },

  // --- Vodka family ---
  { slug: 'vodka', name: 'Vodka', type: 'spirit', alcohol: true, base: F.vodka, aka: ['vodka', 'smirnoff vodka'] },
  { slug: 'vodka-citron', name: 'Citron vodka', type: 'spirit', alcohol: true, base: F.vodka, aka: ['vodka citron', 'citron vodka', 'lemon vodka'] },
  { slug: 'vanilla-vodka', name: 'Vanilla vodka', type: 'spirit', alcohol: true, base: F.vodka, aka: ['vodka vanilla', 'vanilla vodka'] },

  // --- Rum family ---
  { slug: 'white-rum', name: 'White rum', type: 'spirit', alcohol: true, base: F.rum, aka: ['white rum', 'light rum', 'rum', 'white cuban ron', 'gold puerto rican rum', 'silver rum'] },
  { slug: 'gold-rum', name: 'Gold rum', type: 'spirit', alcohol: true, base: F.rum, aka: ['gold rum'] },
  { slug: 'aged-rum', name: 'Aged rum', type: 'spirit', alcohol: true, base: F.rum, aka: ['aged rum', 'martinique molasses rhum'] },
  { slug: 'dark-rum', name: 'Dark rum', type: 'spirit', alcohol: true, base: F.rum, aka: ['dark rum', 'jamaican dark rum', 'amber jamaican rum', 'jamaican rum', 'goslings rum', 'demerara rum', 'black rum'] },
  { slug: 'overproof-rum', name: 'Overproof rum', type: 'spirit', alcohol: true, base: F.rum, aka: ['overproof rum', 'jamaica overproof white rum', 'overproof white rum', '151 rum'] },
  { slug: 'cachaca', name: 'Cachaça', type: 'spirit', alcohol: true, base: F.rum, aka: ['cachaca', 'cuban aguardiente', 'sugar cane juice'] },

  // --- Agave family ---
  { slug: 'tequila-blanco', name: 'Tequila (blanco)', type: 'spirit', alcohol: true, base: F.tequila, aka: ['tequila', 'tequila blanco', '100% agave tequila', 'tequila 100% agave', 'blanco tequila', 'silver tequila'] },
  { slug: 'tequila-reposado', name: 'Tequila (reposado)', type: 'spirit', alcohol: true, base: F.tequila, aka: ['tequila agave 100% reposado', 'reposado tequila', 'tequila reposado'] },
  { slug: 'mezcal', name: 'Mezcal', type: 'spirit', alcohol: true, base: F.tequila, aka: ['mezcal', 'espadin mezcal', 'mescal'] },

  // --- Brandy family ---
  { slug: 'brandy', name: 'Brandy', type: 'spirit', alcohol: true, base: F.brandy, aka: ['brandy', 'cognac or brandy'] },
  { slug: 'cognac', name: 'Cognac', type: 'spirit', alcohol: true, base: F.brandy, aka: ['cognac'] },
  { slug: 'calvados', name: 'Calvados', type: 'spirit', alcohol: true, base: F.brandy, aka: ['calvados'] },
  { slug: 'pisco', name: 'Pisco', type: 'spirit', alcohol: true, base: F.brandy, aka: ['pisco'] },
  { slug: 'grappa', name: 'Grappa', type: 'spirit', alcohol: true, base: F.brandy, aka: ['white smooth grappa', 'grappa'] },
  { slug: 'apricot-brandy', name: 'Apricot brandy', type: 'liqueur', alcohol: true, aka: ['apricot brandy'] },

  // --- Absinthe / high-proof botanicals ---
  { slug: 'absinthe', name: 'Absinthe', type: 'liqueur', alcohol: true, aka: ['absinthe', 'absinth', 'pernod'] },

  // --- Liqueurs ---
  { slug: 'orange-liqueur', name: 'Orange liqueur', type: 'liqueur', alcohol: true, aka: ['orange liqueur', 'cointreau', 'triple sec'] },
  { slug: 'orange-curacao', name: 'Orange curaçao', type: 'liqueur', alcohol: true, aka: ['orange curacao', 'curacao', 'blue curacao'] },
  { slug: 'grand-marnier', name: 'Grand Marnier', type: 'liqueur', alcohol: true, aka: ['grand marnier'] },
  { slug: 'campari', name: 'Campari', type: 'liqueur', alcohol: true, aka: ['campari', 'bitter campari'] },
  { slug: 'aperol', name: 'Aperol', type: 'liqueur', alcohol: true, aka: ['aperol'] },
  { slug: 'cynar', name: 'Cynar', type: 'liqueur', alcohol: true, aka: ['cynar'] },
  { slug: 'amaro-nonino', name: 'Amaro Nonino', type: 'liqueur', alcohol: true, aka: ['amaro nonino'] },
  { slug: 'amaro-montenegro', name: 'Amaro Montenegro', type: 'liqueur', alcohol: true, aka: ['amaro montenegro'] },
  { slug: 'fernet-branca', name: 'Fernet-Branca', type: 'liqueur', alcohol: true, aka: ['fernet branca', 'fernet-branca', 'fernet'] },
  { slug: 'maraschino', name: 'Maraschino liqueur', type: 'liqueur', alcohol: true, aka: ['maraschino', 'maraschino liqueur', 'maraschino luxardo'] },
  { slug: 'amaretto', name: 'Amaretto', type: 'liqueur', alcohol: true, aka: ['amaretto'] },
  { slug: 'coffee-liqueur', name: 'Coffee liqueur', type: 'liqueur', alcohol: true, aka: ['coffee liqueur', 'kahlua'] },
  { slug: 'green-chartreuse', name: 'Green Chartreuse', type: 'liqueur', alcohol: true, aka: ['green chartreuse'] },
  { slug: 'yellow-chartreuse', name: 'Yellow Chartreuse', type: 'liqueur', alcohol: true, aka: ['yellow chartreuse'] },
  { slug: 'benedictine', name: 'Bénédictine', type: 'liqueur', alcohol: true, aka: ['benedictine', 'dom benedictine'] },
  { slug: 'drambuie', name: 'Drambuie', type: 'liqueur', alcohol: true, aka: ['drambuie'] },
  { slug: 'galliano', name: 'Galliano', type: 'liqueur', alcohol: true, aka: ['galliano'] },
  { slug: 'kummel', name: 'Kümmel', type: 'liqueur', alcohol: true, aka: ['kummel'] },
  { slug: 'st-germain', name: 'Elderflower liqueur', type: 'liqueur', alcohol: true, aka: ['st germain', 'st. germain', 'elderflower liqueur'] },
  { slug: 'creme-de-cassis', name: 'Crème de cassis', type: 'liqueur', alcohol: true, aka: ['creme de cassis'] },
  { slug: 'creme-de-mure', name: 'Crème de mûre', type: 'liqueur', alcohol: true, aka: ['creme de mure', 'blackberry liqueur'] },
  { slug: 'creme-de-violette', name: 'Crème de violette', type: 'liqueur', alcohol: true, aka: ['creme de violette', 'creme yvette'] },
  { slug: 'creme-de-menthe', name: 'Crème de menthe', type: 'liqueur', alcohol: true, aka: ['creme de menthe', 'white creme de menthe'] },
  { slug: 'creme-de-cacao', name: 'Crème de cacao', type: 'liqueur', alcohol: true, aka: ['creme de cacao', 'light creme de cacao', 'white creme de cacao', 'dark creme de cacao'] },
  { slug: 'cherry-liqueur', name: 'Cherry liqueur', type: 'liqueur', alcohol: true, aka: ['cherry liqueur', 'cherry heering'] },
  { slug: 'raspberry-liqueur', name: 'Raspberry liqueur', type: 'liqueur', alcohol: true, aka: ['raspberry liqueur'] },
  { slug: 'peach-schnapps', name: 'Peach schnapps', type: 'liqueur', alcohol: true, aka: ['peach schnapps'] },
  { slug: 'melon-liqueur', name: 'Melon liqueur', type: 'liqueur', alcohol: true, aka: ['melon liqueur', 'midori'] },
  { slug: 'falernum', name: 'Falernum', type: 'liqueur', alcohol: true, aka: ['falernum'] },
  { slug: 'passion-fruit-liqueur', name: 'Passion fruit liqueur', type: 'liqueur', alcohol: true, aka: ['passion fruit liqueur', 'passoa'] },

  // --- Fortified / wine / sparkling ---
  { slug: 'sweet-vermouth', name: 'Sweet vermouth', type: 'wine', alcohol: true, aka: ['sweet vermouth', 'sweet red vermouth', 'red vermouth', 'rosso vermouth'] },
  { slug: 'dry-vermouth', name: 'Dry vermouth', type: 'wine', alcohol: true, aka: ['dry vermouth'] },
  { slug: 'lillet-blanc', name: 'Lillet Blanc', type: 'wine', alcohol: true, aka: ['lillet blanc'] },
  { slug: 'port', name: 'Port', type: 'wine', alcohol: true, aka: ['port wine', 'red tawny port wine', 'tawny port', 'port'] },
  { slug: 'prosecco', name: 'Prosecco', type: 'wine', alcohol: true, aka: ['prosecco'] },
  { slug: 'champagne', name: 'Champagne', type: 'wine', alcohol: true, aka: ['champagne', 'brut champagne or prosecco', 'sparkling wine', 'sekt'] },
  { slug: 'red-wine', name: 'Red wine', type: 'wine', alcohol: true, aka: ['red wine'] },
  { slug: 'dry-white-wine', name: 'Dry white wine', type: 'wine', alcohol: true, aka: ['dry white wine', 'white wine'] },
  { slug: 'guinness', name: 'Stout beer', type: 'wine', alcohol: true, aka: ['guinness stout', 'stout'] },

  // --- Bitters (dashes; alcohol negligible → not tagged) ---
  { slug: 'angostura-bitters', name: 'Angostura bitters', type: 'bitters', aka: ['angostura bitters', 'angostura', 'angustura', 'aromatic bitters'] },
  { slug: 'peychauds-bitters', name: "Peychaud's bitters", type: 'bitters', aka: ['peychauds bitters', 'peychaud s bitters', "peychaud's bitters"] },
  { slug: 'orange-bitters', name: 'Orange bitters', type: 'bitters', aka: ['orange bitters'] },

  // --- Juices ---
  { slug: 'lime-juice', name: 'Fresh lime juice', type: 'juice', aka: ['lime juice'] },
  { slug: 'lemon-juice', name: 'Fresh lemon juice', type: 'juice', aka: ['lemon juice'] },
  { slug: 'orange-juice', name: 'Fresh orange juice', type: 'juice', aka: ['orange juice'] },
  { slug: 'pineapple-juice', name: 'Pineapple juice', type: 'juice', aka: ['pineapple juice'] },
  { slug: 'cranberry-juice', name: 'Cranberry juice', type: 'juice', aka: ['cranberry juice'] },
  { slug: 'grapefruit-juice', name: 'Grapefruit juice', type: 'juice', aka: ['grapefruit juice', 'pink grapefruit juice'] },
  { slug: 'tomato-juice', name: 'Tomato juice', type: 'juice', aka: ['tomato juice'] },

  // --- Syrups / sweeteners ---
  { slug: 'simple-syrup', name: 'Simple syrup', type: 'syrup', aka: ['simple syrup', 'sugar syrup', 'gomme syrup', 'gomme'] },
  { slug: 'sugar', name: 'Sugar', type: 'other', aka: ['sugar', 'superfine sugar', 'powdered sugar', 'white cane sugar', 'caster sugar'] },
  { slug: 'sugar-cube', name: 'Sugar cube', type: 'other', aka: ['sugar cube'] },
  { slug: 'demerara-syrup', name: 'Demerara syrup', type: 'syrup', aka: ['demerara syrup', 'rich syrup'] },
  { slug: 'honey-syrup', name: 'Honey syrup', type: 'syrup', aka: ['honey syrup', 'honey mix', 'monin honey syrup', 'raw honey', 'honey'] },
  { slug: 'agave-syrup', name: 'Agave syrup', type: 'syrup', aka: ['agave syrup', 'agave nectar'] },
  { slug: 'maple-syrup', name: 'Maple syrup', type: 'syrup', aka: ['maple syrup'] },
  { slug: 'grenadine', name: 'Grenadine', type: 'syrup', aka: ['grenadine', 'grenadine syrup'] },
  { slug: 'orgeat', name: 'Orgeat', type: 'syrup', aka: ['orgeat', 'orgeat syrup'] },
  { slug: 'raspberry-syrup', name: 'Raspberry syrup', type: 'syrup', aka: ['raspberry syrup'] },
  { slug: 'ginger-syrup', name: 'Ginger syrup', type: 'syrup', aka: ['ginger syrup'] },
  { slug: 'vanilla-syrup', name: 'Vanilla syrup', type: 'syrup', aka: ['vanilla syrup'] },
  { slug: 'passion-fruit-syrup', name: 'Passion fruit syrup', type: 'syrup', aka: ['passion fruit syrup', 'passion fruit puree', 'passion fruit pure', 'passionfruit puree'] },
  { slug: 'elderflower-cordial', name: 'Elderflower cordial', type: 'syrup', aka: ['elderflower cordial'] },

  // --- Carbonated / mixers ---
  { slug: 'soda-water', name: 'Soda water', type: 'mixer', aka: ['soda water', 'club soda', 'sparkling water'] },
  { slug: 'tonic-water', name: 'Tonic water', type: 'mixer', aka: ['tonic water', 'tonic'] },
  { slug: 'ginger-beer', name: 'Ginger beer', type: 'mixer', aka: ['ginger beer'] },
  { slug: 'ginger-ale', name: 'Ginger ale', type: 'mixer', aka: ['ginger ale'] },
  { slug: 'cola', name: 'Cola', type: 'mixer', aka: ['cola', 'coca cola', 'coke'] },
  { slug: 'grapefruit-soda', name: 'Grapefruit soda', type: 'mixer', aka: ['grapefruit soda', 'pink grapefruit soda', 'squirt', 'ted'] },
  { slug: 'water', name: 'Water', type: 'mixer', aka: ['water', 'hot water', 'still water', 'mineral water', 'sparkling mineral water'] },

  // --- Dairy / egg / coffee ---
  { slug: 'cream', name: 'Cream', type: 'other', aka: ['cream', 'heavy cream', 'double cream'] },
  { slug: 'milk', name: 'Milk', type: 'other', contains: ['dairy'], aka: ['milk'] },
  { slug: 'buttermilk', name: 'Buttermilk', type: 'other', contains: ['dairy'], aka: ['buttermilk'] },
  { slug: 'coconut-cream', name: 'Coconut cream', type: 'other', aka: ['coconut cream', 'cream of coconut'] },
  { slug: 'peach-puree', name: 'Peach purée', type: 'other', aka: ['peach puree', 'peach pure', 'white peach puree', 'peach nectar'] },
  { slug: 'jalapeno', name: 'Jalapeño', type: 'other', aka: ['jalapeno', 'jalapeno slices', 'sliced jalapeno'] },
  { slug: 'egg-white', name: 'Egg white', type: 'other', contains: ['egg'], aka: ['egg white'] },
  { slug: 'egg-yolk', name: 'Egg yolk', type: 'other', contains: ['egg'], aka: ['egg yolk'] },
  { slug: 'egg', name: 'Whole egg', type: 'other', contains: ['egg'], aka: ['egg', 'whole egg'] },
  { slug: 'espresso', name: 'Fresh espresso', type: 'other', aka: ['espresso', 'strong espresso'] },
  { slug: 'coffee', name: 'Hot coffee', type: 'other', aka: ['coffee', 'hot coffee'] },
  { slug: 'mint', name: 'Mint', type: 'other', aka: ['mint', 'mint leaves', 'mint sprigs', 'mint sprig'] },

  // --- Seasoning / savory ---
  { slug: 'salt', name: 'Salt', type: 'garnish', aka: ['salt', 'celery salt', 'sea salt'] },
  { slug: 'pepper', name: 'Black pepper', type: 'garnish', aka: ['pepper', 'black pepper'] },
  { slug: 'tabasco', name: 'Hot sauce', type: 'other', aka: ['tabasco', 'hot sauce', 'hot pepper sauce'] },
  { slug: 'worcestershire', name: 'Worcestershire sauce', type: 'other', aka: ['worcestershire sauce', 'worcestershire'] },
  { slug: 'orange-flower-water', name: 'Orange flower water', type: 'other', aka: ['orange flower water'] },

  // --- Garnishes / produce ---
  { slug: 'lime', name: 'Lime', type: 'garnish', aka: ['lime', 'lime wedge', 'lime wheel', 'lime slice', 'lime peel', 'lime cut into small wedges'] },
  { slug: 'lemon', name: 'Lemon', type: 'garnish', aka: ['lemon', 'lemon wedge', 'lemon wheel', 'lemon slice', 'lemon peel', 'lemon twist', 'lemon zest'] },
  { slug: 'orange', name: 'Orange', type: 'garnish', aka: ['orange', 'orange wedge', 'orange wheel', 'orange slice', 'orange peel', 'orange twist', 'orange zest'] },
  { slug: 'maraschino-cherry', name: 'Maraschino cherry', type: 'garnish', aka: ['maraschino cherry', 'cocktail cherry', 'cherry'] },
  { slug: 'pineapple', name: 'Pineapple', type: 'garnish', aka: ['pineapple', 'pineapple wedge', 'pineapple slice'] },
  { slug: 'coffee-beans', name: 'Coffee beans', type: 'garnish', aka: ['coffee beans', 'coffee bean'] },
  { slug: 'nutmeg', name: 'Nutmeg', type: 'garnish', aka: ['nutmeg', 'grated nutmeg'] },
  { slug: 'cucumber', name: 'Cucumber', type: 'garnish', aka: ['cucumber'] },
  { slug: 'chili', name: 'Chili pepper', type: 'garnish', aka: ['chili pepper', 'red chili pepper', 'slices red chili pepper', 'chilli'] },
  { slug: 'ginger', name: 'Fresh ginger', type: 'other', aka: ['ginger', 'sliced fresh ginger', 'size sliced fresh ginger'] },
  { slug: 'basil', name: 'Basil', type: 'other', aka: ['basil', 'basil leaves'] },
];

// Build lookup from aka -> canon entry.
const LOOKUP = new Map();
for (const c of CANON) for (const a of c.aka) LOOKUP.set(a, c);

/** Keyword classifier for anything not in CANON. Word-boundary matched so
 *  "ginger" never trips "gin", "virgin" never trips "gin", etc. */
function classify(cleaned) {
  const has = (...w) =>
    w.some((x) => new RegExp('\\b' + x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(cleaned));
  if (has('bitters')) return { type: 'bitters', alcohol: false };
  // Non-alcoholic categories first (so "red wine syrup" → syrup, not wine).
  if (has('juice')) return { type: 'juice', alcohol: false };
  if (has('syrup', 'grenadine', 'orgeat', 'cordial', 'nectar', 'honey', 'gomme')) return { type: 'syrup', alcohol: false };
  if (has('soda', 'tonic', 'cola', 'ale', 'lemonade', 'seltzer')) return { type: 'mixer', alcohol: false };
  // Alcohol families.
  if (has('whiskey', 'whisky', 'bourbon', 'rye', 'scotch')) return { type: 'spirit', alcohol: true, base: F.whiskey };
  if (has('rum', 'rhum', 'cachaca')) return { type: 'spirit', alcohol: true, base: F.rum };
  if (has('gin')) return { type: 'spirit', alcohol: true, base: F.gin };
  if (has('vodka')) return { type: 'spirit', alcohol: true, base: F.vodka };
  if (has('tequila', 'mezcal', 'mescal')) return { type: 'spirit', alcohol: true, base: F.tequila };
  if (has('cognac', 'brandy', 'pisco', 'calvados', 'grappa', 'armagnac')) return { type: 'spirit', alcohol: true, base: F.brandy };
  if (has('vermouth', 'sherry', 'port', 'lillet', 'wine', 'champagne', 'prosecco', 'sake', 'sekt')) return { type: 'wine', alcohol: true };
  if (has('liqueur', 'curacao', 'schnapps', 'amaro', 'creme de', 'chartreuse', 'triple sec', 'aperitivo')) return { type: 'liqueur', alcohol: true };
  if (has('cream', 'milk', 'egg', 'coffee', 'espresso', 'mint', 'sugar', 'puree', 'pure', 'water')) return { type: 'other', alcohol: false };
  if (has('twist', 'wedge', 'wheel', 'slice', 'peel', 'zest', 'cherry', 'sprig', 'leaf', 'leaves', 'salt', 'garnish')) return { type: 'garnish', alcohol: false };
  return { type: 'other', alcohol: false };
}

const GARNISH_WORDS = /(twist|wedge|wheel|slice|peel|zest|sprig|garnish|for garnish|to garnish|rim|grated)/i;

/**
 * Normalize a raw ingredient string. Returns the canonical ingredient descriptor
 * plus whether the ORIGINAL direction/name reads as a garnish.
 */
export function normalizeIngredient(rawName, direction = '') {
  const cleaned = clean(rawName);
  let entry = LOOKUP.get(cleaned);
  let matched = Boolean(entry);
  if (!entry) {
    const cls = classify(cleaned);
    entry = { slug: slugify(cleaned) || 'unknown', name: titleCase(rawName), ...cls, aka: [] };
  }
  const isGarnish = entry.type === 'garnish' || GARNISH_WORDS.test(direction) || GARNISH_WORDS.test(rawName);
  return {
    slug: entry.slug,
    name: entry.name,
    type: entry.type,
    contains: [
      ...(entry.alcohol ? ['alcohol'] : []),
      ...(entry.contains ?? []),
    ],
    base: entry.base ?? null,
    isGarnish,
    matched,
  };
}

function titleCase(s) {
  return s.replace(/\s+/g, ' ').trim().replace(/\b\w/g, (m) => m.toUpperCase());
}

// --- Unit / amount + field helpers ---

/** Convert a source amount+unit to display oz where sensible; else pass through. */
export function normalizeAmountUnit(amount, unit) {
  const u = String(unit || '').toLowerCase().trim();
  const n = parseFloat(String(amount).replace(',', '.'));
  const toOz = (ml) => {
    const oz = ml / 29.5735;
    return String(Math.round(oz * 4) / 4); // nearest 1/4 oz
  };
  if (Number.isFinite(n)) {
    if (u === 'ml') return { amount: toOz(n), unit: 'oz' };
    if (u === 'cl') return { amount: toOz(n * 10), unit: 'oz' };
    if (u === 'oz') return { amount: String(Math.round(n * 4) / 4), unit: 'oz' };
  }
  const passthrough = {
    'bar spoon': 'bar spoon', dash: 'dash', dashes: 'dash', drops: 'drops', drop: 'drops',
    splash: 'splash', splashes: 'splash', 'top up': 'top', top: 'top', 'fill up': 'top',
    piece: 'piece', whole: 'whole', pinch: 'pinch', shot: 'oz', teaspoon: 'tsp', tsp: 'tsp',
    tablespoon: 'tbsp', tbsp: 'tbsp', part: 'part', leaves: 'leaves', leaf: 'leaves', cup: 'cup',
    wedge: 'wedge', wheel: 'wheel', slice: 'slice', twist: 'twist', sprig: 'sprig', cube: 'cube', rim: 'rim',
  };
  const outUnit = passthrough[u] ?? (u || '');
  const outAmount = Number.isFinite(n) ? String(n) : String(amount || '').trim() || '1';
  return { amount: outAmount, unit: outUnit };
}

const METHOD_KEYWORDS = [
  ['muddle', /muddl/i],
  ['blend', /blend|blender/i],
  ['shake', /shak/i],
  ['stir', /stir/i],
  ['build', /build|pour|fill|top/i],
];

export function normalizeMethod(prep) {
  const p = String(prep || '').toLowerCase();
  for (const [m, re] of METHOD_KEYWORDS) if (re.test(p)) return m;
  return 'build';
}

/** Approximate liquid volume in oz for the ABV estimate (top-offs ≈ 4 oz). */
function volumeOz(amount, unit) {
  const n = parseFloat(amount);
  if (unit === 'oz' && Number.isFinite(n)) return n;
  if (unit === 'top') return 4;
  if (unit === 'splash') return 0.5;
  return 0; // dashes, drops, leaves, pieces, cubes, etc. — negligible volume
}

/** Rough alcoholic strength factor so a finished drink's band reflects proof,
 *  not just spirit volume (wine/vermouth/liqueur are weaker than spirits). */
function strengthFactor(ing) {
  const s = ing.ingredientSlug;
  if (s === 'overproof-rum' || s === 'absinthe') return 1.1;
  if (ing.base) return 1; // a base spirit family
  if (ing.type === 'liqueur') return 0.55;
  if (ing.type === 'wine') {
    if (['sweet-vermouth', 'dry-vermouth', 'port', 'sherry', 'lillet-blanc'].includes(s)) return 0.35;
    if (s === 'guinness') return 0.15;
    return 0.22; // champagne, prosecco, wine
  }
  return 0.5;
}

/** ABV band from the normalized ingredient list, strength-weighted. */
export function inferAbvBand(ingredients) {
  let alc = 0;
  let non = 0;
  let anyAlcohol = false;
  for (const ing of ingredients) {
    if (ing.optional) continue;
    const vol = volumeOz(ing.amount, ing.unit);
    if (ing.contains.includes('alcohol')) {
      anyAlcohol = true;
      alc += vol * strengthFactor(ing);
    } else if (ing.type !== 'garnish' && ing.type !== 'bitters') {
      non += vol;
    }
  }
  if (!anyAlcohol) return 'zero';
  const total = alc + non;
  if (total <= 0) return 'high';
  const ratio = alc / total;
  if (ratio >= 0.6) return 'high';
  if (ratio >= 0.35) return 'medium';
  return 'low';
}

/** Base spirit from the normalized ingredients. */
export function inferSpiritBase(ingredients) {
  const anyAlcohol = ingredients.some((i) => i.contains.includes('alcohol'));
  if (!anyAlcohol) return 'none';
  // Prefer the spirit-family ingredient with the largest oz amount.
  let best = null;
  let bestVol = -1;
  for (const ing of ingredients) {
    if (!ing.base) continue;
    const vol = ing.unit === 'oz' ? parseFloat(ing.amount) || 0 : 0.01;
    if (vol > bestVol) {
      bestVol = vol;
      best = ing.base;
    }
  }
  if (best) return best;
  // No base spirit: aperitivo if built on campari/aperol/amaro/vermouth, else other.
  const slugs = new Set(ingredients.map((i) => i.slug));
  if (['campari', 'aperol', 'cynar', 'amaro-nonino', 'amaro-montenegro', 'fernet-branca'].some((s) => slugs.has(s))) return 'aperitivo';
  return 'other';
}

export { CANON };
