import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌶  Starting hawker seed');

  // 1) Demo user (for uploads + stall owner)
  const demoUser = await prisma.user.upsert({
    where: { email: 'foodie@example.com' },
    update: {
      displayName: 'Foodie Fan',
      username: 'foodiefan',
    },
    create: {
      email: 'foodie@example.com',
      displayName: 'Foodie Fan',
      username: 'foodiefan',
    },
  });

  // 2) Single hawker stall
  const stall = await prisma.stall.upsert({
    where: { name: 'Hougang Hawker Delights' },
    update: {
      description: 'Neighbourhood favourite spot for classic Singapore hawker food.',
      location: 'Blk 123 Hougang Ave 1, #01-23',
      latitude: 1.3721,
      longitude: 103.8921,
      isVerified: true,
      ownerId: demoUser.id,
    },
    create: {
      name: 'Hougang Hawker Delights',
      description: 'Neighbourhood favourite spot for classic Singapore hawker food.',
      location: 'Blk 123 Hougang Ave 1, #01-23',
      latitude: 1.3721,
      longitude: 103.8921,
      isVerified: true,
      ownerId: demoUser.id,
      tags: ['hawker', 'local', 'singapore'],
      cuisineType: 'Singaporean',
    },
  });

  console.log('✅ Stall ensured:', stall.name);

  // 3) 8 menu items
  const menuItemSeeds = [
    {
      name: 'Signature Chicken Rice',
      description: 'Tender steamed chicken with fragrant rice and homemade chilli.',
      priceCents: 450,
      category: 'Rice',
      prepTimeMins: 8,
    },
    {
      name: 'Roasted Chicken Rice',
      description: 'Crispy roasted chicken with dark soy and garlic chilli.',
      priceCents: 480,
      category: 'Rice',
      prepTimeMins: 9,
    },
    {
      name: 'Char Kway Teow',
      description: 'Wok hei packed flat rice noodles with lup cheong and cockles.',
      priceCents: 550,
      category: 'Noodles',
      prepTimeMins: 7,
    },
    {
      name: 'Hokkien Mee',
      description: 'Savoury prawn and squid noodles in rich seafood broth.',
      priceCents: 600,
      category: 'Noodles',
      prepTimeMins: 10,
    },
    {
      name: 'Nasi Lemak',
      description: 'Coconut rice with fried chicken wing, ikan bilis, and sambal.',
      priceCents: 520,
      category: 'Rice',
      prepTimeMins: 6,
    },
    {
      name: 'Fried Carrot Cake (Black)',
      description: 'Sweet dark soy radish cake with egg and chai poh.',
      priceCents: 480,
      category: 'Snacks',
      prepTimeMins: 6,
    },
    {
      name: 'Fried Carrot Cake (White)',
      description: 'Crispy white radish cake with egg and spring onion.',
      priceCents: 480,
      category: 'Snacks',
      prepTimeMins: 6,
    },
    {
      name: 'Oyster Omelette',
      description: 'Crispy egg batter with fresh oysters and chilli dip.',
      priceCents: 650,
      category: 'Snacks',
      prepTimeMins: 9,
    },
  ];

  const menuItems = [];

  for (const item of menuItemSeeds) {
    const menuItem = await prisma.menuItem.upsert({
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
        prepTimeMins: item.prepTimeMins,
        isActive: true,
      },
      create: {
        stallId: stall.id,
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
        category: item.category,
        prepTimeMins: item.prepTimeMins,
        isActive: true,
      },
    });

    menuItems.push(menuItem);
  }

  console.log(`✅ Ensured ${menuItems.length} menu items`);

  // 4) Clear existing uploads for these menu items (so repeated seeds don't spam)
  await prisma.mediaUpload.deleteMany({
    where: {
      menuItemId: { in: menuItems.map((m) => m.id) },
    },
  });

  // 5) 2–3 uploads per menu item
  const uploadsByName = {
    'Signature Chicken Rice': [
      {
        imageUrl:
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200',
        caption: 'Close-up of steamed chicken with chilli and ginger sauce.',
      },
      {
        imageUrl:
          'https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=1200',
        caption: 'Full plate with rice, cucumber, and soup on the side.',
      },
      {
        imageUrl:
          'https://images.unsplash.com/photo-1604908176997-1251886d2c87?q=80&w=1200',
        caption: 'Takeaway box version of the signature chicken rice.',
      },
    ],
    'Roasted Chicken Rice': [
      {
        imageUrl:
          'https://images.unsplash.com/photo-1525755662778-989d0524087e?q=80&w=1200',
        caption: 'Roasted chicken with glossy skin and dark soy drizzle.',
      },
      {
        imageUrl:
          'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?q=80&w=1200',
        caption: 'Close-up of roasted chicken thigh and fragrant rice.',
      },
    ],
    'Char Kway Teow': [
      {
        imageUrl:
          'https://images.unsplash.com/photo-1604908176997-1251886d2c87?q=80&w=1200',
        caption: 'Smoky char kway teow with cockles and beansprouts.',
      },
      {
        imageUrl:
          'https://images.unsplash.com/photo-1484723091739-30a097e8f929?q=80&w=1200',
        caption: 'Flat noodles glistening with wok hei and dark soy.',
      },
      {
        imageUrl:
          'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1200',
        caption: 'Zoomed shot showing lup cheong slices and egg.',
      },
    ],
    'Hokkien Mee': [
      {
        imageUrl:
          'https://images.unsplash.com/photo-1585036156171-384164a8c675?q=80&w=1200',
        caption: 'Hokkien mee with sambal and lime on the side.',
      },
      {
        imageUrl:
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200',
        caption: 'Brothy noodles topped with prawns and squid.',
      },
    ],
    'Nasi Lemak': [
      {
        imageUrl:
          'https://images.unsplash.com/photo-1587139223878-684fbd4383a5?q=80&w=1200',
        caption: 'Nasi lemak with fried chicken wing and sunny side up.',
      },
      {
        imageUrl:
          'https://images.unsplash.com/photo-1525755662778-989d0524087e?q=80&w=1200',
        caption: 'Overhead shot showing ikan bilis, peanuts, and sambal.',
      },
      {
        imageUrl:
          'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?q=80&w=1200',
        caption: 'Banana leaf nasi lemak set with extra sambal.',
      },
    ],
    'Fried Carrot Cake (Black)': [
      {
        imageUrl:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1200',
        caption: 'Dark carrot cake with egg and spring onion.',
      },
      {
        imageUrl:
          'https://images.unsplash.com/photo-1525755662778-989d0524087e?q=80&w=1200',
        caption: 'Close-up of sweet black carrot cake on plate.',
      },
    ],
    'Fried Carrot Cake (White)': [
      {
        imageUrl:
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200',
        caption: 'Crispy white carrot cake with chilli on the side.',
      },
      {
        imageUrl:
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200',
        caption: 'Top-down shot of pan-fried carrot cake cubes.',
      },
      {
        imageUrl:
          'https://images.unsplash.com/photo-1484723091739-30a097e8f929?q=80&w=1200',
        caption: 'White carrot cake with plenty of egg and chai poh.',
      },
    ],
    'Oyster Omelette': [
      {
        imageUrl:
          'https://images.unsplash.com/photo-1604908176997-1251886d2c87?q=80&w=1200',
        caption: 'Crispy oyster omelette served with tangy chilli sauce.',
      },
      {
        imageUrl:
          'https://images.unsplash.com/photo-1448043552756-e747b7a2b2b8?q=80&w=1200',
        caption: 'Close-up of oysters nestled in egg batter.',
      },
    ],
  };

  let uploadCount = 0;

  for (const menuItem of menuItems) {
    const uploadSeeds = uploadsByName[menuItem.name] || [];
    for (const upload of uploadSeeds) {
      await prisma.mediaUpload.create({
        data: {
          menuItemId: menuItem.id,
          userId: demoUser.id,
          imageUrl: upload.imageUrl,
          caption: upload.caption,
          validationStatus: 'approved',
          aiConfidenceScore: 0.95,
          reviewedAt: new Date(),
          reviewedBy: demoUser.id,
          upvoteCount: 0,
          downvoteCount: 0,
          voteScore: 0,
        },
      });
      uploadCount += 1;
    }
  }

  console.log(`✅ Created ${uploadCount} media uploads`);
  console.log('🎉 Hawker seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
