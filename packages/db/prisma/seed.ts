import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/password.js';

const prisma = new PrismaClient();

const DEMO = {
  email: 'owner@cafe.local',
  password: 'admin1234',
  ownerName: 'Caio (Owner)',
  orgName: 'Café Beniel',
  orgSlug: 'cafe-beniel',
  // Token fixo de DESENVOLVIMENTO para o print-agent autenticar sem precisar
  // emitir um via API. Em produção: criar via POST /api/v1/printer-devices.
  printerName: 'Impressora Dev (placeholder)',
  printerToken: 'pd_local_dev_4Yh3Kx9mN2pQ7vR8sT1uV5wXyZaBcDeFgHiJkLmNoPqRs',
};

async function main() {
  console.log('Limpando dados antigos...');
  // Ordem importa por causa das FKs.
  await prisma.orderItemAddon.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.printJob.deleteMany();
  await prisma.printerDevice.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.productAddon.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.deliveryNeighborhoodFee.deleteMany();
  await prisma.member.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();

  console.log('Criando usuário owner...');
  const user = await prisma.user.create({
    data: {
      email: DEMO.email,
      name: DEMO.ownerName,
      emailVerified: true,
    },
  });

  // Account com password hash (compatível com Better Auth scrypt default).
  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: 'credential',
      password: hashPassword(DEMO.password),
    },
  });

  console.log('Criando organization...');
  const org = await prisma.organization.create({
    data: {
      name: DEMO.orgName,
      slug: DEMO.orgSlug,
      deliveryEnabled: true,
      deliverySchedule: {
        mon: { open: '06:00', close: '11:00' },
        tue: { open: '06:00', close: '11:00' },
        wed: { open: '06:00', close: '11:00' },
        thu: { open: '06:00', close: '11:00' },
        fri: { open: '06:00', close: '11:00' },
        sat: { open: '07:00', close: '12:00' },
        sun: null,
      },
      defaultDeliveryFee: new Prisma.Decimal('5.00'),
      addressLine: 'Rua do Café, 123 - Centro',
      phone: '(11) 99999-0000',
    },
  });

  await prisma.member.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: 'owner',
    },
  });

  console.log('Criando categorias e produtos...');
  const cats = await Promise.all([
    prisma.category.create({
      data: { organizationId: org.id, name: 'Pães', sortOrder: 0 },
    }),
    prisma.category.create({
      data: { organizationId: org.id, name: 'Cafés', sortOrder: 1 },
    }),
    prisma.category.create({
      data: { organizationId: org.id, name: 'Sucos & Vitaminas', sortOrder: 2 },
    }),
    prisma.category.create({
      data: { organizationId: org.id, name: 'Doces & Bolos', sortOrder: 3 },
    }),
  ]);

  const [paes, cafes, sucos, doces] = cats;

  const pAuClaire = await prisma.product.create({
    data: {
      organizationId: org.id,
      categoryId: paes!.id,
      name: 'Pão na Chapa',
      description: 'Pão francês na chapa com manteiga',
      price: new Prisma.Decimal('6.50'),
      sortOrder: 0,
    },
  });

  await prisma.productAddon.createMany({
    data: [
      {
        organizationId: org.id,
        productId: pAuClaire.id,
        name: '+ Queijo',
        price: new Prisma.Decimal('3.00'),
      },
      {
        organizationId: org.id,
        productId: pAuClaire.id,
        name: '+ Presunto',
        price: new Prisma.Decimal('3.50'),
      },
      {
        organizationId: org.id,
        productId: pAuClaire.id,
        name: '+ Ovo',
        price: new Prisma.Decimal('2.00'),
      },
    ],
  });

  await prisma.product.createMany({
    data: [
      {
        organizationId: org.id,
        categoryId: paes!.id,
        name: 'Misto Quente',
        description: 'Pão, queijo, presunto, na chapa',
        price: new Prisma.Decimal('12.00'),
        sortOrder: 1,
      },
      {
        organizationId: org.id,
        categoryId: paes!.id,
        name: 'Tapioca de Queijo',
        description: 'Tapioca recheada com queijo coalho',
        price: new Prisma.Decimal('10.00'),
        sortOrder: 2,
      },
      {
        organizationId: org.id,
        categoryId: cafes!.id,
        name: 'Café Coado',
        description: '200ml',
        price: new Prisma.Decimal('5.00'),
        sortOrder: 0,
      },
      {
        organizationId: org.id,
        categoryId: cafes!.id,
        name: 'Pingado',
        description: 'Café com leite',
        price: new Prisma.Decimal('7.00'),
        sortOrder: 1,
      },
      {
        organizationId: org.id,
        categoryId: cafes!.id,
        name: 'Capuccino',
        description: '300ml com canela',
        price: new Prisma.Decimal('11.00'),
        sortOrder: 2,
      },
      {
        organizationId: org.id,
        categoryId: sucos!.id,
        name: 'Suco de Laranja',
        description: 'Natural, 400ml',
        price: new Prisma.Decimal('9.50'),
        sortOrder: 0,
      },
      {
        organizationId: org.id,
        categoryId: sucos!.id,
        name: 'Vitamina de Banana',
        description: 'Com leite e aveia',
        price: new Prisma.Decimal('11.00'),
        sortOrder: 1,
      },
      {
        organizationId: org.id,
        categoryId: doces!.id,
        name: 'Pão de Mel',
        description: 'Coberto com chocolate',
        price: new Prisma.Decimal('6.00'),
        sortOrder: 0,
      },
      {
        organizationId: org.id,
        categoryId: doces!.id,
        name: 'Bolo de Fubá',
        description: 'Fatia generosa',
        price: new Prisma.Decimal('7.50'),
        sortOrder: 1,
      },
    ],
  });

  console.log('Criando mesas...');
  await prisma.table.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      organizationId: org.id,
      number: i + 1,
      capacity: i < 6 ? 4 : 6,
    })),
  });

  console.log('Criando clientes delivery...');
  await prisma.customer.createMany({
    data: [
      {
        organizationId: org.id,
        name: 'Maria Silva',
        phone: '11988880001',
        address: 'Av. Paulista, 1000, apto 52',
        neighborhood: 'Bela Vista',
      },
      {
        organizationId: org.id,
        name: 'João Souza',
        phone: '11988880002',
        address: 'Rua Augusta, 500',
        neighborhood: 'Consolação',
      },
    ],
  });

  console.log('Criando taxas de bairro...');
  await prisma.deliveryNeighborhoodFee.createMany({
    data: [
      {
        organizationId: org.id,
        neighborhood: 'Bela Vista',
        fee: new Prisma.Decimal('5.00'),
      },
      {
        organizationId: org.id,
        neighborhood: 'Consolação',
        fee: new Prisma.Decimal('7.00'),
      },
      {
        organizationId: org.id,
        neighborhood: 'Centro',
        fee: new Prisma.Decimal('4.00'),
      },
    ],
  });

  console.log('Criando printer device placeholder...');
  await prisma.printerDevice.create({
    data: {
      organizationId: org.id,
      name: DEMO.printerName,
      tokenHash: createHash('sha256').update(DEMO.printerToken).digest('hex'),
    },
  });

  console.log('\nSeed concluído!');
  console.log(`  Org: ${org.name} (slug: ${org.slug})`);
  console.log(`  Owner: ${DEMO.email} / senha: ${DEMO.password}`);
  console.log('  IMPORTANTE: o hash usa scrypt nos mesmos params do Better Auth default.');
  console.log(
    '  Se o Better Auth for configurado com outro hasher no Passo 1.4, rode `pnpm db:seed` de novo.',
  );
  console.log('\n  Print agent (dev):');
  console.log(`    PRINTER_TOKEN=${DEMO.printerToken}`);
  console.log('  Em produção, gere via POST /api/v1/printer-devices.\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
