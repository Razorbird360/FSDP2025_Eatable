@echo off
echo 🌱 Seeding database...

REM Run Prisma migrations
echo 📊 Running migrations...
call pnpm prisma:migrate

REM Seed the database
echo 🌾 Seeding data...
call pnpm prisma:seed

echo.
echo ✅ Database seeded successfully!
echo.
echo You can view your data at: http://localhost:5555
echo Run: pnpm prisma:studio
