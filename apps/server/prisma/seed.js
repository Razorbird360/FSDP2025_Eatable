import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed');

  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      displayName: 'John Tan',
      role: 'user',
    },
  });

  const stallOwner = await prisma.user.upsert({
    where: { email: 'owner@hawker.sg' },
    update: {},
    create: {
      email: 'owner@hawker.sg',
      displayName: 'Hawker Owner',
      role: 'stall_owner',
    },
  });

  const stall1 = await prisma.stall.create({
    data: {
      ownerId: stallOwner.id,
      name: 'Ah Seng Chicken Rice',
      description: 'Famous for tender chicken rice since 1985',
      location: 'Block 123 Hougang Ave 1, #01-234',
      latitude: 1.3521,
      longitude: 103.8198,
      isVerified: true,
    },
  });

  const stall2 = await prisma.stall.create({
    data: {
      name: 'Laksa Paradise',
      description: 'Authentic Singaporean laksa with rich coconut broth',
      location: 'Block 456 Bedok North Street 1, #01-567',
      latitude: 1.3282,
      longitude: 103.9332,
      isVerified: false,
    },
  });

  const menuItem1 = await prisma.menuItem.create({
    data: {
      stallId: stall1.id,
      name: 'Roasted Chicken Rice',
      description: 'Tender roasted chicken with fragrant rice',
      priceCents: 450, // $4.50
      isActive: true,
    },
  });

  const menuItem2 = await prisma.menuItem.create({
    data: {
      stallId: stall1.id,
      name: 'Steamed Chicken Rice',
      description: 'Healthy steamed chicken with ginger sauce',
      priceCents: 420, // $4.20
      isActive: true,
    },
  });

  const menuItem3 = await prisma.menuItem.create({
    data: {
      stallId: stall2.id,
      name: 'Special Laksa',
      description: 'Spicy coconut curry noodle soup',
      priceCents: 550, // $5.50
      isActive: true,
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log(`Created ${2} users`);
  console.log(`Created ${2} stalls`);
  console.log(`Created ${3} menu items`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
