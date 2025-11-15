import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed');

  const stall1 = await prisma.stall.upsert({
    where: { name: 'Ah Seng Chicken Rice' },
    update: {
      description: 'Famous for tender chicken rice since 1985',
      location: 'Block 123 Hougang Ave 1, #01-234',
      latitude: 1.3521,
      longitude: 103.8198,
      isVerified: true,
    },
    create: {
      name: 'Ah Seng Chicken Rice',
      description: 'Famous for tender chicken rice since 1985',
      location: 'Block 123 Hougang Ave 1, #01-234',
      latitude: 1.3521,
      longitude: 103.8198,
      isVerified: true,
    },
  });

  const stall2 = await prisma.stall.upsert({
    where: { name: 'Laksa Paradise' },
    update: {
      description: 'Authentic Singaporean laksa with rich coconut broth',
      location: 'Block 456 Bedok North Street 1, #01-567',
      latitude: 1.3282,
      longitude: 103.9332,
      isVerified: false,
    },
    create: {
      name: 'Laksa Paradise',
      description: 'Authentic Singaporean laksa with rich coconut broth',
      location: 'Block 456 Bedok North Street 1, #01-567',
      latitude: 1.3282,
      longitude: 103.9332,
      isVerified: false,
    },
  });

  await prisma.menuItem.upsert({
    where: { stallId_name: { stallId: stall1.id, name: 'Roasted Chicken Rice' } },
    update: {
      description: 'Tender roasted chicken with fragrant rice',
      priceCents: 450,
      isActive: true,
    },
    create: {
      stallId: stall1.id,
      name: 'Roasted Chicken Rice',
      description: 'Tender roasted chicken with fragrant rice',
      priceCents: 450,
      isActive: true,
    },
  });

  await prisma.menuItem.upsert({
    where: { stallId_name: { stallId: stall1.id, name: 'Steamed Chicken Rice' } },
    update: {
      description: 'Healthy steamed chicken with ginger sauce',
      priceCents: 420,
      isActive: true,
    },
    create: {
      stallId: stall1.id,
      name: 'Steamed Chicken Rice',
      description: 'Healthy steamed chicken with ginger sauce',
      priceCents: 420,
      isActive: true,
    },
  });

  await prisma.menuItem.upsert({
    where: { stallId_name: { stallId: stall2.id, name: 'Special Laksa' } },
    update: {
      description: 'Spicy coconut curry noodle soup',
      priceCents: 550,
      isActive: true,
    },
    create: {
      stallId: stall2.id,
      name: 'Special Laksa',
      description: 'Spicy coconut curry noodle soup',
      priceCents: 550,
      isActive: true,
    },
  });

  console.log('Seed completed successfully!');
  console.log(`Ensured ${2} stalls exist`);
  console.log(`Ensured ${3} menu items exist`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
