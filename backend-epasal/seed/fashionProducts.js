/**
 * Fashion catalogue seed data.
 * ----------------------------------------------------------------------------
 * Pure data module — no database access here. `seedProducts.js` (repo root)
 * reads this file, enriches each row with generated fields (id, SKU, slug,
 * stock, rating, timestamps, etc.) and writes the result to MongoDB.
 *
 * IMAGE_BANK holds real, verified-reachable Unsplash photo URLs keyed by
 * garment/accessory type. Every URL was checked with an HTTP HEAD request
 * before being added here. Only images.unsplash.com is used — that's the
 * one third-party image host allowed by the app's CSP img-src directive
 * (backend helmet.config.ts / frontend index.html + netlify.toml /
 * vercel.json), so anything hosted elsewhere silently fails to render in
 * the browser. `buildImageUrl()` in seedProducts.js appends size query
 * params so repeated use of the same base photo never produces two
 * byte-identical URLs.
 */

const IMAGE_BANK = {
  mens_tshirt: [
    'https://images.unsplash.com/photo-1503341504253-dff4815485f1',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab',
    'https://images.unsplash.com/photo-1562157873-818bc0726f68',
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27',
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a',
    'https://images.unsplash.com/photo-1613852348851-df1739db8201',
    'https://images.unsplash.com/photo-1618354691373-d851c5c3a990',
  ],
  mens_shirt: [
    'https://images.unsplash.com/photo-1563630423918-b58f07336ac9',
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c',
    'https://images.unsplash.com/photo-1598033129183-c4f50c736f10',
    'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf',
    'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4',
  ],
  mens_polo: [
    'https://images.unsplash.com/photo-1625910513399-c9fcba54338c',
    'https://images.unsplash.com/photo-1714317438040-0e8584215699',
    'https://images.unsplash.com/photo-1671438118097-479e63198629',
    'https://images.unsplash.com/photo-1720514496161-914011a9ee02',
  ],
  mens_hoodie: [
    'https://images.unsplash.com/photo-1509942774463-acf339cf87d5',
    'https://images.unsplash.com/photo-1556821840-3a63f95609a7',
    'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633',
  ],
  mens_jacket: [
    'https://images.unsplash.com/photo-1544923246-77307dd654cb',
    'https://images.unsplash.com/photo-1548126032-079a0fb0099d',
    'https://images.unsplash.com/photo-1551028719-00167b16eac5',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea',
    'https://images.unsplash.com/photo-1601333144130-8cbb312386b6',
  ],
  mens_jeans: [
    'https://images.unsplash.com/photo-1542272604-787c3835535d',
    'https://images.unsplash.com/photo-1555689502-c4b22d76c56f',
    'https://images.unsplash.com/photo-1570308345368-f21d4b0d81a9',
  ],
  mens_chinos: [
    'https://images.unsplash.com/photo-1473966968600-fa801b869a1a',
    'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80',
    'https://images.unsplash.com/photo-1678274342617-09c13eefab9f',
    'https://images.unsplash.com/photo-1781145611661-269c4a28d08b',
  ],
  mens_shorts: [
    'https://images.unsplash.com/photo-1591195853828-11db59a44f6b',
    'https://images.unsplash.com/photo-1621496503717-095a410e1566',
    'https://images.unsplash.com/photo-1697319452360-ee47502e39f6',
  ],
  mens_blazer: [
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf',
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35',
    'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc',
  ],
  mens_suit: [
    'https://images.unsplash.com/photo-1593032465175-481ac7f401a0',
    'https://images.unsplash.com/photo-1618886614638-80e3c103d31a',
    'https://images.unsplash.com/photo-1617137968427-85924c800a22',
    'https://images.unsplash.com/photo-1603394151492-5e9b974b090b',
  ],
  womens_dress: [
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c',
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446',
    'https://images.unsplash.com/photo-1566174053879-31528523f8ae',
    'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1',
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8',
    'https://images.unsplash.com/photo-1591369822096-ffd140ec948f',
  ],
  womens_top: [
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105',
    'https://images.unsplash.com/photo-1554568218-0f1715e72254',
  ],
  womens_tshirt: [
    'https://images.unsplash.com/photo-1502324419495-6705519dd08b',
    'https://images.unsplash.com/photo-1622445270936-5dcb604970e7',
    'https://images.unsplash.com/photo-1525828024186-5294af6c926d',
    'https://images.unsplash.com/photo-1610142991820-e02266a4a9f0',
  ],
  womens_shirt: [
    'https://images.unsplash.com/photo-1608234808654-2a8875faa7fd',
    'https://images.unsplash.com/photo-1497920261388-9c5866b65061',
  ],
  womens_hoodie: [
    'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633',
    'https://images.unsplash.com/photo-1570577428705-3779104717b4',
  ],
  womens_sweater: [
    'https://images.unsplash.com/photo-1574201635302-388dd92a4c3f',
    'https://images.unsplash.com/photo-1608984361471-ff566593088f',
    'https://images.unsplash.com/photo-1588271968087-4c51abe05afc',
  ],
  womens_jacket: [
    'https://images.unsplash.com/photo-1544022613-e87ca75a784a',
    'https://images.unsplash.com/photo-1602370087990-45153f02841b',
  ],
  womens_jeans: [
    'https://images.unsplash.com/photo-1475178626620-a4d074967452',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246',
  ],
  womens_skirt: [
    'https://images.unsplash.com/photo-1577900232427-18219b9166a0',
    'https://images.unsplash.com/photo-1573012820529-575ffb427837',
  ],
  womens_pants: [
    'https://images.unsplash.com/photo-1560243563-062bfc001d68',
    'https://images.unsplash.com/photo-1580651214613-f4692d6d138f',
    'https://images.unsplash.com/photo-1552902875-9ac1f9fe0c07',
    'https://images.unsplash.com/photo-1590159983013-d4ff5fc71c1d',
  ],
  womens_leggings: [
    'https://images.unsplash.com/photo-1518310383802-640c2de311b2',
    'https://images.unsplash.com/photo-1552196563-55cd4e45efb3',
    'https://images.unsplash.com/photo-1584863495140-a320b13a11a8',
  ],
  kids_boys: [
    'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4',
    'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea',
  ],
  kids_girls: [
    'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7',
    'https://images.unsplash.com/photo-1726153049464-f423dd75cdf9',
    'https://images.unsplash.com/photo-1599624427857-461fd60c23e5',
    'https://images.unsplash.com/photo-1620774760711-caa4c94d683a',
  ],
  kids_baby: [
    'https://images.unsplash.com/photo-1519689680058-324335c77eba',
    'https://images.unsplash.com/photo-1522771930-78848d9293e8',
    'https://images.unsplash.com/photo-1622290319146-7b63df48a635',
    'https://images.unsplash.com/photo-1622290291720-ac961c43ee30',
  ],
  sneakers: [
    'https://images.unsplash.com/photo-1460353581641-37baddab0fa2',
    'https://images.unsplash.com/photo-1465453869711-7e174808ace9',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
    'https://images.unsplash.com/photo-1549298916-b41d501d3772',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a',
  ],
  running_shoes: [
    'https://images.unsplash.com/photo-1483721310020-03333e577078',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86',
  ],
  boots: [
    'https://images.unsplash.com/photo-1520639888713-7851133b1ed0',
    'https://images.unsplash.com/photo-1638247025967-b4e38f787b76',
  ],
  sandals: [
    'https://images.unsplash.com/photo-1562273138-f46be4ebdf33',
    'https://images.unsplash.com/photo-1603487742131-4160ec999306',
  ],
  heels: [
    'https://images.unsplash.com/photo-1518049362265-d5b2a6467637',
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2',
    'https://images.unsplash.com/photo-1596703263926-eb0762ee17e4',
  ],
  flats: [
    'https://images.unsplash.com/photo-1560343090-f0409e92791a',
    'https://images.unsplash.com/photo-1604136172384-b2e9c43271ec',
  ],
  loafers: [
    'https://images.unsplash.com/photo-1533867617858-e7b97e060509',
    'https://images.unsplash.com/photo-1614253429340-98120bd6d753',
  ],
  watches: [
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1',
    'https://images.unsplash.com/photo-1524592094714-0f0654e20314',
    'https://images.unsplash.com/photo-1547996160-81dfa63595aa',
  ],
  sunglasses: [
    'https://images.unsplash.com/photo-1508296695146-257a814070b4',
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f',
    'https://images.unsplash.com/photo-1577803645773-f96470509666',
  ],
  caps: [
    'https://images.unsplash.com/photo-1517941823-815bea90d291',
    'https://images.unsplash.com/photo-1521369909029-2afed882baee',
    'https://images.unsplash.com/photo-1556306535-0f09a537f0a3',
    'https://images.unsplash.com/photo-1588850561407-ed78c282e89b',
  ],
  handbags: [
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa',
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3',
    'https://images.unsplash.com/photo-1591561954557-26941169b49e',
  ],
  wallets: [
    'https://images.unsplash.com/photo-1627123424574-724758594e93',
    'https://images.unsplash.com/photo-1601592996763-f05c9c80a7f1',
    'https://images.unsplash.com/photo-1624538000860-24716b9050f2',
    'https://images.unsplash.com/photo-1612023395494-1c4050b68647',
  ],
  belts: [
    'https://images.unsplash.com/photo-1624222247344-550fb60583dc',
    'https://images.unsplash.com/photo-1664286074176-5206ee5dc878',
    'https://images.unsplash.com/photo-1705493655920-20c572928501',
  ],
  backpacks: [
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62',
    'https://images.unsplash.com/photo-1577733966973-d680bffd2e80',
  ],
  scarves: [
    'https://images.unsplash.com/photo-1677478863154-55ecce8c7536',
    'https://images.unsplash.com/photo-1689193502879-362660fad4a8',
  ],
  jewelry: [
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338',
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908',
    'https://images.unsplash.com/photo-1573408301185-9146fe634ad0',
    'https://images.unsplash.com/photo-1599643477877-530eb83abc8e',
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a',
  ],
  socks: [
    'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82',
    'https://images.unsplash.com/photo-1727498830440-339a797d8423',
    'https://images.unsplash.com/photo-1778953762278-10c8a42ded85',
    'https://images.unsplash.com/photo-1733410027829-c6622454c8b3',
  ],
  gymwear: [
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
  ],
  trackpants: [
    'https://images.unsplash.com/photo-1518459031867-a89b944bffe4',
    'https://images.unsplash.com/photo-1769330651222-7b26001b1a57',
    'https://images.unsplash.com/photo-1715532098035-a343b26eaeaa',
  ],
  sportstshirt: [
    'https://images.unsplash.com/photo-1517466787929-bc90951d0974',
    'https://images.unsplash.com/photo-1716369786631-b8b9c7ac1dc4',
    'https://images.unsplash.com/photo-1716952029045-feb119b58583',
    'https://images.unsplash.com/photo-1532202193792-e95ef22f1bce',
  ],
  sportsshoes: [
    'https://images.unsplash.com/photo-1465453869711-7e174808ace9',
    'https://images.unsplash.com/photo-1539185441755-769473a23570',
    'https://images.unsplash.com/photo-1562183241-b937e95585b6',
  ],
};

// Top-level department -> sub-category tree. Mirrors the Category model's
// parentId/ancestors tree (see src/models/Category.ts) so the seed script can
// create both levels and resolve each product to its leaf category id.
const CATEGORY_TREE = [
  { name: 'Men', subcategories: ['T-Shirts', 'Shirts', 'Polo Shirts', 'Hoodies', 'Jackets', 'Jeans', 'Chinos', 'Shorts', 'Blazers', 'Suits'] },
  { name: 'Women', subcategories: ['Dresses', 'Tops', 'T-Shirts', 'Shirts', 'Hoodies', 'Sweaters', 'Jackets', 'Jeans', 'Skirts', 'Pants', 'Leggings'] },
  { name: 'Kids', subcategories: ['Boys Clothing', 'Girls Clothing', 'Baby Wear'] },
  { name: 'Footwear', subcategories: ['Sneakers', 'Running Shoes', 'Boots', 'Sandals', 'Heels', 'Flats', 'Loafers'] },
  { name: 'Accessories', subcategories: ['Watches', 'Sunglasses', 'Caps', 'Handbags', 'Wallets', 'Belts', 'Backpacks', 'Scarves', 'Jewelry', 'Socks'] },
  { name: 'Sportswear', subcategories: ['Gym Wear', 'Track Pants', 'Sports T-Shirts', 'Sports Shoes'] },
];

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SHOE_SIZES = ['38', '39', '40', '41', '42', '43', '44'];
const ONE_SIZE = ['One Size'];

/**
 * Turns compact row tuples into full product records. Keeps the creative
 * content (title/brand/colors/material/price/copy) easy to scan while the
 * repetitive shape (category, subcategory, sizing, tags) is filled in once
 * per subcategory block.
 */
function mk(category, subcategory, imageKey, gender, sizes, rows) {
  return rows.map(([title, brand, colors, material, price, discountPrice, shortDescription, description, extraTags]) => ({
    category,
    subcategory,
    imageKey,
    gender,
    title,
    brand,
    color: colors[0],
    availableColors: colors,
    material,
    availableSizes: sizes,
    price,
    discountPrice: discountPrice || 0,
    shortDescription,
    description,
    tags: [
      gender.toLowerCase(),
      ...category.toLowerCase().split(/\s+/),
      ...subcategory.toLowerCase().replace(/'/g, '').split(/\s+/),
      ...(extraTags || []),
    ],
  }));
}

const PRODUCTS = [
  // ============================== MEN ==============================
  ...mk('Men', 'T-Shirts', 'mens_tshirt', 'Men', CLOTHING_SIZES, [
    ['Essential Crew Neck Cotton Tee', 'Uniqlo', ['White', 'Black', 'Navy'], '100% Combed Cotton', 25, 0, 'Everyday soft cotton crew tee.', 'A wardrobe staple cut from breathable combed cotton with a tag-free neck label and reinforced shoulder seams that hold their shape wash after wash.', ['basics', 'crew-neck']],
    ['Graphic Print Oversized Tee', 'H&M', ['Black', 'White', 'Gray'], '100% Cotton Jersey', 28, 22, 'Relaxed oversized tee with front print.', 'Drop-shoulder oversized fit in heavyweight cotton jersey, finished with a large front graphic and a ribbed crew neckline for a street-ready silhouette.', ['oversized', 'graphic', 'streetwear']],
    ['Dri-FIT Performance Tee', 'Nike', ['Black', 'Gray', 'Blue'], 'Polyester Dri-FIT Blend', 32, 0, 'Sweat-wicking training tee.', 'Lightweight Dri-FIT fabric pulls sweat away from the skin and dries fast, with mesh side panels for extra airflow during high-intensity training.', ['dri-fit', 'training']],
    ['V-Neck Slub Cotton Tee', 'Zara', ['Beige', 'White', 'Navy'], 'Slub Cotton', 22, 0, 'Textured slub-cotton V-neck.', 'Garment-dyed slub cotton gives this V-neck a lived-in texture, paired with a slim body and short set-in sleeves for a clean layering piece.', ['v-neck', 'slub']],
  ]),
  ...mk('Men', 'Shirts', 'mens_shirt', 'Men', CLOTHING_SIZES, [
    ['Slim Fit Oxford Cotton Shirt', 'Tommy Hilfiger', ['White', 'Blue', 'Navy'], '100% Oxford Cotton', 62, 49, 'Classic button-down Oxford shirt.', 'Woven from durable Oxford cotton with a button-down collar and single chest pocket, tailored in a slim fit that layers cleanly under knitwear.', ['oxford', 'button-down']],
    ['Checked Flannel Shirt', 'Zara', ['Red', 'Green', 'Gray'], 'Brushed Cotton Flannel', 45, 0, 'Brushed flannel check shirt.', 'Soft brushed-cotton flannel in a classic check, with a straight hem and dual chest pockets built for cool-weather layering.', ['flannel', 'check']],
    ['Linen Blend Short Sleeve Shirt', 'H&M', ['Beige', 'White', 'Blue'], 'Linen-Cotton Blend', 39, 29, 'Breathable linen-blend summer shirt.', 'A linen-cotton weave that breathes in the heat, cut with a relaxed camp collar and short sleeves for warm-weather rotation.', ['linen', 'summer']],
    ['Stretch Poplin Dress Shirt', 'Calvin Klein', ['White', 'Black', 'Navy'], 'Cotton-Elastane Poplin', 68, 0, 'Wrinkle-resistant stretch poplin shirt.', 'Poplin weave with a touch of stretch keeps its crisp finish through the workday, tailored slim with a spread collar for a modern formal look.', ['formal', 'stretch']],
  ]),
  ...mk('Men', 'Polo Shirts', 'mens_polo', 'Men', CLOTHING_SIZES, [
    ['Classic Pique Polo Shirt', 'Tommy Hilfiger', ['Navy', 'White', 'Red'], '100% Cotton Pique', 55, 44, 'Signature cotton pique polo.', 'Textured cotton pique with a ribbed collar and two-button placket, cut in a regular fit true to the brand\'s heritage silhouette.', ['pique', 'heritage']],
    ['Performance Golf Polo', 'Puma', ['Black', 'Gray', 'Blue'], 'Moisture-Wicking Polyester', 48, 0, 'Stretch performance golf polo.', 'Four-way stretch fabric with moisture-wicking finish keeps this polo dry through 18 holes, with a self-fabric collar that resists curling.', ['golf', 'performance']],
    ['Slim Fit Cotton Polo', 'Calvin Klein', ['White', 'Black', 'Navy'], 'Mercerised Cotton', 52, 0, 'Mercerised cotton slim polo.', 'Mercerised cotton gives this polo a subtle sheen and smooth hand-feel, tailored slim with a short rib-knit collar.', ['slim-fit', 'mercerised']],
    ['Essential Pique Polo', 'Uniqlo', ['Beige', 'Green', 'White'], 'Cotton Pique', 30, 24, 'Everyday cotton pique polo.', 'A no-fuss cotton pique polo with a straight hem and reinforced collar seam, built for regular wear and easy care.', ['essential', 'everyday']],
  ]),
  ...mk('Men', 'Hoodies', 'mens_hoodie', 'Men', CLOTHING_SIZES, [
    ['Fleece Pullover Hoodie', 'Nike', ['Gray', 'Black', 'Navy'], 'Cotton-Poly Fleece', 65, 52, 'Brushed fleece pullover hoodie.', 'Brushed-back fleece traps warmth without the bulk, finished with a kangaroo pocket and adjustable drawcord hood.', ['fleece', 'pullover']],
    ['Zip-Up Tech Hoodie', 'Adidas', ['Black', 'Gray', 'Blue'], 'Polyester Tech Fleece', 72, 0, 'Full-zip tech fleece hoodie.', 'Tech fleece regulates temperature during warm-ups and cool-downs, with a full front zip and ribbed cuffs for a snug fit.', ['zip-up', 'tech-fleece']],
    ['Heavyweight Logo Hoodie', 'Under Armour', ['Black', 'Gray', 'Red'], 'Loopback Cotton Fleece', 68, 54, 'Heavyweight loopback fleece hoodie.', 'Loopback cotton fleece with a dense hand-feel, screen-printed chest logo, and a lined hood that holds its shape.', ['heavyweight', 'logo']],
    ['Essential Crew Fleece Hoodie', 'H&M', ['Beige', 'Navy', 'Black'], 'Cotton Fleece', 42, 0, 'Everyday soft fleece hoodie.', 'Soft-brushed fleece in a relaxed fit with dropped shoulders, a roomy pocket, and a drawstring hood for daily layering.', ['relaxed', 'basics']],
  ]),
  ...mk('Men', 'Jackets', 'mens_jacket', 'Men', CLOTHING_SIZES, [
    ['Waxed Cotton Field Jacket', 'North Face', ['Brown', 'Green', 'Black'], 'Waxed Cotton Canvas', 165, 139, 'Weatherproof waxed cotton jacket.', 'Waxed cotton canvas sheds light rain and wind, tailored with multiple utility pockets and a corduroy under-collar for classic field style.', ['waxed', 'field-jacket']],
    ['Insulated Puffer Jacket', 'Columbia', ['Black', 'Navy', 'Gray'], 'Recycled Polyester, Synthetic Fill', 145, 119, 'Lightweight insulated puffer.', 'Synthetic insulation traps body heat without adding bulk, packed into a wind-resistant recycled shell with an elastic-bound hem.', ['puffer', 'insulated']],
    ['Classic Trucker Denim Jacket', "Levi's", ['Blue', 'Black'], '100% Rigid Denim', 98, 0, 'Iconic rigid denim trucker jacket.', 'Rigid denim in the brand\'s original trucker cut, with a button front, chest flap pockets, and a fit that softens with every wash.', ['denim', 'trucker']],
    ['Faux Leather Biker Jacket', 'Zara', ['Black', 'Brown'], 'Faux Leather, Polyester Lining', 129, 99, 'Quilted-lining faux leather biker.', 'Faux leather with an asymmetric zip front and quilted satin lining, cut close to the body for an edge-forward silhouette.', ['biker', 'faux-leather']],
    ['Water-Resistant Windbreaker', 'Columbia', ['Navy', 'Gray', 'Green'], 'Ripstop Nylon', 88, 0, 'Packable ripstop windbreaker.', 'Ripstop nylon with taped seams blocks wind and light rain, packing down into its own chest pocket for travel.', ['windbreaker', 'packable']],
  ]),
  ...mk('Men', 'Jeans', 'mens_jeans', 'Men', CLOTHING_SIZES, [
    ['501 Original Straight Jeans', "Levi's", ['Blue', 'Black'], '100% Rigid Denim', 78, 0, 'The original straight-leg denim.', 'Button-fly rigid denim cut in the brand\'s original straight leg, sitting at the waist with a fit that\'s built to be broken in over time.', ['straight-leg', 'rigid']],
    ['Slim Fit Stretch Jeans', 'Calvin Klein', ['Black', 'Navy', 'Gray'], 'Cotton-Elastane Denim', 85, 68, 'Stretch denim slim jeans.', 'A touch of elastane keeps this slim-through-the-leg denim comfortable all day, finished with a clean five-pocket construction.', ['slim-fit', 'stretch']],
    ['Ripped Skinny Jeans', 'H&M', ['Blue', 'Gray'], 'Cotton Blend Denim', 52, 39, 'Distressed skinny-fit denim.', 'Skinny through the hip and thigh with authentic rip-and-repair distressing across the knees for an off-duty edge.', ['skinny', 'distressed']],
    ['Tapered Fit Jogger Jeans', 'Zara', ['Black', 'Gray'], 'Cotton-Poly Denim', 56, 0, 'Jogger-cut denim with elastic hem.', 'Denim jogger hybrid with an elasticated waistband and tapered cuffed hem, built for comfort without losing a denim look.', ['jogger', 'tapered']],
  ]),
  ...mk('Men', 'Chinos', 'mens_chinos', 'Men', CLOTHING_SIZES, [
    ['Slim Fit Stretch Chinos', 'Uniqlo', ['Beige', 'Navy', 'Gray'], 'Cotton-Spandex Twill', 45, 0, 'Everyday stretch cotton chinos.', 'Cotton twill with added spandex moves with you through the day, tailored slim with a flat front and clean-finished hem.', ['slim-fit', 'stretch']],
    ['Straight Leg Cotton Chinos', 'Zara', ['Khaki', 'Gray', 'Navy'], '100% Cotton Twill', 49, 0, 'Classic straight-leg twill chinos.', 'Mid-weight cotton twill cut with a straight leg and gentle taper, finished with a button-and-hook closure for a sharp waistband.', ['straight-leg', 'twill']],
    ['Tapered Fit Chino Trousers', 'Tommy Hilfiger', ['Beige', 'Navy'], 'Cotton Twill', 68, 54, 'Signature tapered chino trousers.', 'A tapered leg and clean front finish give these twill chinos a smart-casual edge, complete with the brand\'s signature back-pocket flag.', ['tapered', 'smart-casual']],
    ['Relaxed Fit Cargo Chinos', 'H&M', ['Green', 'Beige'], 'Cotton Ripstop', 44, 0, 'Utility cargo chinos.', 'Ripstop cotton with side cargo pockets and a relaxed leg, built for utility without sacrificing a tailored waistband.', ['cargo', 'utility']],
  ]),
  ...mk('Men', 'Shorts', 'mens_shorts', 'Men', CLOTHING_SIZES, [
    ['Chino Walk Shorts', 'H&M', ['Beige', 'Navy', 'Gray'], 'Cotton Twill', 32, 0, 'Classic above-knee chino shorts.', 'Cotton twill chino shorts finished just above the knee, with a flat front and side slant pockets for warm-weather rotation.', ['chino', 'walk-shorts']],
    ['Woven Training Shorts', 'Nike', ['Black', 'Gray', 'Blue'], 'Lightweight Woven Polyester', 35, 28, 'Lightweight woven training shorts.', 'A lightweight woven shell with a built-in liner and side splits allows full range of motion during training sessions.', ['training', 'lined']],
    ['Denim Cut-Off Shorts', 'Zara', ['Blue', 'Black'], '100% Cotton Denim', 38, 0, 'Raw-hem denim shorts.', 'Mid-weight denim finished with a raw cut-off hem, sitting at the waist with the brand\'s classic five-pocket layout.', ['denim', 'raw-hem']],
  ]),
  ...mk('Men', 'Blazers', 'mens_blazer', 'Men', CLOTHING_SIZES, [
    ['Two-Button Wool Blend Blazer', 'Zara', ['Navy', 'Gray', 'Black'], 'Wool-Polyester Blend', 145, 119, 'Tailored two-button wool blazer.', 'A wool-blend cloth with a soft structured shoulder and notch lapel, tailored slim for a modern take on office formalwear.', ['tailored', 'formal']],
    ['Unstructured Cotton Blazer', 'H&M', ['Beige', 'Navy'], 'Cotton-Linen Blend', 98, 79, 'Soft unstructured summer blazer.', 'An unstructured build and breathable cotton-linen weave make this blazer light enough to wear open through the warmer months.', ['unstructured', 'summer']],
    ['Slim Fit Check Blazer', 'Calvin Klein', ['Gray', 'Navy'], 'Wool Blend Check', 165, 0, 'Sharp check-pattern blazer.', 'A subtle check woven through premium wool blend, cut slim with double vents and a half-canvas construction for structure that lasts.', ['check', 'slim-fit']],
  ]),
  ...mk('Men', 'Suits', 'mens_suit', 'Men', CLOTHING_SIZES, [
    ['Slim Fit Two-Piece Suit', 'Calvin Klein', ['Navy', 'Charcoal'], 'Wool Blend', 320, 279, 'Modern slim two-piece suit.', 'A wool-blend two-piece cut slim through the body, with a flat-front trouser and jacket built on a half-canvas base for a clean drape.', ['two-piece', 'formal']],
    ['Classic Fit Wool Suit', 'Tommy Hilfiger', ['Charcoal', 'Navy'], '100% Wool', 350, 0, 'Timeless classic-fit wool suit.', 'Pure wool cloth tailored in a classic fit with a single-breasted jacket and pleated trouser for all-day boardroom comfort.', ['classic-fit', 'wool']],
    ['Slim Fit Three-Piece Suit', 'Zara', ['Navy', 'Gray'], 'Wool-Viscose Blend', 295, 249, 'Three-piece suit with waistcoat.', 'A wool-viscose blend suit complete with matching waistcoat, tailored slim for a sharp finish at formal occasions.', ['three-piece', 'waistcoat']],
  ]),

  // ============================== WOMEN ==============================
  ...mk('Women', 'Dresses', 'womens_dress', 'Women', CLOTHING_SIZES, [
    ['Floral Print Wrap Dress', 'Zara', ['Pink', 'White', 'Green'], 'Viscose Crepe', 68, 54, 'Flowing floral wrap dress.', 'Fluid viscose crepe printed with an all-over floral, cut in a wrap silhouette that ties at the waist and falls to a midi length.', ['floral', 'wrap-dress']],
    ['Ribbed Knit Bodycon Dress', 'H&M', ['Black', 'Beige', 'Navy'], 'Ribbed Viscose Knit', 42, 0, 'Fitted ribbed knit dress.', 'Stretch ribbed knit hugs the body from a round neckline down to a knee-skimming hem, finished with long fitted sleeves.', ['bodycon', 'ribbed-knit']],
    ['Satin Slip Midi Dress', 'Guess', ['Black', 'Red', 'Pink'], 'Satin Polyester', 89, 71, 'Elegant satin slip dress.', 'Liquid satin cut on the bias for a fluid drape, with adjustable straps and a cowl neckline that dresses up any evening out.', ['satin', 'slip-dress']],
    ['Linen Blend Shirt Dress', 'Forever 21', ['Beige', 'White', 'Blue'], 'Linen-Cotton Blend', 55, 44, 'Breezy linen shirt dress.', 'A linen-cotton weave shirt dress with a button-through front, collared neckline, and a tie waist for a relaxed daytime shape.', ['shirt-dress', 'linen']],
  ]),
  ...mk('Women', 'Tops', 'womens_top', 'Women', CLOTHING_SIZES, [
    ['Silky Cami Top', 'Zara', ['Beige', 'Black', 'White'], 'Satin Polyester', 28, 0, 'Adjustable-strap satin cami.', 'A satin cami top with adjustable straps and a bias-cut hem, light enough to layer under blazers or wear alone in warm weather.', ['cami', 'satin']],
    ['Off-Shoulder Ruffle Top', 'Forever 21', ['White', 'Pink', 'Yellow'], 'Cotton-Poplin Blend', 32, 25, 'Romantic off-shoulder blouse.', 'An elasticated off-shoulder neckline with ruffle trim sits above short balloon sleeves, cut from a crisp poplin blend.', ['off-shoulder', 'ruffle']],
    ['Cropped Knit Top', 'H&M', ['Black', 'Beige', 'Green'], 'Cotton-Acrylic Knit', 26, 0, 'Fine-gauge cropped knit top.', 'Fine-gauge knit in a cropped length with a round neckline, designed to pair with high-waisted bottoms for a clean silhouette.', ['cropped', 'knitwear']],
  ]),
  ...mk('Women', 'T-Shirts', 'womens_tshirt', 'Women', CLOTHING_SIZES, [
    ['Fitted Ribbed Crew Tee', 'Uniqlo', ['White', 'Black', 'Gray'], 'Cotton-Elastane Rib', 24, 0, 'Fitted stretch ribbed tee.', 'A ribbed cotton-elastane knit skims the body from a crew neckline to a hip-length hem, holding its shape wear after wear.', ['ribbed', 'fitted']],
    ['Graphic Logo Tee', 'Nike', ['White', 'Black', 'Pink'], '100% Cotton', 30, 24, 'Cotton tee with front logo print.', 'Soft-washed cotton jersey with a classic swoosh print across the chest, cut in a relaxed unisex-inspired fit.', ['logo', 'graphic']],
    ['Tie-Front Cropped Tee', 'Forever 21', ['White', 'Yellow', 'Pink'], 'Cotton Jersey', 20, 0, 'Cropped tee with front tie.', 'A cropped cotton jersey tee with a self-tie at the hem for an adjustable, cinched silhouette.', ['cropped', 'tie-front']],
  ]),
  ...mk('Women', 'Shirts', 'womens_shirt', 'Women', CLOTHING_SIZES, [
    ['Classic Poplin Button-Up Shirt', 'Tommy Hilfiger', ['White', 'Blue', 'Pink'], 'Cotton Poplin', 58, 46, 'Crisp cotton poplin shirt.', 'Crisp cotton poplin tailored with a point collar and single chest pocket, finished with the brand\'s signature back-neck flag.', ['poplin', 'button-up']],
    ['Silk Blend Blouse', 'Zara', ['Beige', 'White', 'Green'], 'Silk-Viscose Blend', 65, 0, 'Fluid silk-blend blouse.', 'A silk-viscose blend with a fluid drape, finished with a tie neck and covered button placket for an elevated everyday top.', ['silk-blend', 'blouse']],
    ['Oversized Denim Shirt', 'H&M', ['Blue', 'Light Blue'], 'Cotton Denim', 48, 0, 'Relaxed oversized denim shirt.', 'Lightweight denim cut oversized with dropped shoulders, worn open over tees or buttoned and tucked for a workwear-inspired look.', ['oversized', 'denim']],
  ]),
  ...mk('Women', 'Hoodies', 'womens_hoodie', 'Women', CLOTHING_SIZES, [
    ['Cropped Fleece Hoodie', 'Puma', ['Pink', 'Gray', 'Black'], 'Cotton Fleece', 48, 38, 'Cropped brushed fleece hoodie.', 'Brushed fleece in a cropped length with a drawcord hood and kangaroo pocket, designed to pair with high-rise leggings.', ['cropped', 'fleece']],
    ['Oversized Pullover Hoodie', 'Adidas', ['Beige', 'Gray', 'White'], 'Cotton-Poly Fleece', 62, 0, 'Relaxed oversized pullover hoodie.', 'An oversized fit with dropped shoulders and a roomy hood, made from soft-brushed fleece with ribbed cuffs and hem.', ['oversized', 'pullover']],
    ['Zip-Through Longline Hoodie', 'H&M', ['Black', 'Navy'], 'Cotton Fleece', 52, 41, 'Longline zip-up hoodie.', 'An extended longline hem and full front zip make this fleece hoodie easy to layer over leggings or slim jeans.', ['longline', 'zip-up']],
  ]),
  ...mk('Women', 'Sweaters', 'womens_sweater', 'Women', CLOTHING_SIZES, [
    ['Chunky Cable Knit Sweater', 'Zara', ['Beige', 'Gray', 'Brown'], 'Wool-Acrylic Blend', 65, 52, 'Cosy chunky cable-knit sweater.', 'A chunky cable-knit pattern worked through a wool-acrylic blend, finished with ribbed cuffs and hem for cold-weather layering.', ['cable-knit', 'chunky']],
    ['V-Neck Merino Wool Sweater', 'Calvin Klein', ['Navy', 'Black', 'Gray'], '100% Merino Wool', 89, 0, 'Fine-gauge merino V-neck.', 'Fine-gauge merino wool knitted into a lightweight V-neck sweater that layers cleanly under blazers or over collared shirts.', ['merino', 'v-neck']],
    ['Turtleneck Ribbed Sweater', 'H&M', ['Black', 'Beige', 'Red'], 'Viscose-Polyester Knit', 46, 0, 'Fitted ribbed turtleneck.', 'A fine ribbed knit turtleneck cut close to the body, ideal alone or layered beneath coats through the colder months.', ['turtleneck', 'ribbed']],
  ]),
  ...mk('Women', 'Jackets', 'womens_jacket', 'Women', CLOTHING_SIZES, [
    ['Cropped Denim Jacket', "Levi's", ['Blue', 'Black'], '100% Cotton Denim', 82, 65, 'Classic cropped denim jacket.', 'A cropped cut of the brand\'s classic trucker jacket, finished with button flap pockets and a fit that fades beautifully over time.', ['denim', 'cropped']],
    ['Belted Trench Coat', 'Zara', ['Beige', 'Navy'], 'Cotton Gabardine', 135, 109, 'Timeless belted trench coat.', 'Cotton gabardine cut in the classic double-breasted trench silhouette, with a storm flap, gun flap, and self-tie belt.', ['trench', 'gabardine']],
    ['Quilted Puffer Jacket', 'North Face', ['Black', 'Pink', 'Navy'], 'Recycled Nylon, Synthetic Fill', 155, 0, 'Lightweight quilted puffer.', 'Diamond-quilted recycled nylon locks in warmth over synthetic fill, finished with an elastic-bound collar and zip hand pockets.', ['puffer', 'quilted']],
  ]),
  ...mk('Women', 'Jeans', 'womens_jeans', 'Women', CLOTHING_SIZES, [
    ['High-Waisted Mom Jeans', "Levi's", ['Blue', 'Light Blue'], '100% Cotton Denim', 78, 62, 'Vintage-inspired high-rise mom jeans.', 'A high-rise fit through the waist that relaxes into a tapered leg, styled after the brand\'s original 1980s five-pocket cut.', ['mom-jeans', 'high-rise']],
    ['Skinny Fit Stretch Jeans', 'Guess', ['Black', 'Navy', 'Gray'], 'Cotton-Elastane Denim', 72, 58, 'Body-hugging stretch skinny jeans.', 'Stretch denim shapes to the leg from hip to ankle, finished with a rear logo patch and clean five-pocket styling.', ['skinny', 'stretch']],
    ['Wide Leg Palazzo Jeans', 'Zara', ['Blue', 'Beige'], 'Cotton Denim', 66, 0, 'Flowing wide-leg denim.', 'A high-rise waistband gives way to a dramatically wide leg, cut from mid-weight denim for a fluid, statement-making silhouette.', ['wide-leg', 'palazzo']],
  ]),
  ...mk('Women', 'Skirts', 'womens_skirt', 'Women', CLOTHING_SIZES, [
    ['Pleated Midi Skirt', 'Zara', ['Beige', 'Black', 'Green'], 'Polyester Crepe', 48, 38, 'Flowing pleated midi skirt.', 'Fine knife pleats fall from an elasticated waistband to a fluid midi length, moving with every step.', ['pleated', 'midi']],
    ['Denim A-Line Mini Skirt', "Levi's", ['Blue', 'Black'], '100% Cotton Denim', 45, 0, 'Classic denim A-line mini.', 'Rigid cotton denim cut in an A-line silhouette with a button fly and classic five-pocket detailing.', ['denim', 'mini']],
    ['High-Waisted Bodycon Skirt', 'Forever 21', ['Black', 'Red'], 'Ponte Knit', 30, 24, 'Fitted stretch bodycon skirt.', 'Stretch ponte knit hugs the hip and thigh from a high-rise waistband down to a knee-length hem with a centre-back vent.', ['bodycon', 'ponte']],
  ]),
  ...mk('Women', 'Pants', 'womens_pants', 'Women', CLOTHING_SIZES, [
    ['Tailored Wide Leg Trousers', 'Zara', ['Black', 'Beige', 'Navy'], 'Polyester-Viscose Blend', 62, 49, 'Elegant wide-leg tailored trousers.', 'A high-rise waistband with a pressed centre crease leads into a wide, floor-grazing leg cut from a fluid polyester-viscose weave.', ['wide-leg', 'tailored']],
    ['Straight Leg Cotton Trousers', 'H&M', ['Beige', 'Gray', 'Black'], 'Cotton Twill', 46, 0, 'Everyday straight-leg trousers.', 'Mid-weight cotton twill cut with a straight leg and side pockets, versatile enough for the office or weekend errands.', ['straight-leg', 'twill']],
    ['High-Waisted Paperbag Trousers', 'Uniqlo', ['Beige', 'Black'], 'Cotton-Linen Blend', 42, 0, 'Cinched-waist paperbag trousers.', 'A paperbag waist gathers with a self-tie belt above tapered, ankle-length legs in a breathable cotton-linen weave.', ['paperbag', 'tapered']],
  ]),
  ...mk('Women', 'Leggings', 'womens_leggings', 'Women', CLOTHING_SIZES, [
    ['High-Waisted Squat-Proof Leggings', 'Nike', ['Black', 'Navy', 'Gray'], 'Nylon-Spandex', 45, 36, 'Opaque high-waist training leggings.', 'A four-way stretch nylon-spandex blend stays fully opaque through every squat and lunge, with a high-rise waistband that stays put.', ['squat-proof', 'high-waist']],
    ['Seamless Ribbed Leggings', 'Adidas', ['Black', 'Beige', 'Green'], 'Nylon-Elastane Rib', 42, 0, 'Ribbed seamless compression leggings.', 'Seamless ribbed knit compresses gently for support during training, with a wide waistband that sits flat against the skin.', ['seamless', 'ribbed']],
    ['Fleece-Lined Winter Leggings', 'Under Armour', ['Black', 'Gray'], 'Poly-Spandex, Fleece Lining', 40, 32, 'Brushed fleece-lined leggings.', 'A brushed fleece interior traps warmth for cold-weather runs, while the four-way stretch shell moves freely through every stride.', ['fleece-lined', 'winter']],
  ]),

  // ============================== KIDS ==============================
  ...mk('Kids', 'Boys Clothing', 'kids_boys', 'Kids', CLOTHING_SIZES, [
    ['Dinosaur Print Cotton T-Shirt', 'H&M', ['Blue', 'Green', 'White'], '100% Cotton', 15, 0, 'Playful dinosaur graphic tee.', 'Soft cotton jersey printed with a bold dinosaur graphic, finished with a tag-free neck label so it never irritates sensitive skin.', ['graphic', 'dinosaur']],
    ['Zip-Up Fleece Hoodie', 'Nike', ['Gray', 'Blue', 'Black'], 'Cotton-Poly Fleece', 32, 26, 'Cosy full-zip fleece hoodie.', 'Soft fleece with a full front zip and snug-fitting hood, built to handle playground wear and frequent washing.', ['fleece', 'zip-up']],
    ['Elastic Waist Jogger Pants', 'Zara', ['Navy', 'Gray'], 'Cotton-Elastane Blend', 24, 0, 'Comfortable stretch jogger pants.', 'An elasticated waist and stretch cotton blend give these joggers room to move through a full day of play, with cuffed ankles.', ['jogger', 'stretch']],
    ['Denim Overall Shorts', 'Uniqlo', ['Blue'], '100% Cotton Denim', 28, 0, 'Adjustable-strap denim overalls.', 'Sturdy cotton denim overalls with adjustable buckle straps and roomy side pockets, built for durability through active days.', ['denim', 'overalls']],
  ]),
  ...mk('Kids', 'Girls Clothing', 'kids_girls', 'Kids', CLOTHING_SIZES, [
    ['Floral Cotton Sundress', 'Zara', ['Pink', 'Yellow', 'White'], '100% Cotton', 26, 0, 'Lightweight floral summer dress.', 'A floral-printed cotton dress with adjustable shoulder straps and a twirl-friendly A-line skirt, perfect for warm days.', ['floral', 'sundress']],
    ['Glitter Print Leggings', 'H&M', ['Pink', 'Black'], 'Cotton-Elastane Blend', 16, 0, 'Stretchy glitter-print leggings.', 'Soft stretch leggings finished with a shimmering glitter print, paired easily with tunics or oversized tees.', ['glitter', 'leggings']],
    ['Ruffle Sleeve Knit Top', 'Forever 21', ['Pink', 'White', 'Yellow'], 'Cotton Jersey Knit', 18, 14, 'Playful ruffle-sleeve top.', 'Soft cotton knit finished with ruffled sleeve trims and a relaxed fit that\'s easy to move and play in.', ['ruffle', 'knit-top']],
    ['Puffer Vest with Hood', 'Columbia', ['Pink', 'Purple', 'Blue'], 'Nylon, Synthetic Fill', 34, 27, 'Warm packable puffer vest.', 'A lightweight synthetic-fill vest with a detachable hood, built to layer easily over sweaters on cool mornings.', ['puffer', 'vest']],
  ]),
  ...mk('Kids', 'Baby Wear', 'kids_baby', 'Kids', ['0-3M', '3-6M', '6-12M', '12-18M', '18-24M'], [
    ['Organic Cotton Bodysuit Set', 'H&M', ['White', 'Beige', 'Yellow'], 'Organic Cotton', 18, 0, 'Soft 3-pack bodysuit set.', 'A set of snap-fastened bodysuits in breathable organic cotton, gentle enough for daily wear against newborn skin.', ['bodysuit', 'organic-cotton']],
    ['Knit Romper with Booties', 'Zara', ['Beige', 'Pink', 'Blue'], 'Cotton Knit', 22, 0, 'Cosy footed knit romper.', 'A soft knit romper with built-in booties and snap closures at the leg for quick and easy changing.', ['romper', 'knit']],
    ['Hooded Fleece Sleep Sack', 'Uniqlo', ['Gray', 'Beige'], 'Cotton Fleece', 24, 19, 'Warm wearable fleece sleep sack.', 'A wearable fleece blanket with a two-way zip and soft hood, designed for safe, warm sleep without loose bedding.', ['sleep-sack', 'fleece']],
    ['Printed Cotton Onesie 3-Pack', 'Nike', ['White', 'Gray', 'Blue'], '100% Cotton', 20, 0, 'Everyday cotton onesie set.', 'A three-pack of snap-front onesies in soft cotton jersey with small logo prints, built for everyday wear and easy laundering.', ['onesie', 'basics']],
  ]),

  // ============================== FOOTWEAR ==============================
  ...mk('Footwear', 'Sneakers', 'sneakers', 'Unisex', SHOE_SIZES, [
    ['Air Max Running Sneakers', 'Nike', ['White', 'Black', 'Gray'], 'Mesh Upper, Rubber Sole', 145, 119, 'Cushioned everyday sneakers.', 'A breathable mesh upper sits atop a visible air cushioning unit in the heel, built for all-day comfort on and off the track.', ['air-max', 'cushioned']],
    ['Classic Court Sneakers', 'Adidas', ['White', 'Green'], 'Leather Upper, Rubber Sole', 90, 72, 'Timeless leather court sneakers.', 'A clean leather upper and perforated 3-stripe branding sit atop a rubber cupsole, styled after the brand\'s original tennis shoe.', ['court', 'leather']],
    ['Chuck Taylor Canvas Sneakers', 'Converse', ['White', 'Black', 'Red'], 'Canvas Upper, Rubber Sole', 65, 0, 'Iconic canvas high-top sneakers.', 'Durable canvas upper with the brand\'s signature toe cap and ankle patch, built on a vulcanised rubber sole for all-day wear.', ['canvas', 'high-top']],
    ['Old Skool Skate Sneakers', 'Vans', ['Black', 'White'], 'Suede-Canvas Upper', 70, 0, 'Classic side-stripe skate shoe.', 'A suede-and-canvas upper with the signature side stripe sits on a padded collar and waffle outsole built for board feel.', ['skate', 'suede']],
    ['574 Retro Lifestyle Sneakers', 'New Balance', ['Gray', 'Navy'], 'Suede-Mesh Upper', 85, 68, 'Retro-inspired lifestyle sneakers.', 'A suede-and-mesh upper pairs with ENCAP midsole cushioning for the retro running silhouette the brand is known for.', ['retro', 'lifestyle']],
  ]),
  ...mk('Footwear', 'Running Shoes', 'running_shoes', 'Unisex', SHOE_SIZES, [
    ['Ultraboost Running Shoes', 'Adidas', ['Black', 'White', 'Gray'], 'Primeknit Upper, Boost Midsole', 180, 149, 'Responsive energy-return running shoes.', 'A Primeknit upper wraps the foot for a sock-like fit above a Boost midsole engineered to return energy with every stride.', ['boost', 'primeknit']],
    ['Gel-Nimbus Cushioned Running Shoes', 'ASICS', ['Blue', 'Gray'], 'Engineered Mesh, Gel Cushioning', 160, 0, 'Plush long-distance running shoes.', 'Rear and forefoot gel cushioning absorbs impact mile after mile, wrapped in an engineered mesh upper that flexes with the foot.', ['gel-cushioning', 'long-distance']],
    ['React Infinity Running Shoes', 'Nike', ['White', 'Black', 'Pink'], 'Flyknit Upper, React Foam', 155, 124, 'Stable everyday trainers.', 'A wider base and React foam midsole are designed to reduce injury risk while keeping every run cushioned and responsive.', ['flyknit', 'react-foam']],
    ['HOVR Sonic Running Shoes', 'Under Armour', ['Black', 'Gray', 'Red'], 'Mesh Upper, HOVR Foam', 120, 96, 'Energy-return training shoes.', 'HOVR foam cushioning compresses and rebounds to reduce impact, paired with a breathable mesh upper for daily training miles.', ['hovr', 'training']],
  ]),
  ...mk('Footwear', 'Boots', 'boots', 'Unisex', SHOE_SIZES, [
    ['Leather Chelsea Boots', 'Aldo', ['Black', 'Brown'], 'Genuine Leather', 135, 108, 'Classic elastic-side Chelsea boots.', 'Smooth full-grain leather uppers with elastic side gussets slip on easily, finished on a stacked block heel for a versatile silhouette.', ['chelsea', 'leather']],
    ['Waterproof Hiking Boots', 'Columbia', ['Brown', 'Gray'], 'Leather-Mesh Upper, Waterproof Membrane', 145, 0, 'Rugged waterproof trail boots.', 'A waterproof membrane keeps feet dry on the trail, while an aggressive rubber outsole grips loose terrain and wet rock.', ['hiking', 'waterproof']],
    ['Combat Lace-Up Boots', 'Zara', ['Black'], 'Faux Leather', 89, 71, 'Sturdy lace-up combat boots.', 'A chunky lug sole and reinforced lace-up front give these faux-leather boots an unmistakable utilitarian edge.', ['combat', 'lace-up']],
  ]),
  ...mk('Footwear', 'Sandals', 'sandals', 'Unisex', SHOE_SIZES, [
    ['Cushioned Slide Sandals', 'Adidas', ['Black', 'White'], 'EVA Footbed', 35, 28, 'Contoured comfort slide sandals.', 'A contoured EVA footbed cushions every step, finished with adjustable straps and the brand\'s embossed logo across the front.', ['slides', 'cushioned']],
    ['Leather Strappy Sandals', 'Aldo', ['Brown', 'Beige', 'Black'], 'Genuine Leather', 68, 54, 'Elegant strappy leather sandals.', 'Soft leather straps crisscross over the foot above a flexible sole, finished with a buckle closure at the ankle.', ['strappy', 'leather']],
    ['Sport Trail Sandals', 'Nike', ['Black', 'Gray'], 'Textile-Synthetic Upper', 45, 0, 'Adjustable outdoor trail sandals.', 'Quick-drying webbing straps adjust to fit, secured over a grippy multi-directional outsole for outdoor wear.', ['sport', 'trail']],
  ]),
  ...mk('Footwear', 'Heels', 'heels', 'Women', SHOE_SIZES, [
    ['Pointed Toe Stiletto Heels', 'Guess', ['Black', 'Red', 'Beige'], 'Faux Suede', 92, 74, 'Sharp pointed-toe stilettos.', 'A sleek pointed toe and slender stiletto heel elongate the leg, finished in soft faux suede with a cushioned insole.', ['stiletto', 'pointed-toe']],
    ['Block Heel Ankle Strap Sandals', 'Aldo', ['Black', 'Beige'], 'Genuine Leather', 85, 68, 'Stable block-heel sandals.', 'A wide block heel offers all-day stability without sacrificing height, secured with an adjustable ankle strap.', ['block-heel', 'ankle-strap']],
    ['Metallic Party Heels', 'Zara', ['Gold', 'Silver'], 'Metallic Faux Leather', 58, 46, 'Statement metallic evening heels.', 'A metallic finish catches the light with every step, set on a comfortable mid-height heel built for evenings out.', ['metallic', 'party']],
  ]),
  ...mk('Footwear', 'Flats', 'flats', 'Women', SHOE_SIZES, [
    ['Classic Ballet Flats', 'Aldo', ['Black', 'Beige', 'Red'], 'Faux Leather', 55, 44, 'Timeless round-toe ballet flats.', 'A round toe and elasticated topline give these ballet flats an easy slip-on fit for everyday errands or the office.', ['ballet-flats', 'round-toe']],
    ['Pointed Toe Loafers Flats', 'Zara', ['Black', 'Brown'], 'Faux Leather', 48, 0, 'Sleek pointed loafer flats.', 'A structured pointed toe and low stacked heel bring smart-casual polish to this easy-wear loafer-inspired flat.', ['pointed-toe', 'loafer-style']],
    ['Woven Espadrille Flats', 'H&M', ['Beige', 'Navy'], 'Jute-Canvas', 38, 0, 'Summer-ready espadrille flats.', 'A jute-wrapped platform sole pairs with a canvas upper for a lightweight, breathable warm-weather flat.', ['espadrille', 'summer']],
  ]),
  ...mk('Footwear', 'Loafers', 'loafers', 'Men', SHOE_SIZES, [
    ['Penny Loafers', 'Aldo', ['Brown', 'Black'], 'Genuine Leather', 98, 78, 'Classic leather penny loafers.', 'Full-grain leather uppers with the traditional penny strap detail, finished on a leather sole for polished everyday wear.', ['penny-loafers', 'leather']],
    ['Suede Tassel Loafers', 'Zara', ['Brown', 'Navy'], 'Genuine Suede', 92, 0, 'Smart suede tassel loafers.', 'Soft suede uppers finished with classic tassel detailing at the vamp, built on a cushioned insole for smart-casual wear.', ['tassel', 'suede']],
    ['Driving Moccasin Loafers', 'Calvin Klein', ['Black', 'Brown'], 'Genuine Leather', 105, 84, 'Comfort-driven moccasin loafers.', 'A rubber pebble outsole and unstructured leather upper make these moccasin loafers as comfortable behind the wheel as on foot.', ['moccasin', 'driving']],
  ]),

  // ============================== ACCESSORIES ==============================
  ...mk('Accessories', 'Watches', 'watches', 'Unisex', ONE_SIZE, [
    ['Chronograph Steel Watch', 'Guess', ['Silver', 'Black'], 'Stainless Steel', 195, 156, 'Classic chronograph steel watch.', 'A stainless steel case houses a multi-function chronograph dial, paired with a link bracelet and fold-over clasp.', ['chronograph', 'stainless-steel']],
    ['Minimalist Leather Strap Watch', 'Calvin Klein', ['Brown', 'Black'], 'Stainless Steel, Leather Strap', 165, 0, 'Clean minimalist dress watch.', 'A slim stainless steel case and uncluttered dial sit on a genuine leather strap for a refined, minimalist everyday watch.', ['minimalist', 'leather-strap']],
    ['Sport Chronograph Watch', 'Tommy Hilfiger', ['Blue', 'Silver'], 'Stainless Steel', 175, 140, 'Bold sport chronograph watch.', 'A bold case size and luminous hands make this chronograph easy to read, secured with a brushed stainless steel bracelet.', ['sport', 'chronograph']],
    ['Rose Gold Bracelet Watch', 'Aldo', ['Rose Gold', 'Gold'], 'Stainless Steel', 88, 70, 'Elegant rose gold bracelet watch.', 'A slim rose gold-toned case and matching mesh bracelet bring understated elegance to everyday wrist wear.', ['rose-gold', 'bracelet']],
  ]),
  ...mk('Accessories', 'Sunglasses', 'sunglasses', 'Unisex', ONE_SIZE, [
    ['Classic Aviator Sunglasses', 'Guess', ['Gold', 'Silver'], 'Metal Frame, Polarized Lens', 78, 62, 'Timeless polarized aviators.', 'Polarized lenses cut glare while thin metal temples and the classic double-bridge frame keep this aviator shape lightweight.', ['aviator', 'polarized']],
    ['Oversized Cat-Eye Sunglasses', 'Zara', ['Black', 'Brown'], 'Acetate Frame', 32, 0, 'Bold oversized cat-eye sunglasses.', 'An oversized acetate frame flares into a dramatic cat-eye silhouette, finished with UV400-rated tinted lenses.', ['cat-eye', 'oversized']],
    ['Square Frame Sunglasses', 'Calvin Klein', ['Black', 'Tortoise'], 'Acetate Frame, UV Protection', 65, 52, 'Modern square-frame sunglasses.', 'A structured square acetate frame with full UV400 protection brings a contemporary edge to everyday sun styling.', ['square-frame', 'uv-protection']],
    ['Round Metal Sunglasses', 'Tommy Hilfiger', ['Gold', 'Black'], 'Metal Frame', 58, 0, 'Retro round metal sunglasses.', 'A slim round metal frame channels a retro mood, fitted with gradient-tinted lenses and adjustable nose pads.', ['round-frame', 'retro']],
  ]),
  ...mk('Accessories', 'Caps', 'caps', 'Unisex', ONE_SIZE, [
    ['Embroidered Logo Baseball Cap', 'Nike', ['Black', 'White', 'Navy'], 'Cotton Twill', 28, 0, 'Classic embroidered baseball cap.', 'Structured cotton twill panels meet a curved brim and embroidered front logo, finished with an adjustable back strap.', ['baseball-cap', 'embroidered']],
    ['Trefoil Snapback Cap', 'Adidas', ['Black', 'Gray'], 'Cotton Twill', 26, 21, 'Flat-brim snapback cap.', 'A flat brim and structured crown give this snapback a street-ready look, finished with an adjustable plastic snap closure.', ['snapback', 'flat-brim']],
    ['Corduroy Dad Hat', 'Levi\'s', ['Brown', 'Beige'], 'Corduroy Cotton', 24, 0, 'Soft unstructured corduroy cap.', 'An unstructured low-profile crown in ribbed corduroy gives this dad hat a broken-in look right out of the box.', ['dad-hat', 'corduroy']],
    ['Running Performance Cap', 'New Balance', ['Black', 'Gray'], 'Lightweight Polyester', 22, 0, 'Sweat-wicking running cap.', 'A lightweight, quick-dry polyester shell and reflective trim keep this running cap comfortable on long training days.', ['performance', 'running']],
  ]),
  ...mk('Accessories', 'Handbags', 'handbags', 'Women', ONE_SIZE, [
    ['Structured Leather Tote Bag', 'Guess', ['Black', 'Brown', 'Beige'], 'Genuine Leather', 165, 132, 'Spacious structured leather tote.', 'A structured leather silhouette with dual top handles and a wide-open interior fits a laptop and daily essentials with ease.', ['tote', 'leather']],
    ['Quilted Crossbody Bag', 'Zara', ['Black', 'Beige'], 'Faux Leather', 68, 54, 'Chic quilted crossbody bag.', 'A diamond-quilted faux leather exterior and adjustable chain strap bring understated polish to this compact crossbody.', ['crossbody', 'quilted']],
    ['Mini Top Handle Bag', 'Aldo', ['Red', 'Black', 'White'], 'Faux Leather', 72, 58, 'Compact top-handle mini bag.', 'A rigid top handle and clean-lined silhouette make this mini bag a statement piece for evenings and weekend outings.', ['mini-bag', 'top-handle']],
    ['Woven Straw Beach Tote', 'Forever 21', ['Beige', 'Brown'], 'Straw, Cotton Lining', 45, 0, 'Sun-ready woven straw tote.', 'A hand-woven straw exterior with a cotton-lined interior and rope handles makes this tote a warm-weather staple.', ['straw', 'beach-bag']],
  ]),
  ...mk('Accessories', 'Wallets', 'wallets', 'Unisex', ONE_SIZE, [
    ['Bifold Leather Wallet', 'Calvin Klein', ['Black', 'Brown'], 'Genuine Leather', 55, 44, 'Slim bifold leather wallet.', 'Full-grain leather folds into a slim bifold with multiple card slots and a dedicated bill compartment.', ['bifold', 'leather']],
    ['RFID-Blocking Card Holder', 'Guess', ['Black', 'Brown'], 'Genuine Leather', 42, 34, 'Secure RFID card holder.', 'An RFID-blocking lining protects card data from skimming, wrapped in soft leather with a slim silhouette for front-pocket carry.', ['rfid-blocking', 'card-holder']],
    ['Zip-Around Leather Wallet', 'Aldo', ['Brown', 'Black'], 'Genuine Leather', 62, 0, 'Organised zip-around wallet.', 'A full zip closure keeps cards and cash secure, opening to reveal multiple slots and a coin pocket inside soft leather.', ['zip-around', 'organiser']],
  ]),
  ...mk('Accessories', 'Belts', 'belts', 'Unisex', ONE_SIZE, [
    ['Reversible Leather Belt', "Levi's", ['Black', 'Brown'], 'Genuine Leather', 45, 36, 'Two-tone reversible leather belt.', 'A reversible leather strap flips between black and brown, secured with a rotating buckle for two looks from one belt.', ['reversible', 'leather']],
    ['Woven Canvas Belt', 'Calvin Klein', ['Navy', 'Beige'], 'Canvas, Leather Trim', 32, 0, 'Casual woven canvas belt.', 'A durable woven canvas strap with leather trim and a brushed metal buckle brings texture to casual denim looks.', ['woven', 'canvas']],
    ['Logo Buckle Leather Belt', 'Guess', ['Black', 'Brown'], 'Genuine Leather', 58, 46, 'Signature logo buckle belt.', 'Smooth leather meets a polished logo-engraved buckle, finished with stitched edges for a clean formal silhouette.', ['logo-buckle', 'leather']],
  ]),
  ...mk('Accessories', 'Backpacks', 'backpacks', 'Unisex', ONE_SIZE, [
    ['Water-Resistant Laptop Backpack', 'North Face', ['Black', 'Gray'], 'Recycled Nylon', 95, 76, 'Padded laptop commuter backpack.', 'A padded 15-inch laptop sleeve and water-resistant recycled nylon shell make this backpack built for daily commuting.', ['laptop-bag', 'water-resistant']],
    ['Trail Hiking Backpack', 'Columbia', ['Green', 'Gray'], 'Ripstop Polyester', 88, 0, 'Rugged 30L hiking backpack.', 'A ventilated back panel and multiple compression straps make this 30-litre pack ready for day hikes and light trekking.', ['hiking', 'ventilated']],
    ['Sport Drawstring Backpack', 'Nike', ['Black', 'Blue'], 'Polyester', 28, 22, 'Lightweight drawstring sport bag.', 'A simple drawstring closure and reinforced corners make this lightweight sport bag ideal for gym kit and shoes.', ['drawstring', 'gym']],
    ['Canvas Everyday Backpack', 'Puma', ['Beige', 'Black'], 'Cotton Canvas', 52, 42, 'Durable canvas everyday backpack.', 'Heavyweight cotton canvas with a padded main compartment and front zip pocket handles books, kit, and daily essentials.', ['canvas', 'everyday']],
  ]),
  ...mk('Accessories', 'Scarves', 'scarves', 'Unisex', ONE_SIZE, [
    ['Printed Silk Scarf', 'Zara', ['Beige', 'Green', 'Pink'], '100% Silk', 42, 34, 'Hand-finished printed silk scarf.', 'Lightweight silk twill printed with an intricate pattern and finished with hand-rolled edges for a luxe drape.', ['silk', 'printed']],
    ['Chunky Knit Wool Scarf', 'H&M', ['Gray', 'Beige', 'Navy'], 'Wool-Acrylic Blend', 28, 0, 'Warm chunky knit scarf.', 'A chunky rib-knit wool blend wraps warmly around the neck, with fringed ends for a textured finishing touch.', ['chunky-knit', 'wool']],
    ['Cashmere Blend Wrap Scarf', 'Calvin Klein', ['Black', 'Camel'], 'Cashmere-Wool Blend', 55, 44, 'Soft cashmere-blend wrap scarf.', 'A cashmere-wool blend gives this oversized wrap scarf a soft hand-feel and lightweight warmth for cooler days.', ['cashmere', 'wrap']],
  ]),
  ...mk('Accessories', 'Jewelry', 'jewelry', 'Women', ONE_SIZE, [
    ['Gold-Plated Pendant Necklace', 'Guess', ['Gold'], '18K Gold-Plated Brass', 48, 38, 'Delicate gold-plated necklace.', 'An 18k gold-plated chain holds a minimalist pendant, finished with a lobster clasp and 2-inch extender for adjustable fit.', ['necklace', 'gold-plated']],
    ['Freshwater Pearl Drop Earrings', 'Aldo', ['White', 'Gold'], 'Freshwater Pearl, Brass', 38, 0, 'Elegant pearl drop earrings.', 'Genuine freshwater pearls hang from gold-toned brass hooks, bringing understated elegance to both day and evening looks.', ['earrings', 'pearl']],
    ['Layered Chain Bracelet Set', 'Forever 21', ['Gold', 'Silver'], 'Brass Alloy', 22, 18, 'Stackable layered chain bracelets.', 'A set of three fine chain bracelets in varying textures, designed to be layered together or worn individually.', ['bracelet', 'layered']],
    ['Crystal Stud Earrings', 'Zara', ['Silver', 'Gold'], 'Brass, Cubic Zirconia', 18, 0, 'Sparkling crystal stud earrings.', 'Cubic zirconia stones catch the light from a secure butterfly-back setting, small enough for everyday wear.', ['stud-earrings', 'crystal']],
  ]),
  ...mk('Accessories', 'Socks', 'socks', 'Unisex', ONE_SIZE, [
    ['Cushioned Crew Socks 3-Pack', 'Nike', ['White', 'Black', 'Gray'], 'Cotton-Polyester Blend', 18, 0, 'Everyday cushioned crew socks.', 'A three-pack of cushioned-sole crew socks with arch support and ribbed cuffs that stay up through daily wear.', ['crew-socks', '3-pack']],
    ['No-Show Performance Socks', 'Adidas', ['White', 'Black'], 'Polyester-Spandex', 15, 12, 'Low-cut no-show socks.', 'A silicone heel grip keeps these low-cut socks hidden and in place inside sneakers, with breathable mesh venting.', ['no-show', 'performance']],
    ['Patterned Dress Socks 3-Pack', 'H&M', ['Navy', 'Gray', 'Burgundy'], 'Cotton-Nylon Blend', 16, 0, 'Smart patterned dress socks.', 'A fine-gauge knit in subtle patterns dresses up formal shoes, finished with a ribbed cuff that holds its shape all day.', ['dress-socks', 'patterned']],
  ]),

  // ============================== SPORTSWEAR ==============================
  ...mk('Sportswear', 'Gym Wear', 'gymwear', 'Unisex', CLOTHING_SIZES, [
    ['Compression Training Tank', 'Under Armour', ['Black', 'Gray'], 'HeatGear Polyester-Elastane', 38, 30, 'Sweat-wicking compression tank.', 'HeatGear fabric wicks sweat and dries fast, with a compression fit that supports muscles through heavy lifting sessions.', ['compression', 'tank']],
    ['Seamless Training Bra', 'Nike', ['Black', 'Pink', 'Gray'], 'Nylon-Spandex', 42, 34, 'Medium-support seamless sports bra.', 'A seamless knit construction reduces chafing while medium-support cups keep everything secure through moderate-intensity training.', ['sports-bra', 'seamless']],
    ['Muscle Fit Gym Tee', 'Puma', ['Black', 'White', 'Gray'], 'Dry-Cell Polyester', 30, 0, 'Fitted moisture-wicking gym tee.', 'A muscle-fit cut and moisture-wicking finish make this tee built for the weight room, with dropped-back hem for coverage.', ['muscle-fit', 'gym']],
    ['High-Support Sports Bra', 'Reebok', ['Black', 'Red'], 'Polyester-Spandex', 45, 36, 'High-impact support sports bra.', 'Wide encapsulating straps and a racerback design deliver high-impact support for running and HIIT training.', ['high-support', 'racerback']],
  ]),
  ...mk('Sportswear', 'Track Pants', 'trackpants', 'Unisex', CLOTHING_SIZES, [
    ['Tricot Track Pants', 'Adidas', ['Black', 'Navy'], 'Tricot Polyester', 55, 44, 'Classic three-stripe track pants.', 'Lightweight tricot fabric with the brand\'s signature side stripes and zip ankle cuffs for an iconic training silhouette.', ['tricot', 'three-stripe']],
    ['Fleece-Lined Joggers', 'Nike', ['Gray', 'Black'], 'Cotton-Poly Fleece', 58, 46, 'Warm fleece-lined joggers.', 'A brushed fleece interior adds warmth for outdoor training, with a tapered leg and ribbed cuffs for a snug finish.', ['fleece-lined', 'joggers']],
    ['Woven Warm-Up Track Pants', 'Puma', ['Black', 'Gray'], 'Woven Polyester', 48, 0, 'Lightweight woven warm-up pants.', 'A woven shell with snap-side vents allows quick removal over training shoes, ideal for pre- and post-game warm-ups.', ['warm-up', 'woven']],
  ]),
  ...mk('Sportswear', 'Sports T-Shirts', 'sportstshirt', 'Unisex', CLOTHING_SIZES, [
    ['HeatGear Compression Tee', 'Under Armour', ['Black', 'White', 'Gray'], 'Polyester-Elastane', 35, 28, 'Second-skin compression training tee.', 'A compression fit and moisture-wicking HeatGear fabric move like a second skin through high-intensity workouts.', ['compression', 'heatgear']],
    ['Breathe Training Tee', 'Nike', ['Gray', 'Black', 'Blue'], 'Dri-FIT Polyester', 32, 0, 'Ventilated Dri-FIT training tee.', 'Laser-cut ventilation holes across the back improve airflow while Dri-FIT fabric wicks sweat during intense training.', ['dri-fit', 'ventilated']],
    ['Climalite Running Tee', 'Adidas', ['Blue', 'White', 'Black'], 'Climalite Polyester', 30, 24, 'Lightweight moisture-wicking running tee.', 'Climalite fabric pulls moisture away from the skin and dries quickly, keeping runners cool over long distances.', ['climalite', 'running']],
  ]),
  ...mk('Sportswear', 'Sports Shoes', 'sportsshoes', 'Unisex', SHOE_SIZES, [
    ['Metcon Cross-Training Shoes', 'Nike', ['Black', 'Gray'], 'Synthetic Upper, Rubber Sole', 130, 104, 'Stable cross-training shoes.', 'A wide, flat heel platform provides a stable base for lifting, while a flexible forefoot supports rope climbs and burpees.', ['cross-training', 'stable-heel']],
    ['UB Trainer Shoes', 'Under Armour', ['Black', 'White'], 'Textile Upper, Micro G Midsole', 110, 88, 'Versatile everyday trainer shoes.', 'A Micro G midsole cushions everyday training sessions, from treadmill runs to circuit workouts, in a breathable textile upper.', ['trainer', 'micro-g']],
    ['Gel-Court Training Shoes', 'ASICS', ['White', 'Blue'], 'Mesh Upper, Gel Cushioning', 120, 0, 'Court-ready gel cushioned shoes.', 'Rearfoot gel cushioning absorbs lateral impact during court sports, paired with a supportive mesh-and-synthetic upper.', ['court', 'gel-cushioning']],
  ]),
];

module.exports = { IMAGE_BANK, CATEGORY_TREE, PRODUCTS, CLOTHING_SIZES, SHOE_SIZES, ONE_SIZE };
