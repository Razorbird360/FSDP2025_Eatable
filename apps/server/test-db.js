import prisma from './src/lib/prisma.js';

async function testDatabase() {
  console.log('🔍 Testing database connection...\n');

  try {
    console.log('1️⃣ Creating test user...');
    const user = await prisma.user.create({
      data: {
        email: 'test@eatable.com',
        displayName: 'Test User',
        role: 'user',
      },
    });
    console.log('✅ User created:', { id: user.id, email: user.email, displayName: user.displayName });

    console.log('\n2️⃣ Creating test stall...');
    const stall = await prisma.stall.create({
      data: {
        name: 'Test Hawker Stall',
        description: 'A test stall for database verification',
        location: 'Chinatown',
        cuisineType: 'Chinese',
        tags: ['halal', 'vegetarian'],
        ownerId: user.id,
      },
    });
    console.log('✅ Stall created:', { id: stall.id, name: stall.name, cuisineType: stall.cuisineType, tags: stall.tags });

    console.log('\n3️⃣ Creating test menu item...');
    const menuItem = await prisma.menuItem.create({
      data: {
        name: 'Chicken Rice',
        description: 'Delicious Hainanese chicken rice',
        priceCents: 450,
        category: 'Main',
        prepTimeMins: 15,
        stallId: stall.id,
      },
    });
    console.log('✅ Menu item created:', {
      id: menuItem.id,
      name: menuItem.name,
      price: `$${menuItem.priceCents / 100}`,
      category: menuItem.category,
      prepTime: `${menuItem.prepTimeMins} mins`
    });

    console.log('\n4️⃣ Reading back data with relations...');
    const stallWithItems = await prisma.stall.findUnique({
      where: { id: stall.id },
      include: {
        owner: true,
        menuItems: true,
      },
    });
    console.log('✅ Stall with relations:', {
      stall: stallWithItems.name,
      owner: stallWithItems.owner.displayName,
      menuItems: stallWithItems.menuItems.length,
    });

    console.log('\n5️⃣ Testing favorites (new feature)...');
    const favorite = await prisma.userFavorite.create({
      data: {
        userId: user.id,
        menuItemId: menuItem.id,
      },
    });
    console.log('✅ Favorite created:', { userId: favorite.userId, menuItemId: favorite.menuItemId });

    console.log('\n6️⃣ Cleaning up test data...');
    await prisma.userFavorite.delete({ where: { id: favorite.id } });
    await prisma.menuItem.delete({ where: { id: menuItem.id } });
    await prisma.stall.delete({ where: { id: stall.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All database tests passed!');
    console.log('✅ Database connection: Working');
    console.log('✅ CRUD operations: Working');
    console.log('✅ Relations: Working');
    console.log('✅ New features (favorites): Working');

  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
