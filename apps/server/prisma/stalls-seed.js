import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const prisma = new PrismaClient();
const MIN_STALLS_PER_CENTRE = 4;
const MAX_STALLS_PER_CENTRE = 7;
const MIN_MENU_ITEMS = 5;
const MAX_MENU_ITEMS = 10;
const FOOD_RATIO = 0.7;
const SKIP_IMAGE_VALIDATION =
  process.env.SKIP_IMAGE_VALIDATION === '1' ||
  process.env.SKIP_IMAGE_VALIDATION === 'true';
const IMAGE_REQUEST_TIMEOUT = Number(process.env.IMAGE_REQUEST_TIMEOUT_MS) || 8000;

let stallTemplates = [
  {
    key: 'chicken_rice',
    displayName: 'Yuan Ji Chicken Rice',
    cuisineType: 'Chicken Rice',
    description: 'Tender poached chicken with aromatic rice and house-made chilli.',
    imageUrl:
      'https://images.pexels.com/photos/30120279/pexels-photo-30120279.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    key: 'fishball_noodles',
    displayName: 'Handmade Fishball Noodles',
    cuisineType: 'Teochew Noodles',
    description: 'Springy fishballs and mee pok tossed in savoury chilli.',
    imageUrl:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'laksa',
    displayName: 'Katong Laksa Corner',
    cuisineType: 'Laksa',
    description: 'Rich coconut laksa broth with prawns and cockles.',
    imageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'satay',
    displayName: 'Serangoon Satay & Grill',
    cuisineType: 'Satay & Grill',
    description: 'Smoky charcoal-grilled satay with homemade peanut sauce.',
    imageUrl:
      'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'prawn_noodles',
    displayName: 'Har Cheong Prawn Mee',
    cuisineType: 'Prawn Noodles',
    description: 'Deep prawn broth simmered for hours with pork bones.',
    imageUrl:
      'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'nasi_lemak',
    displayName: 'Mak Cik Nasi Lemak',
    cuisineType: 'Nasi Lemak',
    description: 'Coconut rice with crispy chicken wing and ikan bilis.',
    imageUrl:
      'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'vegetarian',
    displayName: 'Lotus Vegetarian Delights',
    cuisineType: 'Vegetarian',
    description: 'Wholesome plant-based bowls with local flavours.',
    imageUrl:
      'https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'desserts',
    displayName: 'Chendol & Desserts Bar',
    cuisineType: 'Desserts',
    description: 'Icy treats and local desserts perfect for humid afternoons.',
    imageUrl:
      'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'western',
    displayName: 'John’s Famous Steak & Grill',
    cuisineType: 'Western Grill',
    description: 'Hearty grilled meats and crispy fries.',
    imageUrl:
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'carrot_cake',
    displayName: 'Chye Tow Fried Carrot Cake',
    cuisineType: 'Snacks',
    description: 'Black and white carrot cake fried with garlic and egg.',
    imageUrl:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'economic_rice',
    displayName: 'Golden Wok Economic Rice',
    cuisineType: 'Mixed Rice',
    description: 'Choose your favourite homely dishes over steamed rice.',
    imageUrl:
      'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=1200&q=80&sat=-10',
  },
  {
    key: 'rojak',
    displayName: 'Toa Payoh Rojak',
    cuisineType: 'Salads & Fruit',
    description: 'Crisp dough fritters tossed in sweet shrimp paste dressing.',
    imageUrl:
      'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'kaya_toast',
    displayName: 'Heritage Kaya Toast & Kopi',
    cuisineType: 'Breakfast',
    description: 'Old-school breakfast with kaya, butter, and kopi.',
    imageUrl:
      'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'prata',
    displayName: 'Tekka Lane Prata Corner',
    cuisineType: 'Indian-Muslim',
    description: 'Crispy prata flipped fresh on the griddle.',
    imageUrl:
      'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'mee_goreng',
    displayName: 'Bedok Mee Goreng Hub',
    cuisineType: 'Mee Goreng',
    description: 'Fiery wok-fried noodles with sambal and potatoes.',
    imageUrl:
      'https://images.pexels.com/photos/1438672/pexels-photo-1438672.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    key: 'claypot_rice',
    displayName: 'Geylang Claypot Comforts',
    cuisineType: 'Claypot Rice',
    description: 'Slow-cooked rice with Chinese sausage and salted fish.',
    imageUrl:
      'https://images.pexels.com/photos/847362/pexels-photo-847362.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    key: 'yong_tau_foo',
    displayName: 'Balestier Yong Tau Foo',
    cuisineType: 'Yong Tau Foo',
    description: 'Hand-stuffed tofu and vegetables served dry or soup.',
    imageUrl:
      'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'dim_sum',
    displayName: 'Sunrise Dim Sum Bites',
    cuisineType: 'Dim Sum',
    description: 'Steamed baskets stacked high for breakfast crowds.',
    imageUrl:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80&sat=-20',
  },
  {
    key: 'bbq_stingray',
    displayName: 'Newton BBQ Stingray Pit',
    cuisineType: 'Seafood Grill',
    description: 'Banana leaf stingray coated with hae bee hiam sambal.',
    imageUrl:
      'https://images.unsplash.com/photo-1448043552756-e747b7a2b2b8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'seafood_platter',
    displayName: 'Jurong Sambal Seafood',
    cuisineType: 'Seafood',
    description: 'Tze char seafood wok-fried with smoky sambal.',
    imageUrl:
      'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=80&sat=40',
  },
  {
    key: 'lei_cha',
    displayName: 'Hakka Thunder Tea Specialist',
    cuisineType: 'Hakka',
    description: 'Herbal tea broth poured over grains and vegetables.',
    imageUrl:
      'https://images.unsplash.com/photo-1455853659719-4b521eebc76d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'porridge',
    displayName: 'Hougang Teochew Porridge',
    cuisineType: 'Porridge',
    description: 'Light rice porridge paired with classic side dishes.',
    imageUrl:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80&hue=15',
  },
  {
    key: 'ban_mian',
    displayName: 'North Bridge Ban Mian',
    cuisineType: 'Handmade Noodles',
    description: 'Thick hand-pulled noodles served in anchovy broth.',
    imageUrl:
      'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80&sat=-25',
  },
  {
    key: 'korean_bbq',
    displayName: 'Seoul Street BBQ',
    cuisineType: 'Korean Grill',
    description: 'Smoke-kissed meats inspired by K-BBQ flavours.',
    imageUrl:
      'https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'sushi_bento',
    displayName: 'Tokyo Bento Express',
    cuisineType: 'Japanese Bento',
    description: 'Grab-and-go sushi rolls and bentos.',
    imageUrl:
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'bubble_tea',
    displayName: 'Tiong Bahru Bubble Lab',
    cuisineType: 'Beverages',
    description: 'Chewy pearls and fruit teas brewed fresh.',
    imageUrl:
      'https://images.pexels.com/photos/1189288/pexels-photo-1189288.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    key: 'kway_chap',
    displayName: 'Old Airport Kway Chap',
    cuisineType: 'Kway Chap',
    description: 'Silky kway sheets with braised pork innards.',
    imageUrl:
      'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'bak_kut_teh',
    displayName: 'Rong Cheng Bak Kut Teh',
    cuisineType: 'Bak Kut Teh',
    description: 'Peppery pork rib soup with youtiao.',
    imageUrl:
      'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'soy_dessert',
    displayName: 'Beancurd & You Tiao Bar',
    cuisineType: 'Desserts',
    description: 'Smooth tau huay with classic toppings.',
    imageUrl:
      'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'burger_joint',
    displayName: 'Smash Burger Hawker Lab',
    cuisineType: 'Western Fusion',
    description: 'Modern smashed burgers served hawker-style.',
    imageUrl:
      'https://images.unsplash.com/photo-1550317138-10000687a72b?auto=format&fit=crop&w=1200&q=80',
    tags: ['burger', 'fusion', 'modern hawker'],
  },
];

const dietaryTagsByTemplateKey = {
  chicken_rice: ['No Pork'],
  fishball_noodles: ['No Pork'],
  laksa: [],
  satay: ['Halal'],
  prawn_noodles: [],
  nasi_lemak: ['Halal'],
  vegetarian: ['Vegetarian', 'Vegan'],
  desserts: ['Vegetarian'],
  western: [],
  carrot_cake: [],
  economic_rice: [],
  rojak: ['Vegetarian'],
  kaya_toast: ['Vegetarian'],
  prata: ['Halal'],
  mee_goreng: ['Halal'],
  claypot_rice: [],
  yong_tau_foo: ['Vegetarian'],
  dim_sum: [],
  bbq_stingray: ['No Pork'],
  seafood_platter: ['No Pork'],
  lei_cha: ['Vegetarian', 'Vegan'],
  porridge: ['Gluten-Free'],
  ban_mian: [],
  korean_bbq: [],
  sushi_bento: ['No Pork'],
  bubble_tea: ['Vegetarian'],
  kway_chap: [],
  bak_kut_teh: [],
  soy_dessert: ['Vegetarian', 'Vegan', 'Gluten-Free'],
  burger_joint: [],
};

let foodMenuTemplates = [
  {
    key: 'signature_laksa',
    name: 'Signature Laksa',
    description: 'Thick vermicelli with prawns, tau pok, and cockles.',
    category: 'Noodles',
    priceCents: 650,
    prepTimeMins: 8,
    imageUrl: 'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'black_pepper_crab',
    name: 'Black Pepper Crab Rice',
    description: 'Fragrant crab tossed with pepper sauce over rice.',
    category: 'Seafood',
    priceCents: 1800,
    prepTimeMins: 12,
    imageUrl: 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'hainanese_cutlet',
    name: 'Hainanese Pork Cutlet',
    description: 'Panko fried cutlet with tangy tomato sauce.',
    category: 'Mains',
    priceCents: 980,
    prepTimeMins: 9,
    imageUrl: 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    key: 'salted_egg_pasta',
    name: 'Salted Egg Yolk Pasta',
    description: 'Creamy salted egg sauce with curry leaves.',
    category: 'Mains',
    priceCents: 1100,
    prepTimeMins: 9,
    imageUrl: 'https://images.unsplash.com/photo-1432139509613-5c4255815697?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'otah_panini',
    name: 'Otah Panini Melt',
    description: 'Spicy otah stuffed into toasted ciabatta.',
    category: 'Snacks',
    priceCents: 620,
    prepTimeMins: 6,
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'teochew_braised_duck',
    name: 'Teochew Braised Duck Rice',
    description: 'Soy-braised duck with yam rice and pickles.',
    category: 'Rice',
    priceCents: 780,
    prepTimeMins: 10,
    imageUrl: 'https://images.pexels.com/photos/1435895/pexels-photo-1435895.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    key: 'curry_katsu',
    name: 'Curry Chicken Katsu',
    description: 'Japanese curry over crispy chicken cutlet.',
    category: 'Mains',
    priceCents: 1150,
    prepTimeMins: 9,
    imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'herbal_bak_kut_teh',
    name: 'Herbal Bak Kut Teh',
    description: 'Herbaceous broth with pork ribs and tofu puffs.',
    category: 'Soup',
    priceCents: 900,
    prepTimeMins: 11,
    imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'mala_xiang_guo',
    name: 'Mala Xiang Guo',
    description: 'Customisable spicy stir-fry with lotus root and meats.',
    category: 'Mains',
    priceCents: 1300,
    prepTimeMins: 9,
    imageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80&sat=30',
  },
  {
    key: 'butter_cereal_prawn',
    name: 'Butter Cereal Prawn Bowl',
    description: 'Crunchy prawns tossed in buttery cereal crumbs.',
    category: 'Seafood',
    priceCents: 1500,
    prepTimeMins: 10,
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'thunder_tea',
    name: 'Lei Cha Multigrain Bowl',
    description: 'Multigrain bowl with nuts, tofu, and herbal tea broth.',
    category: 'Rice',
    priceCents: 720,
    prepTimeMins: 8,
    imageUrl: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80&sat=-30',
  },
  {
    key: 'truffle_mushroom_risotto',
    name: 'Truffle Mushroom Risotto',
    description: 'Creamy risotto finished with shaved parmesan.',
    category: 'Mains',
    priceCents: 1380,
    prepTimeMins: 12,
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80&sat=-50',
  },
  {
    key: 'sambal_stingray',
    name: 'Mini Sambal Stingray',
    description: 'Individual banana-leaf stingray with chinchalok.',
    category: 'Seafood',
    priceCents: 1600,
    prepTimeMins: 11,
    imageUrl: 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    key: 'char_siew_bao',
    name: 'Char Siew Bao Trio',
    description: 'Steamed buns stuffed with caramelised pork.',
    category: 'Snacks',
    priceCents: 420,
    prepTimeMins: 5,
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80&sat=-60',
  },
  {
    key: 'honey_soy_chop',
    name: 'Honey Soy Chicken Chop',
    description: 'Grilled chop glazed with honey soy reduction.',
    category: 'Mains',
    priceCents: 1080,
    prepTimeMins: 9,
    imageUrl: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80&sat=20',
  },
  {
    key: 'phoenix_claypot',
    name: 'Phoenix Claypot Mee Sua',
    description: 'Mee sua simmered in superior stock with chicken.',
    category: 'Noodles',
    priceCents: 820,
    prepTimeMins: 8,
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80&sat=35',
  },
  {
    key: 'nyonya_curry',
    name: 'Nyonya Curry Chicken',
    description: 'Peranakan curry with potatoes and toasted bread.',
    category: 'Mains',
    priceCents: 990,
    prepTimeMins: 10,
    imageUrl: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80&hue=30',
  },
  {
    key: 'siew_yoke',
    name: 'Roasted Siew Yoke Bowl',
    description: 'Crispy pork belly over garlic rice.',
    category: 'Rice',
    priceCents: 900,
    prepTimeMins: 9,
    imageUrl: 'https://images.pexels.com/photos/704569/pexels-photo-704569.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    key: 'garden_salad',
    name: 'Garden Quinoa Salad',
    description: 'Roasted vegetables tossed with citrus dressing.',
    category: 'Salad',
    priceCents: 820,
    prepTimeMins: 6,
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'northern_hand_pulled',
    name: 'Northern Hand-Pulled Beef Noodles',
    description: 'Broad noodles with spiced beef broth.',
    category: 'Noodles',
    priceCents: 880,
    prepTimeMins: 9,
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80&sat=-15',
  },
];

let drinkMenuTemplates = [
  {
    key: 'kopi_gao',
    name: 'Kopi Gao',
    description: 'Thick Nanyang coffee pulled twice.',
    category: 'Drinks',
    priceCents: 250,
    prepTimeMins: 2,
    imageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80&sat=-70',
  },
  {
    key: 'teh_halia',
    name: 'Teh Halia',
    description: 'Creamy pulled tea infused with ginger.',
    category: 'Drinks',
    priceCents: 300,
    prepTimeMins: 3,
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'iced_yuzu',
    name: 'Iced Yuzu Honey',
    description: 'Refreshing citrus cooler with wild honey.',
    category: 'Drinks',
    priceCents: 420,
    prepTimeMins: 2,
    imageUrl: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80&sat=60',
  },
  {
    key: 'bandung_soda',
    name: 'Bandung Cream Soda',
    description: 'Rose syrup, milk, and soda over crushed ice.',
    category: 'Drinks',
    priceCents: 380,
    prepTimeMins: 2,
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80&sat=-80',
  },
  {
    key: 'matcha_latte',
    name: 'Iced Matcha Latte',
    description: 'Ceremonial matcha shaken with oat milk.',
    category: 'Drinks',
    priceCents: 520,
    prepTimeMins: 3,
    imageUrl: 'https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'tropical_sparkler',
    name: 'Tropical Sparkler',
    description: 'Passionfruit puree with soda and mint.',
    category: 'Drinks',
    priceCents: 460,
    prepTimeMins: 2,
    imageUrl: 'https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=1200&q=80&sat=50',
  },
  {
    key: 'lemongrass_tea',
    name: 'Chilled Lemongrass Tea',
    description: 'House-brewed lemongrass with pandan and honey dates.',
    category: 'Drinks',
    priceCents: 350,
    prepTimeMins: 2,
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80&sat=-100',
  },
  {
    key: 'milo_dinosaur',
    name: 'Milo Dinosaur',
    description: 'Iced Milo topped with heaping spoonful of Milo powder.',
    category: 'Drinks',
    priceCents: 480,
    prepTimeMins: 2,
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80&sat=-40',
  },
  {
    key: 'sparkling_kalamansi',
    name: 'Sparkling Calamansi',
    description: 'Cold-pressed calamansi with soda and basil seeds.',
    category: 'Drinks',
    priceCents: 420,
    prepTimeMins: 2,
    imageUrl: 'https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=1200&q=80&sat=-20',
  },
  {
    key: 'pulut_hitam_latte',
    name: 'Pulut Hitam Latte',
    description: 'Black glutinous rice dessert blended into iced latte.',
    category: 'Drinks',
    priceCents: 550,
    prepTimeMins: 3,
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80&hue=-20',
  },
];

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRandomGenerator(seed) {
  const seedFn = xmur3(seed);
  return mulberry32(seedFn());
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function shuffleWithRng(array, rng) {
  const items = [...array];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function pickTemplates(source, count, rng) {
  if (count <= 0 || source.length === 0) return [];
  let pool = shuffleWithRng(source, rng);
  const result = [];
  let pointer = 0;

  for (let i = 0; i < count; i += 1) {
    result.push(pool[pointer]);
    pointer += 1;
    if (pointer >= pool.length && i + 1 < count) {
      pool = shuffleWithRng(source, rng);
      pointer = 0;
    }
  }

  return result;
}

async function validateImageUrl(url) {
  if (!url) {
    throw new Error('Missing image URL');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(`Unable to fetch ${url}: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function filterTemplatesByImage(templates, label) {
  const valid = [];
  for (const template of templates) {
    try {
      await validateImageUrl(template.imageUrl);
      valid.push(template);
    } catch (error) {
      console.warn(`⚠️  Removing ${label} "${template.key}" - ${error.message}`);
    }
  }
  return valid;
}

async function ensureImageSetsValid() {
  stallTemplates = await filterTemplatesByImage(stallTemplates, 'stall template');
  foodMenuTemplates = await filterTemplatesByImage(foodMenuTemplates, 'food item');
  drinkMenuTemplates = await filterTemplatesByImage(drinkMenuTemplates, 'drink item');
}

function getCentreShortName(name) {
  if (!name) return 'Hawker Centre';
  return name.split('(')[0].trim();
}

function formatLocation(centreIndex, slotIndex) {
  const level = (slotIndex % 3) + 1;
  const unitNumber = ((centreIndex * 13 + slotIndex * 7) % 80) + 10;
  return `#0${level}-${unitNumber.toString().padStart(2, '0')}`;
}

function buildStallSeed(centre, centreIndex, slotIndex, template) {
  const shortName = getCentreShortName(centre.name);
  const seedKey = `${centre.slug ?? centre.name}-${template.key}-${slotIndex}`;
  return {
    seedKey,
    name: `${template.displayName} - ${shortName}`,
    description: `${template.description} Served daily at ${shortName}.`,
    location: formatLocation(centreIndex, slotIndex),
    cuisineType: template.cuisineType,
    dietaryTags: dietaryTagsByTemplateKey[template.key] ?? [],
    tags: template.tags,
    image_url: template.imageUrl,
  };
}

function generateStallsForCentre(centre, centreIndex) {
  const templateCount = stallTemplates.length;
  const rng = createRandomGenerator(`${centre.slug ?? centre.name}-stalls`);
  const targetCount = Math.min(
    templateCount,
    randomInt(rng, MIN_STALLS_PER_CENTRE, Math.min(MAX_STALLS_PER_CENTRE, templateCount))
  );
  const startIndex = (centreIndex * 3) % templateCount;
  const generated = [];

  for (let slot = 0; slot < targetCount; slot += 1) {
    const template = stallTemplates[(startIndex + slot) % templateCount];
    generated.push(buildStallSeed(centre, centreIndex, slot, template));
  }

  return generated;
}

function generateMenuItemsForSeed(seedKey) {
  const rng = createRandomGenerator(seedKey);
  const total = randomInt(rng, MIN_MENU_ITEMS, MAX_MENU_ITEMS);

  let foodCount = foodMenuTemplates.length > 0 ? Math.max(1, Math.round(total * FOOD_RATIO)) : 0;
  let drinkCount = total - foodCount;

  if (drinkMenuTemplates.length === 0) {
    foodCount = total;
    drinkCount = 0;
  } else if (drinkCount === 0 && total > 1) {
    drinkCount = 1;
    if (foodCount > 1) {
      foodCount -= 1;
    }
  }

  if (foodMenuTemplates.length === 0 && drinkMenuTemplates.length > 0) {
    drinkCount = total;
    foodCount = 0;
  }

  const foods = pickTemplates(foodMenuTemplates, foodCount, rng);
  const drinks = pickTemplates(drinkMenuTemplates, drinkCount, rng);
  const selected = [...foods, ...drinks];

  return selected.map((template, index) => ({
    key: `${seedKey}-menu-${index}`,
    name: template.name,
    description: template.description,
    imageUrl: template.imageUrl,
    priceCents: template.priceCents,
    category: template.category,
    prepTimeMins: template.prepTimeMins,
    isActive: true,
  }));
}

async function upsertMenuItems(stallId, menuItems) {
  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: {
        stallId_name: {
          stallId,
          name: item.name,
        },
      },
      update: {
        description: item.description,
        imageUrl: item.imageUrl,
        priceCents: item.priceCents,
        category: item.category,
        prepTimeMins: item.prepTimeMins,
        isActive: item.isActive,
      },
      create: {
        stallId,
        name: item.name,
        description: item.description,
        imageUrl: item.imageUrl,
        priceCents: item.priceCents,
        category: item.category,
        prepTimeMins: item.prepTimeMins,
        isActive: item.isActive,
      },
    });
  }
}

async function upsertStallWithMenus(centre, stallSeed) {
  const { seedKey, ...stallData } = stallSeed;

  const stall = await prisma.stall.upsert({
    where: { name: stallData.name },
    update: {
      ...stallData,
      hawkerCentreId: centre.id,
    },
    create: {
      ...stallData,
      hawkerCentreId: centre.id,
    },
  });

  const menuItems = generateMenuItemsForSeed(seedKey);
  await upsertMenuItems(stall.id, menuItems);
  return { stall, menuItemCount: menuItems.length };
}

async function main() {
  if (!SKIP_IMAGE_VALIDATION) {
    console.log('🔍 Validating stall and menu template images...');
    await ensureImageSetsValid();
    console.log(
      `✅ ${stallTemplates.length} stall templates, ${foodMenuTemplates.length} food templates, ${drinkMenuTemplates.length} drink templates ready.`
    );
  } else {
    console.log('⚠️  Skipping image validation (SKIP_IMAGE_VALIDATION set).');
  }

  if (stallTemplates.length === 0) {
    console.error('❌ No stall templates available after validation.');
    return;
  }
  if (foodMenuTemplates.length === 0 && drinkMenuTemplates.length === 0) {
    console.error('❌ No menu item templates available after validation.');
    return;
  }

  const centres = await prisma.hawkerCentre.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  if (centres.length === 0) {
    console.warn('⚠️  No hawker centres found. Seed hawker centres first.');
    return;
  }

  let stallCount = 0;
  let menuCount = 0;

  for (const [index, centre] of centres.entries()) {
    const generatedStalls = generateStallsForCentre(centre, index);
    for (const stallSeed of generatedStalls) {
      const result = await upsertStallWithMenus(centre, stallSeed);
      stallCount += 1;
      menuCount += result.menuItemCount;
    }
    console.log(`✅ Seeded ${generatedStalls.length} stalls for ${centre.name}`);
  }

  console.log(`🎉 Seeded ${stallCount} stalls and ${menuCount} menu items across ${centres.length} centres.`);
}

main()
  .catch((error) => {
    console.error('Stalls seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
