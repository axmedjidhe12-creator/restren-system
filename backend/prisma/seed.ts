import { PrismaClient, Role, TableStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // 1. Create Plans
  const starterPlan = await prisma.plan.upsert({
    where: { name: 'Starter' },
    update: {},
    create: {
      id: 'plan-starter',
      name: 'Starter',
      priceEtb: 1500.0,
      maxBranches: 2,
      maxTables: 20,
      maxStaff: 10,
      features: ['QR Menu', 'KDS', 'Waiter App', 'Digital Receipts']
    }
  });

  const proPlan = await prisma.plan.upsert({
    where: { name: 'Pro Enterprise' },
    update: {},
    create: {
      id: 'plan-pro',
      name: 'Pro Enterprise',
      priceEtb: 3500.0,
      maxBranches: 5,
      maxTables: 50,
      maxStaff: 30,
      features: ['QR Menu', 'KDS', 'Inventory Tracking', 'Analytics', 'Multi-payment']
    }
  });

  // 2. SuperAdmin User
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@restren.com' },
    update: {},
    create: {
      email: 'superadmin@restren.com',
      fullName: 'Super Administrator',
      phone: '+252610000000',
      passwordHash,
      role: Role.SUPER_ADMIN,
      isActive: true
    }
  });
  console.log('✅ SuperAdmin created:', superAdmin.email);

  // 3. Demo Restaurant
  let restaurant = await prisma.restaurant.findUnique({
    where: { slug: 'safari-restaurant' }
  });

  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: {
        name: 'Safari Restaurant & Lounge',
        slug: 'safari-restaurant',
        email: 'info@safarirestaurant.com',
        phone: '+252615551122',
        logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80',
        planId: proPlan.id,
        subscriptionStatus: 'ACTIVE',
        branches: {
          create: {
            name: 'Mogadishu Main Branch',
            address: 'KM4 Square, Hodan',
            city: 'Mogadishu',
            phone: '+252615551122'
          }
        }
      }
    });
  }
  console.log('✅ Demo Restaurant created:', restaurant.name);

  const mainBranch = await prisma.branch.findFirst({
    where: { restaurantId: restaurant.id }
  });

  if (!mainBranch) return;

  // 4. Users for Demo Restaurant
  await prisma.user.upsert({
    where: { email: 'owner@safari.com' },
    update: {},
    create: {
      email: 'owner@safari.com',
      fullName: 'Ahmed Ali (Owner)',
      phone: '+252615001122',
      passwordHash,
      role: Role.RESTAURANT_OWNER,
      restaurantId: restaurant.id,
      branchId: mainBranch.id,
      isActive: true
    }
  });

  await prisma.user.upsert({
    where: { email: 'kitchen@safari.com' },
    update: {},
    create: {
      email: 'kitchen@safari.com',
      fullName: 'Chef Hassan (Kitchen)',
      phone: '+252615001123',
      passwordHash,
      role: Role.KITCHEN_STAFF,
      restaurantId: restaurant.id,
      branchId: mainBranch.id,
      isActive: true
    }
  });

  await prisma.user.upsert({
    where: { email: 'waiter@safari.com' },
    update: { waiterCode: '1234' },
    create: {
      email: 'waiter@safari.com',
      fullName: 'Farhan Waiter (Staff)',
      phone: '+252615001124',
      passwordHash,
      role: Role.WAITER,
      restaurantId: restaurant.id,
      branchId: mainBranch.id,
      waiterCode: '1234',
      isActive: true
    }
  });

  console.log('✅ Restaurant Owner, Kitchen Staff & Waiter created');

  // 5. Categories & Menu Items
  const catTraditional = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: { en: 'Somali Traditional Dishes', so: 'Cuntooyinka Dhaqanka' },
      sortOrder: 1,
      menuItems: {
        create: [
          {
            restaurantId: restaurant.id,
            name: { en: 'Baasto Baraf & Suqaar', so: 'Baasto Baraf & Suqaar' },
            description: { en: 'Delicious fresh pasta served with spiced beef suqaar and banana', so: 'Baasto carfaysa oo leh suqaar hilib lo\'aad iyo moos' },
            price: 6.50,
            images: ['https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500&q=80'],
            isAvailable: true,
            prepTimeMins: 15
          },
          {
            restaurantId: restaurant.id,
            name: { en: 'Bariis Isku Dhex Karis & Hilib Geel', so: 'Bariis Isku Dhex Karis & Hilib Geel' },
            description: { en: 'Traditional spiced rice with tender camel meat steak & fresh salad', so: 'Bariis cajiib ah oo leh hilib geel jilicsan iyo saladh' },
            price: 8.00,
            images: ['https://images.unsplash.com/photo-1539136788836-5699e78bfc75?w=500&q=80'],
            isAvailable: true,
            prepTimeMins: 20
          }
        ]
      }
    }
  });

  const catFastFood = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: { en: 'Burgers & Fast Food', so: 'Burgers & Fast Food' },
      sortOrder: 2,
      menuItems: {
        create: [
          {
            restaurantId: restaurant.id,
            name: { en: 'Safari Special Double Cheeseburger', so: 'Safari Special Double Cheeseburger' },
            description: { en: 'Double beef patty, cheddar cheese, caramelized onions, special sauce', so: 'Double beef patty oo leh cheese iyo sauce gaar ah' },
            price: 7.50,
            images: ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80'],
            isAvailable: true,
            prepTimeMins: 12
          },
          {
            restaurantId: restaurant.id,
            name: { en: 'Loaded Crispy Chicken Pizza', so: 'Loaded Crispy Chicken Pizza' },
            description: { en: 'Crispy chicken, mozzarella, bell peppers, BBQ drizzle', so: 'Pizza hilib digaag oo leh mozzarella iyo BBQ' },
            price: 10.00,
            images: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80'],
            isAvailable: true,
            prepTimeMins: 18
          }
        ]
      }
    }
  });

  const catDrinks = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: { en: 'Fresh Juices & Drinks', so: 'Cabbitaannada Fresh-ka Ah' },
      sortOrder: 3,
      menuItems: {
        create: [
          {
            restaurantId: restaurant.id,
            name: { en: 'Fresh Mango & Passion Fruit Smoothie', so: 'Cabbitaan Mangao & Passion Fresh' },
            description: { en: '100% natural organic fresh mango and passion fruit blend', so: 'Cabbitaan dabiici ah oo mango iyo passion fruit ah' },
            price: 2.50,
            images: ['https://images.unsplash.com/photo-1546173159-315724a31696?w=500&q=80'],
            isAvailable: true,
            prepTimeMins: 5
          },
          {
            restaurantId: restaurant.id,
            name: { en: 'Somali Spiced Shaah Cadane (Tea)', so: 'Shaah Cadane Bigays Ah' },
            description: { en: 'Traditional spiced milk tea with cardamom and ginger', so: 'Shaah cadeys carfaya oo leh xawaash iyo sinjibiil' },
            price: 1.00,
            images: ['https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80'],
            isAvailable: true,
            prepTimeMins: 3
          }
        ]
      }
    }
  });

  console.log('✅ Categories & Menu Items created');

  // 6. Restaurant Tables with QR Codes
  const tables = [
    { tableNumber: 'T-01', capacity: 4, qrCodeUrl: 'http://localhost:5173/menu/safari-restaurant?table=T-01' },
    { tableNumber: 'T-02', capacity: 2, qrCodeUrl: 'http://localhost:5173/menu/safari-restaurant?table=T-02' },
    { tableNumber: 'T-03', capacity: 6, qrCodeUrl: 'http://localhost:5173/menu/safari-restaurant?table=T-03' },
    { tableNumber: 'T-04', capacity: 4, qrCodeUrl: 'http://localhost:5173/menu/safari-restaurant?table=T-04' },
    { tableNumber: 'VIP-01', capacity: 8, qrCodeUrl: 'http://localhost:5173/menu/safari-restaurant?table=VIP-01' }
  ];

  for (const tbl of tables) {
    const existingTable = await prisma.restaurantTable.findFirst({
      where: { branchId: mainBranch.id, tableNumber: tbl.tableNumber }
    });

    if (!existingTable) {
      await prisma.restaurantTable.create({
        data: {
          restaurantId: restaurant.id,
          branchId: mainBranch.id,
          tableNumber: tbl.tableNumber,
          capacity: tbl.capacity,
          qrCodeUrl: tbl.qrCodeUrl,
          status: TableStatus.AVAILABLE
        }
      });
    }
  }

  console.log('✅ Restaurant Tables & QR Codes created');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
