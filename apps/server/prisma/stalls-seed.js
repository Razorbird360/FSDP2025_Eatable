import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const prisma = new PrismaClient();
const STALLS_PER_CENTRE = 6;

const cuisineTemplates = [
  {
    key: 'chicken_rice',
    displayName: 'Yuan Ji Chicken Rice',
    cuisineType: 'Chicken Rice',
    description: 'Tender poached chicken with aromatic rice and house-made chilli.',
    imageUrl:
      'https://images.pexels.com/photos/30120279/pexels-photo-30120279.jpeg?auto=compress&cs=tinysrgb&w=1200',
    tags: ['chicken rice', 'comfort food', 'signature'],
    menuItems: [
      {
        name: 'Poached Chicken Rice',
        description: 'Classic Hainanese-style chicken with fragrant rice.',
        priceCents: 500,
        category: 'Rice',
        prepTimeMins: 8,
      },
      {
        name: 'Roasted Chicken Rice',
        description: 'Roasted variation with dark soy glaze.',
        priceCents: 520,
        category: 'Rice',
        prepTimeMins: 9,
      },
    ],
  },
  {
    key: 'fishball_noodles',
    displayName: 'Handmade Fishball Noodles',
    cuisineType: 'Teochew Noodles',
    description: 'Springy fishballs and mee pok tossed in savoury chilli.',
    imageUrl:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    tags: ['noodles', 'teochew', 'light bites'],
    menuItems: [
      {
        name: 'Dry Fishball Mee Pok',
        description: 'Mee pok tossed with vinegar, chilli, and handmade fishballs.',
        priceCents: 450,
        category: 'Noodles',
        prepTimeMins: 7,
      },
      {
        name: 'Fishball Soup with Mee Kia',
        description: 'Clear soup with fishballs, lettuce, and mee kia.',
        priceCents: 430,
        category: 'Soup',
        prepTimeMins: 6,
      },
    ],
  },
  {
    key: 'laksa',
    displayName: 'Katong Laksa Corner',
    cuisineType: 'Laksa',
    description: 'Rich coconut laksa broth with prawns and cockles.',
    imageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
    tags: ['laksa', 'spicy', 'noodles'],
    menuItems: [
      {
        name: 'Signature Laksa',
        description: 'Thick vermicelli with prawns, fishcake, and cockles.',
        priceCents: 600,
        category: 'Noodles',
        prepTimeMins: 8,
      },
      {
        name: 'Seafood Laksa Deluxe',
        description: 'Laksa topped with extra prawns and squid.',
        priceCents: 720,
        category: 'Noodles',
        prepTimeMins: 9,
      },
    ],
  },
  {
    key: 'satay',
    displayName: 'Serangoon Satay & Grill',
    cuisineType: 'Satay & Grill',
    description: 'Smoky charcoal-grilled satay with homemade peanut sauce.',
    imageUrl:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    tags: ['satay', 'grill', 'evening'],
    menuItems: [
      {
        name: 'Chicken Satay (10 sticks)',
        description: 'Served with cucumber, onions, and peanut sauce.',
        priceCents: 700,
        category: 'Snacks',
        prepTimeMins: 10,
      },
      {
        name: 'Beef Satay Set',
        description: 'Beef satay with lontong and salsa achar.',
        priceCents: 850,
        category: 'Snacks',
        prepTimeMins: 11,
      },
    ],
  },
  {
    key: 'prawn_noodles',
    displayName: 'Har Cheong Prawn Mee',
    cuisineType: 'Prawn Noodles',
    description: 'Deep prawn broth simmered for hours with pork bones.',
    imageUrl:
      'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=1200&q=80',
    tags: ['prawn noodles', 'broth', 'hearty'],
    menuItems: [
      {
        name: 'King Prawn Mee Soup',
        description: 'Broth with jumbo prawns and pork ribs.',
        priceCents: 700,
        category: 'Soup',
        prepTimeMins: 9,
      },
      {
        name: 'Dry Prawn Mee',
        description: 'Chilli tossed noodles with prawns and pork lard.',
        priceCents: 680,
        category: 'Noodles',
        prepTimeMins: 8,
      },
    ],
  },
  {
    key: 'nasi_lemak',
    displayName: 'Mak Cik Nasi Lemak',
    cuisineType: 'Nasi Lemak',
    description: 'Coconut rice with crispy chicken wing and ikan bilis.',
    imageUrl:
      'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=1200&q=80',
    tags: ['nasi lemak', 'malay cuisine', 'breakfast'],
    menuItems: [
      {
        name: 'Signature Nasi Lemak',
        description: 'Includes fried chicken wing, ikan bilis, peanuts, and sambal.',
        priceCents: 550,
        category: 'Rice',
        prepTimeMins: 6,
      },
      {
        name: 'Otah Nasi Lemak',
        description: 'Served with grilled otah and sunny-side egg.',
        priceCents: 600,
        category: 'Rice',
        prepTimeMins: 6,
      },
    ],
  },
  {
    key: 'vegetarian',
    displayName: 'Lotus Vegetarian Delights',
    cuisineType: 'Vegetarian',
    description: 'Wholesome plant-based bowls with local flavours.',
    imageUrl:
      'https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?auto=format&fit=crop&w=1200&q=80',
    tags: ['vegetarian', 'light', 'healthy'],
    menuItems: [
      {
        name: 'Thunder Tea Rice',
        description: 'Mixed greens, nuts, and grains with lei cha broth.',
        priceCents: 620,
        category: 'Rice',
        prepTimeMins: 8,
      },
      {
        name: 'Vegetarian Bee Hoon',
        description: 'Assorted mock meats with bee hoon and sambal.',
        priceCents: 500,
        category: 'Noodles',
        prepTimeMins: 7,
      },
    ],
  },
  {
    key: 'desserts',
    displayName: 'Chendol & Desserts Bar',
    cuisineType: 'Desserts',
    description: 'Icy treats and local desserts perfect for humid afternoons.',
    imageUrl:
      'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80',
    tags: ['desserts', 'cold drinks', 'sweet'],
    menuItems: [
      {
        name: 'Chendol Deluxe',
        description: 'Gula melaka chendol with red beans and attap seeds.',
        priceCents: 450,
        category: 'Dessert',
        prepTimeMins: 4,
      },
      {
        name: 'Ice Kachang',
        description: 'Shaved ice with syrup, corn, jelly, and beans.',
        priceCents: 420,
        category: 'Dessert',
        prepTimeMins: 4,
      },
    ],
  },
  {
    key: 'western',
    displayName: 'John’s Famous Steak & Grill',
    cuisineType: 'Western Grill',
    description: 'Hearty grilled meats and crispy fries.',
    imageUrl:
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80',
    tags: ['western', 'grill', 'steak'],
    menuItems: [
      {
        name: 'Ribeye Steak Set',
        description: 'Chargrilled ribeye with herb butter and fries.',
        priceCents: 1800,
        category: 'Mains',
        prepTimeMins: 12,
      },
      {
        name: 'Chicken Chop with Black Pepper Sauce',
        description: 'Served with coleslaw and fries.',
        priceCents: 1200,
        category: 'Mains',
        prepTimeMins: 10,
      },
    ],
  },
  {
    key: 'carrot_cake',
    displayName: 'Chye Tow Fried Carrot Cake',
    cuisineType: 'Snacks',
    description: 'Black and white carrot cake fried with garlic and egg.',
    imageUrl:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
    tags: ['carrot cake', 'wok hei', 'snack'],
    menuItems: [
      {
        name: 'White Carrot Cake',
        description: 'Plain radish cake with egg and chye poh.',
        priceCents: 480,
        category: 'Snacks',
        prepTimeMins: 6,
      },
      {
        name: 'Black Carrot Cake',
        description: 'Dark soy wok-fried carrot cake.',
        priceCents: 500,
        category: 'Snacks',
        prepTimeMins: 6,
      },
    ],
  },
];

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
  const stallName = `${template.displayName} - ${shortName}`;
  const description = `${template.description} Served daily at ${shortName}.`;

  return {
    name: stallName,
    description,
    location: formatLocation(centreIndex, slotIndex),
    cuisineType: template.cuisineType,
    tags: template.tags,
    image_url: template.imageUrl,
    menuItems: template.menuItems.map((item) => ({
      ...item,
      description: item.description,
      category: item.category,
    })),
  };
}

function generateStallsForCentre(centre, centreIndex) {
  const generated = [];
  const templateCount = cuisineTemplates.length;
  const startIndex = (centreIndex * 3) % templateCount;

  for (let slot = 0; slot < STALLS_PER_CENTRE; slot += 1) {
    const template = cuisineTemplates[(startIndex + slot) % templateCount];
    generated.push(buildStallSeed(centre, centreIndex, slot, template));
  }

  return generated;
}

async function upsertStallWithMenu(centreId, stallSeed) {
  const { menuItems, ...stallData } = stallSeed;

  const stall = await prisma.stall.upsert({
    where: { name: stallData.name },
    update: {
      ...stallData,
      hawkerCentreId: centreId,
    },
    create: {
      ...stallData,
      hawkerCentreId: centreId,
    },
  });

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: {
        stallId_name: {
          stallId: stall.id,
          name: item.name,
        },
      },
      update: {
        description: item.description,
        priceCents: item.priceCents,
        category: item.category,
        prepTimeMins: item.prepTimeMins ?? null,
        isActive: true,
      },
      create: {
        stallId: stall.id,
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
        category: item.category,
        prepTimeMins: item.prepTimeMins ?? null,
        isActive: true,
      },
    });
  }
}

async function main() {
  const centres = await prisma.hawkerCentre.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  if (centres.length === 0) {
    console.error('⚠️  No hawker centres found. Seed hawker centres first.');
    return;
  }

  let stallCount = 0;

  for (const [index, centre] of centres.entries()) {
    const generatedStalls = generateStallsForCentre(centre, index);
    for (const stallSeed of generatedStalls) {
      await upsertStallWithMenu(centre.id, stallSeed);
      stallCount += 1;
    }
    console.log(`✅ Seeded ${generatedStalls.length} stalls for ${centre.name}`);
  }

  console.log(`🎉 Seeded ${stallCount} stalls across ${centres.length} hawker centres.`);
}

main()
  .catch((error) => {
    console.error('Stalls seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
