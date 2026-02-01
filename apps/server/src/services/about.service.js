import prisma from '../lib/prisma.js';

const toPercent = (num, den) => (den ? Math.round((num / den) * 100) : 0);

async function getAboutStats() {
  const [
    totalStalls,
    stallsWithActiveMenus,
    totalMenuItems,
    menuItemsWithPrep,
    stallsWithUploads
  ] = await Promise.all([
    prisma.stall.count(),
    prisma.stall.count({
      where: { menuItems: { some: { isActive: true } } }
    }),
    prisma.menuItem.count(),
    prisma.menuItem.count({ where: { prepTimeMins: { not: null } } }),
    prisma.stall.count({
      where: {
        menuItems: {
          some: {
            mediaUploads: { some: { validationStatus: 'approved' } }
          }
        }
      }
    })
  ]);

  return {
    totals: {
      totalStalls,
      stallsWithActiveMenus,
      totalMenuItems,
      menuItemsWithPrep,
      stallsWithUploads
    },
    percentages: {
      activeStalls: toPercent(stallsWithActiveMenus, totalStalls),
      menuItemsWithPrep: toPercent(menuItemsWithPrep, totalMenuItems),
      stallsWithUploads: toPercent(stallsWithUploads, totalStalls)
    }
  };
}

export default { getAboutStats };
