require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma Client with adapter
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { phone: '254700000000' },
    update: {},
    create: {
      phone: '254700000000',
      name: 'Admin User',
      email: 'admin@countypay.ke',
      password: adminPassword,
      role: 'admin'
    }
  });
  console.log('✅ Admin user created:', admin.phone);

  // Create test citizen user
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { phone: '254712345678' },
    update: {},
    create: {
      phone: '254712345678',
      name: 'John Doe',
      email: 'john@example.com',
      password: userPassword,
      role: 'citizen'
    }
  });
  console.log('✅ Test user created:', user.phone);

  // Create counties
  const counties = [
    { name: 'Nairobi County', code: 'NRB' },
    { name: 'Mombasa County', code: 'MSA' },
    { name: 'Kisumu County', code: 'KSM' },
    { name: 'Nakuru County', code: 'NKR' },
    { name: 'Kiambu County', code: 'KBU' }
  ];

  const createdCounties = [];
  for (const county of counties) {
    const created = await prisma.county.upsert({
      where: { code: county.code },
      update: {},
      create: county
    });
    createdCounties.push(created);
    console.log('✅ County created:', created.name);
  }

  // Create fees for each county
  const feeTypes = [
    { name: 'Business Permit', description: 'Annual business permit fee', amount: 5000 },
    { name: 'Parking Fee', description: 'Daily parking fee', amount: 200 },
    { name: 'Land Rates', description: 'Annual land rates', amount: 15000 },
    { name: 'Market Stall Fee', description: 'Monthly market stall fee', amount: 1500 },
    { name: 'Building Permit', description: 'Building construction permit', amount: 25000 }
  ];

  for (const county of createdCounties) {
    for (const feeType of feeTypes) {
      await prisma.fee.create({
        data: {
          name: feeType.name,
          description: feeType.description,
          amount: feeType.amount,
          countyId: county.id
        }
      });
    }
    console.log(`✅ Fees created for ${county.name}`);
  }

  console.log('🎉 Database seeding completed!');
  console.log('\n📝 Test Credentials:');
  console.log('Admin - Phone: 254700000000, Password: admin123');
  console.log('User  - Phone: 254712345678, Password: user123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

// Made with Bob
