import { Prisma } from '@prisma/client';

console.log('Prisma.dmmf available:', !!Prisma.dmmf);
if (Prisma.dmmf) {
  console.log('Models:', Prisma.dmmf.datamodel.models.map(m => m.name));
}
