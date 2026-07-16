/**
 * Radar seed dataset — 30 global events with peak date, span, tier, lead
 * weeks, marketplace baseline scores, and creative direction fields.
 * Movable dates (Easter, Eid, Lunar NY, Super Bowl, …) are computed for the
 * 2026–27 window. launchBy is derived, never stored:
 * launchBy = peakDate − leadWeeks × 7d.
 */

export type EventTier = "ultra" | "major" | "sports" | "niche";

export type FixtureEvent = {
  slug: string;
  name: string;
  tier: EventTier;
  region: string;
  peakDate: string;
  spanStart: string;
  spanEnd: string;
  leadWeeks: number;
  etsyScore: number;
  ebayScore: number;
  keywords: string[];
  niches: string[];
  designDirections: string[];
  palettes: string[];
  styles: string[];
  products: string[];
};

function ev(
  slug: string,
  name: string,
  tier: EventTier,
  region: string,
  peakDate: string,
  spanDaysBefore: number,
  spanDaysAfter: number,
  leadWeeks: number,
  etsyScore: number,
  ebayScore: number,
  rest: Pick<
    FixtureEvent,
    "keywords" | "niches" | "designDirections" | "palettes" | "styles" | "products"
  >,
): FixtureEvent {
  const peak = new Date(peakDate + "T00:00:00.000Z").getTime();
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  return {
    slug,
    name,
    tier,
    region,
    peakDate,
    spanStart: iso(peak - spanDaysBefore * 86_400_000),
    spanEnd: iso(peak + spanDaysAfter * 86_400_000),
    leadWeeks,
    etsyScore,
    ebayScore,
    ...rest,
  };
}

export const FIXTURE_EVENTS: FixtureEvent[] = [
  ev("world-cup-final-2026", "FIFA World Cup Final", "sports", "Global", "2026-07-19", 40, 3, 6, 58, 86, {
    keywords: ["world cup 2026", "soccer jersey", "football fan"],
    niches: ["soccer fans", "national pride", "sports bars"],
    designDirections: ["retro federation crests", "bold flag typography"],
    palettes: ["national flag primaries", "vintage grass green + white"],
    styles: ["retro athletic", "bold minimal"],
    products: ["jerseys", "scarves", "wall flags"],
  }),
  ev("back-to-school-2026", "Back to School", "major", "US", "2026-08-20", 30, 14, 6, 78, 71, {
    keywords: ["teacher gift", "first day of school", "backpack tag"],
    niches: ["teachers", "parents", "college dorm"],
    designDirections: ["chalkboard hand-lettering", "playful primary shapes"],
    palettes: ["chalk white on slate", "crayon primaries"],
    styles: ["hand-drawn", "clean grid"],
    products: ["tote bags", "stickers", "desk mats"],
  }),
  ev("oktoberfest-2026", "Oktoberfest", "niche", "EU/US", "2026-09-26", 20, 10, 6, 64, 52, {
    keywords: ["oktoberfest shirt", "prost", "beer festival"],
    niches: ["beer enthusiasts", "german heritage"],
    designDirections: ["bavarian lozenge patterns", "beer-hall lettering"],
    palettes: ["bavarian blue + white", "amber + oak brown"],
    styles: ["heritage badge", "playful illustration"],
    products: ["steins", "t-shirts", "aprons"],
  }),
  ev("nfl-kickoff-2026", "NFL Season Kickoff", "sports", "US", "2026-09-10", 30, 120, 5, 62, 84, {
    keywords: ["football season", "game day", "tailgate"],
    niches: ["team fans", "tailgaters", "fantasy leagues"],
    designDirections: ["varsity block type", "distressed helmets"],
    palettes: ["team duotones", "pigskin brown + field green"],
    styles: ["vintage athletic", "bold collegiate"],
    products: ["tees", "koozies", "car flags"],
  }),
  ev("halloween-2026", "Halloween", "ultra", "Global", "2026-10-31", 60, 2, 10, 96, 88, {
    keywords: ["spooky season", "halloween shirt", "trick or treat"],
    niches: ["horror fans", "kids costumes", "goth aesthetic"],
    designDirections: ["vintage horror poster", "cute-spooky kawaii"],
    palettes: ["pumpkin orange + black", "poison purple + slime green"],
    styles: ["retro print", "kawaii"],
    products: ["costumes", "tees", "party decor"],
  }),
  ev("diwali-2026", "Diwali", "major", "IN/Global", "2026-11-08", 30, 5, 7, 74, 61, {
    keywords: ["diwali gift", "festival of lights", "rangoli"],
    niches: ["south asian diaspora", "home decor"],
    designDirections: ["diya lamp motifs", "geometric rangoli patterns"],
    palettes: ["marigold + deep red", "gold on midnight blue"],
    styles: ["ornate traditional", "modern geometric"],
    products: ["candles", "wall art", "gift boxes"],
  }),
  ev("singles-day-2026", "Singles' Day (11.11)", "major", "Asia/Global", "2026-11-11", 14, 1, 5, 55, 72, {
    keywords: ["11.11 sale", "treat yourself", "single life"],
    niches: ["self-gifting", "e-commerce deal hunters"],
    designDirections: ["bold numeric lockups", "self-love slogans"],
    palettes: ["red + white", "monochrome + neon accent"],
    styles: ["bold minimal", "playful type"],
    products: ["mugs", "phone cases", "hoodies"],
  }),
  ev("thanksgiving-2026", "Thanksgiving", "major", "US", "2026-11-26", 30, 1, 6, 82, 66, {
    keywords: ["thankful shirt", "friendsgiving", "turkey day"],
    niches: ["family gatherings", "friendsgiving hosts"],
    designDirections: ["harvest botanicals", "retro turkey illustration"],
    palettes: ["autumn rust + cream", "cranberry + sage"],
    styles: ["cozy hand-drawn", "retro americana"],
    products: ["aprons", "table runners", "family tees"],
  }),
  ev("bfcm-2026", "Black Friday / Cyber Monday", "ultra", "Global", "2026-11-27", 21, 4, 8, 90, 94, {
    keywords: ["black friday deal", "cyber monday", "doorbuster"],
    niches: ["deal hunters", "gift shoppers"],
    designDirections: ["high-contrast sale lockups", "countdown urgency"],
    palettes: ["black + signal yellow", "black + red"],
    styles: ["bold promo", "stark minimal"],
    products: ["bundles", "gift sets", "bestseller restocks"],
  }),
  ev("hanukkah-2026", "Hanukkah", "major", "US/IL", "2026-12-04", 21, 8, 6, 68, 54, {
    keywords: ["hanukkah gift", "menorah", "eight nights"],
    niches: ["jewish families", "interfaith households"],
    designDirections: ["menorah line art", "star-of-david patterns"],
    palettes: ["royal blue + silver", "navy + gold"],
    styles: ["elegant line art", "playful kids"],
    products: ["candles", "wrapping paper", "kids pajamas"],
  }),
  ev("christmas-2026", "Christmas", "ultra", "Global", "2026-12-25", 60, 1, 12, 98, 92, {
    keywords: ["christmas gift", "matching family pajamas", "ornament"],
    niches: ["family traditions", "ugly sweater parties", "pet owners"],
    designDirections: ["scandinavian folk patterns", "vintage santa print"],
    palettes: ["evergreen + cranberry", "ice blue + silver"],
    styles: ["folk craft", "retro print"],
    products: ["ornaments", "pajamas", "mugs"],
  }),
  ev("nye-2026", "New Year's Eve", "major", "Global", "2026-12-31", 14, 1, 5, 71, 58, {
    keywords: ["nye party", "2027 shirt", "midnight toast"],
    niches: ["party hosts", "resolution setters"],
    designDirections: ["art-deco numerals", "champagne sparkle"],
    palettes: ["black + gold", "midnight + champagne"],
    styles: ["deco glam", "bold numeric"],
    products: ["party kits", "glasses", "tees"],
  }),
  ev("lunar-new-year-2027", "Lunar New Year (Year of the Goat)", "major", "Asia/Global", "2027-02-06", 30, 15, 8, 76, 63, {
    keywords: ["lunar new year", "year of the goat", "red envelope"],
    niches: ["asian diaspora", "cultural gifting"],
    designDirections: ["paper-cut goat motifs", "lantern compositions"],
    palettes: ["lucky red + gold", "plum + jade"],
    styles: ["paper-cut", "modern zodiac"],
    products: ["red envelopes", "wall scrolls", "tees"],
  }),
  ev("ramadan-2027", "Ramadan Begins", "major", "Global", "2027-02-08", 21, 30, 7, 66, 49, {
    keywords: ["ramadan decor", "iftar", "crescent moon"],
    niches: ["muslim households", "modest fashion"],
    designDirections: ["crescent + lantern silhouettes", "geometric tessellation"],
    palettes: ["deep teal + gold", "ivory + sage"],
    styles: ["geometric elegance", "warm minimal"],
    products: ["lanterns", "calendars", "wall art"],
  }),
  ev("super-bowl-2027", "Super Bowl LXI", "sports", "US", "2027-02-14", 21, 1, 5, 60, 87, {
    keywords: ["super bowl party", "game day snacks", "big game"],
    niches: ["team fans", "party hosts", "snack culture"],
    designDirections: ["retro broadcast graphics", "team-city skylines"],
    palettes: ["team duotones", "field green + stadium lights"],
    styles: ["retro sports", "bold promo"],
    products: ["party sets", "tees", "koozies"],
  }),
  ev("valentines-2027", "Valentine's Day", "ultra", "Global", "2027-02-14", 30, 1, 8, 94, 79, {
    keywords: ["valentine gift", "galentines", "anti-valentine"],
    niches: ["couples", "galentines", "single-positive humor"],
    designDirections: ["retro candy-heart type", "hand-drawn botanicals"],
    palettes: ["blush + crimson", "pink + chocolate"],
    styles: ["retro candy", "romantic script"],
    products: ["cards", "mugs", "jewelry dishes"],
  }),
  ev("st-patricks-2027", "St. Patrick's Day", "major", "US/IE", "2027-03-17", 21, 1, 6, 72, 57, {
    keywords: ["shamrock shirt", "lucky", "irish pride"],
    niches: ["irish heritage", "pub crawls"],
    designDirections: ["vintage pub sign lettering", "clover pattern play"],
    palettes: ["kelly green + cream", "green + antique gold"],
    styles: ["pub heritage", "playful type"],
    products: ["tees", "pint glasses", "hats"],
  }),
  ev("eid-al-fitr-2027", "Eid al-Fitr", "major", "Global", "2027-03-10", 14, 7, 6, 70, 51, {
    keywords: ["eid mubarak", "eid gift", "eid outfit"],
    niches: ["muslim families", "gifting"],
    designDirections: ["crescent geometry", "festive calligraphy"],
    palettes: ["emerald + gold", "blush + pearl"],
    styles: ["calligraphic", "modern festive"],
    products: ["gift boxes", "banners", "kids tees"],
  }),
  ev("easter-2027", "Easter", "ultra", "Global", "2027-03-28", 30, 2, 8, 88, 68, {
    keywords: ["easter basket", "bunny shirt", "egg hunt"],
    niches: ["young families", "faith communities"],
    designDirections: ["watercolor spring botanicals", "retro bunny illustration"],
    palettes: ["pastel meadow", "lilac + butter yellow"],
    styles: ["watercolor", "cute retro"],
    products: ["baskets", "kids tees", "decor"],
  }),
  ev("march-madness-2027", "March Madness Final", "sports", "US", "2027-04-05", 25, 1, 4, 54, 78, {
    keywords: ["bracket", "college hoops", "final four"],
    niches: ["college fans", "office pools"],
    designDirections: ["bracket infographics", "varsity court textures"],
    palettes: ["school duotones", "hardwood + net white"],
    styles: ["collegiate", "infographic"],
    products: ["tees", "posters", "koozies"],
  }),
  ev("earth-day-2027", "Earth Day", "niche", "Global", "2027-04-22", 14, 3, 5, 61, 42, {
    keywords: ["earth day", "eco friendly", "plant lover"],
    niches: ["sustainability", "gardeners", "outdoor brands"],
    designDirections: ["botanical line art", "vintage park posters"],
    palettes: ["moss + soil", "ocean blue + leaf"],
    styles: ["line art", "national-park retro"],
    products: ["totes", "water bottles", "prints"],
  }),
  ev("cinco-de-mayo-2027", "Cinco de Mayo", "niche", "US/MX", "2027-05-05", 14, 1, 5, 59, 47, {
    keywords: ["cinco de mayo", "fiesta", "taco party"],
    niches: ["party hosts", "mexican-american pride"],
    designDirections: ["papel picado motifs", "hand-painted sign lettering"],
    palettes: ["fiesta brights", "terracotta + cactus green"],
    styles: ["folk festive", "hand-lettered"],
    products: ["banners", "tees", "barware"],
  }),
  ev("teacher-appreciation-2027", "Teacher Appreciation Week", "niche", "US", "2027-05-04", 14, 4, 5, 75, 44, {
    keywords: ["teacher gift", "best teacher ever", "apple"],
    niches: ["parents", "room moms", "school staff"],
    designDirections: ["notebook doodle style", "apple + ruler motifs"],
    palettes: ["classroom brights", "kraft + red apple"],
    styles: ["doodle", "warm minimal"],
    products: ["mugs", "totes", "keychains"],
  }),
  ev("mothers-day-2027", "Mother's Day", "ultra", "US/Global", "2027-05-09", 30, 1, 8, 97, 81, {
    keywords: ["gift for mom", "mama shirt", "first mothers day"],
    niches: ["new moms", "grandmas", "plant moms"],
    designDirections: ["botanical script", "vintage floral frames"],
    palettes: ["blush + sage", "peony + cream"],
    styles: ["romantic script", "modern floral"],
    products: ["jewelry", "mugs", "candles"],
  }),
  ev("graduation-2027", "Graduation Season", "major", "US/Global", "2027-05-22", 30, 21, 7, 84, 62, {
    keywords: ["class of 2027", "grad gift", "senior year"],
    niches: ["high school seniors", "college grads", "proud parents"],
    designDirections: ["tassel + cap iconography", "yearbook type"],
    palettes: ["school colors", "black + metallic gold"],
    styles: ["yearbook", "bold type"],
    products: ["frames", "tees", "banners"],
  }),
  ev("wedding-season-2027", "Wedding Season Peak", "major", "Global", "2027-06-12", 60, 60, 10, 92, 58, {
    keywords: ["bachelorette", "bridesmaid gift", "wedding favor"],
    niches: ["brides", "bridal parties", "wedding planners"],
    designDirections: ["modern serif monograms", "hand-drawn florals"],
    palettes: ["ivory + eucalyptus", "champagne + dusty blue"],
    styles: ["elegant serif", "botanical"],
    products: ["favors", "robes", "signage"],
  }),
  ev("nba-finals-2027", "NBA Finals", "sports", "US/Global", "2027-06-17", 20, 3, 4, 56, 82, {
    keywords: ["nba finals", "basketball fan", "championship"],
    niches: ["team fans", "sneakerheads"],
    designDirections: ["court-line geometry", "retro jersey type"],
    palettes: ["team duotones", "hardwood + neon"],
    styles: ["retro athletic", "street"],
    products: ["tees", "posters", "hats"],
  }),
  ev("pride-2027", "Pride", "major", "Global", "2027-06-28", 45, 5, 8, 86, 60, {
    keywords: ["pride outfit", "lgbtq", "love is love"],
    niches: ["lgbtq+ community", "allies", "pride parades"],
    designDirections: ["flag-spectrum typography", "protest poster energy"],
    palettes: ["rainbow spectrum", "trans flag pastels"],
    styles: ["bold type", "poster punk"],
    products: ["tees", "pins", "flags"],
  }),
  ev("fourth-july-2027", "4th of July", "ultra", "US", "2027-07-04", 30, 1, 7, 89, 74, {
    keywords: ["4th of july shirt", "america", "fireworks"],
    niches: ["bbq hosts", "lake life", "small-town parades"],
    designDirections: ["vintage americana badges", "firework line art"],
    palettes: ["flag red + navy + cream", "faded americana"],
    styles: ["retro americana", "distressed print"],
    products: ["tees", "coolers", "hats"],
  }),
  ev("back-to-school-2027", "Back to School 2027", "major", "US", "2027-08-19", 30, 14, 6, 78, 71, {
    keywords: ["teacher gift", "first day of school", "kindergarten"],
    niches: ["teachers", "parents", "college dorm"],
    designDirections: ["chalkboard hand-lettering", "playful primary shapes"],
    palettes: ["chalk white on slate", "crayon primaries"],
    styles: ["hand-drawn", "clean grid"],
    products: ["tote bags", "stickers", "desk mats"],
  }),
  ev("world-teachers-day-2026", "World Teachers' Day", "niche", "Global", "2026-10-05", 14, 2, 5, 63, 40, {
    keywords: ["teacher appreciation", "world teachers day"],
    niches: ["teachers", "school communities"],
    designDirections: ["pencil + book motifs", "warm quote lockups"],
    palettes: ["kraft + classroom red", "soft neutrals"],
    styles: ["warm minimal", "doodle"],
    products: ["mugs", "cards", "totes"],
  }),
];

export function launchBy(e: FixtureEvent): Date {
  const peak = new Date(e.peakDate + "T00:00:00.000Z");
  return new Date(peak.getTime() - e.leadWeeks * 7 * 86_400_000);
}

/** days from `now` until the launch-by deadline (negative = past due) */
export function daysUntilLaunchBy(e: FixtureEvent, now = new Date()): number {
  return Math.ceil((launchBy(e).getTime() - now.getTime()) / 86_400_000);
}
