import { createHash, randomBytes } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/password.js';

const prisma = new PrismaClient();

const weekdayMorningSchedule = {
  mon: { open: '06:00', close: '11:00' },
  tue: { open: '06:00', close: '11:00' },
  wed: { open: '06:00', close: '11:00' },
  thu: { open: '06:00', close: '11:00' },
  fri: { open: '06:00', close: '11:00' },
  sat: { open: '06:00', close: '11:00' },
  sun: null,
};

type ProductSeed = {
  name: string;
  price: string;
};

type CategorySeed = {
  name: string;
  sortOrder: number;
  products: ProductSeed[];
};

const CATALOG: CategorySeed[] = [
  {
    name: 'Tapioca',
    sortOrder: 0,
    products: [
      { name: 'Tapioca Simples', price: '4.00' },
      { name: 'Tapioca c/ queijo', price: '9.00' },
      { name: 'Tapioca c/ ovo', price: '9.00' },
      { name: 'Tapioca c/ ovo e queijo', price: '11.00' },
      { name: 'Tapioca mista', price: '11.00' },
      { name: 'Tapioca mista e ovo', price: '13.00' },
      { name: 'Tapioca mista c/ banana', price: '14.00' },
      { name: 'Tapioca c/ castanha', price: '10.00' },
      { name: 'Tapioca c/ castanha e queijo', price: '12.00' },
      { name: 'Tapioca c/ castanha, queijo e tucumã', price: '19.00' },
      { name: 'Tapioca c/ castanha, queijo e banana', price: '16.00' },
      { name: 'Tapioca c/ castanha e banana', price: '14.00' },
      { name: 'Tapioca c/ castanha e tucumã', price: '17.00' },
      { name: 'Tapioca c/ banana', price: '10.00' },
      { name: 'Tapioca c/ banana e queijo', price: '12.00' },
      { name: 'Tapioca c/ banana e tucumã', price: '17.00' },
      { name: 'Tapioca c/ tucumã', price: '15.00' },
      { name: 'Tapioca c/ tucumã e queijo', price: '17.00' },
      { name: 'Tapioca c/ tucumã, queijo e ovo', price: '19.00' },
      { name: 'Tapioca c/ tucumã, queijo e presunto', price: '19.00' },
      { name: 'Caboquinho', price: '19.00' },
      { name: 'Caboquinho c/ castanha', price: '21.00' },
      { name: 'Caboquinho completo c/ carne', price: '28.00' },
      { name: 'Caboquinho completo', price: '24.00' },
      { name: 'Tapioca c/ carne', price: '14.00' },
      { name: 'Tapioca c/ carne e queijo', price: '16.00' },
      { name: 'Tapioca c/ carne, queijo e ovo', price: '18.00' },
      { name: 'Tapioca c/ carne e tucumã', price: '22.00' },
      { name: 'Tapioca c/ carne e banana', price: '17.00' },
    ],
  },
  {
    name: 'Cuscuz',
    sortOrder: 1,
    products: [
      { name: 'Cuscuz simples', price: '5.00' },
      { name: 'Cuscuz c/ queijo', price: '8.00' },
      { name: 'Cuscuz c/ ovo', price: '8.00' },
      { name: 'Cuscuz c/ queijo e presunto', price: '9.00' },
      { name: 'Cuscuz c/ ovo e queijo', price: '9.00' },
      { name: 'Cuscuz c/ carne', price: '13.00' },
      { name: 'Cuscuz c/ carne e queijo', price: '15.00' },
      { name: 'Cuscuz c/ queijo e banana', price: '11.00' },
      { name: 'Cuscuz c/ castanha e queijo', price: '11.00' },
    ],
  },
  {
    name: 'Sanduíche',
    sortOrder: 2,
    products: [
      { name: 'Pão c/ manteiga', price: '3.00' },
      { name: 'Pão c/ queijo', price: '6.00' },
      { name: 'Pão c/ ovo', price: '6.00' },
      { name: 'Pão c/ ovo e queijo', price: '7.00' },
      { name: 'Pão misto', price: '7.00' },
      { name: 'Pão misto c/ ovo', price: '9.00' },
      { name: 'Pão misto c/ banana', price: '12.00' },
      { name: 'Pão misto c/ banana e ovo', price: '14.00' },
      { name: 'Pão misto c/ tucumã', price: '17.00' },
      { name: 'Pão misto c/ tucumã e ovo', price: '19.00' },
      { name: 'Pão misto c/ carne', price: '16.00' },
      { name: 'Pão c/ banana', price: '8.00' },
      { name: 'Pão c/ banana e queijo', price: '10.00' },
      { name: 'Pão c/ banana, queijo e ovo', price: '12.00' },
      { name: 'Pão c/ banana e tucumã', price: '15.00' },
      { name: 'Pão c/ tucumã', price: '13.00' },
      { name: 'Pão c/ tucumã e queijo', price: '15.00' },
      { name: 'Pão c/ tucumã e ovo', price: '15.00' },
      { name: 'X caboquinho', price: '17.00' },
      { name: 'X caboquinho completo', price: '20.00' },
      { name: 'X caboquinho completo c/ carne', price: '25.00' },
      { name: 'Pão c/ carne', price: '12.00' },
      { name: 'Pão c/ carne e queijo', price: '14.00' },
      { name: 'Pão c/ carne, queijo e ovo', price: '16.00' },
      { name: 'Pão c/ carne e tucumã', price: '20.00' },
      { name: 'Pão c/ carne e banana', price: '16.00' },
    ],
  },
  {
    name: 'Café / Nescau',
    sortOrder: 3,
    products: [
      { name: 'Xícara', price: '4.00' },
      { name: 'Copo 180 ml', price: '3.00' },
      { name: 'Copo 250 ml', price: '4.00' },
      { name: 'Copo 400 ml', price: '6.00' },
      { name: 'Copo 500 ml', price: '8.00' },
    ],
  },
  {
    name: 'Suco',
    sortOrder: 4,
    products: [
      { name: 'Suco 250 ml', price: '4.00' },
      { name: 'Suco 400 ml', price: '6.00' },
      { name: 'Suco 500 ml', price: '8.00' },
    ],
  },
];

function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value || value.trim().length === 0) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value.trim();
}

function optionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function parsePositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} deve ser um inteiro maior ou igual a zero`);
  }
  return parsed;
}

function parseDeliveryFees(): Array<{ neighborhood: string; fee: Prisma.Decimal }> {
  const raw = process.env.SEED_DELIVERY_FEES?.trim();
  if (!raw) return [];

  return raw.split(';').map((entry) => {
    const [neighborhood, fee] = entry.split(':').map((part) => part.trim());
    if (!neighborhood || !fee) {
      throw new Error('SEED_DELIVERY_FEES deve seguir o formato "Bairro:5.00;Outro:7.00"');
    }
    return { neighborhood, fee: new Prisma.Decimal(fee.replace(',', '.')) };
  });
}

function shouldLoadInitialCatalog(): boolean {
  return (process.env.SEED_LOAD_INITIAL_CATALOG ?? 'true') === 'true';
}

function assertProductionPassword(password: string): void {
  if (password.length < 8) {
    throw new Error('SEED_OWNER_PASSWORD deve ter pelo menos 8 caracteres.');
  }
  if (password === 'admin1234') {
    throw new Error('SEED_OWNER_PASSWORD não pode ser a senha demo admin1234.');
  }
}

function assertResetConfirmed(): void {
  if (process.env.SEED_CONFIRM_RESET !== 'true') {
    throw new Error(
      'Seed bloqueado: defina SEED_CONFIRM_RESET=true para confirmar que os dados existentes podem ser apagados.',
    );
  }
}

function printerTokenFromEnv(): string {
  return process.env.SEED_PRINTER_TOKEN?.trim() || `pd_${randomBytes(32).toString('hex')}`;
}

async function cleanDatabase() {
  console.log('Limpando dados antigos...');
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
}

async function main() {
  assertResetConfirmed();

  const ownerEmail = env('SEED_OWNER_EMAIL');
  const ownerPassword = env('SEED_OWNER_PASSWORD');
  const ownerName = env('SEED_OWNER_NAME', 'Proprietário');
  const orgName = env('SEED_ORG_NAME', 'Café Beniel');
  const orgSlug = env('SEED_ORG_SLUG', 'cafe-beniel');
  const orgPhone = optionalEnv('SEED_ORG_PHONE');
  const orgAddress = optionalEnv('SEED_ORG_ADDRESS');
  const tableCount = parsePositiveInt('SEED_TABLE_COUNT', 10);
  const deliveryEnabled = (process.env.SEED_DELIVERY_ENABLED ?? 'true') === 'true';
  const defaultDeliveryFee = process.env.SEED_DEFAULT_DELIVERY_FEE ?? '0.00';
  const printerName = process.env.SEED_PRINTER_NAME?.trim() || 'Impressora principal';
  const printerToken = printerTokenFromEnv();
  const deliveryFees = parseDeliveryFees();
  const loadInitialCatalog = shouldLoadInitialCatalog();

  assertProductionPassword(ownerPassword);
  await cleanDatabase();

  console.log('Criando usuário owner...');
  const user = await prisma.user.create({
    data: {
      email: ownerEmail,
      name: ownerName,
      emailVerified: true,
    },
  });

  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: 'credential',
      password: hashPassword(ownerPassword),
    },
  });

  console.log('Criando organization...');
  const org = await prisma.organization.create({
    data: {
      name: orgName,
      slug: orgSlug,
      deliveryEnabled,
      deliverySchedule: weekdayMorningSchedule,
      defaultDeliveryFee: new Prisma.Decimal(defaultDeliveryFee),
      addressLine: orgAddress,
      phone: orgPhone,
    },
  });

  await prisma.member.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: 'owner',
    },
  });

  if (loadInitialCatalog) {
    console.log('Criando catálogo inicial do primeiro tenant...');
    for (const categorySeed of CATALOG) {
      const category = await prisma.category.create({
        data: {
          organizationId: org.id,
          name: categorySeed.name,
          sortOrder: categorySeed.sortOrder,
        },
      });

      await prisma.product.createMany({
        data: categorySeed.products.map((product, index) => ({
          organizationId: org.id,
          categoryId: category.id,
          name: product.name,
          price: new Prisma.Decimal(product.price),
          sortOrder: index,
        })),
      });
    }
  }

  if (tableCount > 0) {
    console.log('Criando mesas...');
    await prisma.table.createMany({
      data: Array.from({ length: tableCount }, (_, index) => ({
        organizationId: org.id,
        number: index + 1,
        capacity: 4,
      })),
    });
  }

  if (deliveryFees.length > 0) {
    console.log('Criando taxas de bairro...');
    await prisma.deliveryNeighborhoodFee.createMany({
      data: deliveryFees.map((deliveryFee) => ({
        organizationId: org.id,
        neighborhood: deliveryFee.neighborhood,
        fee: deliveryFee.fee,
      })),
    });
  }

  console.log('Criando printer device...');
  await prisma.printerDevice.create({
    data: {
      organizationId: org.id,
      name: printerName,
      tokenHash: createHash('sha256').update(printerToken).digest('hex'),
    },
  });

  const categoryCount = loadInitialCatalog ? CATALOG.length : 0;
  const productCount = loadInitialCatalog
    ? CATALOG.reduce((sum, category) => sum + category.products.length, 0)
    : 0;

  console.log('\nSeed concluído!');
  console.log(`  Org: ${org.name} (slug: ${org.slug})`);
  console.log(`  Owner: ${ownerEmail}`);
  console.log(`  Categorias: ${categoryCount}`);
  console.log(`  Produtos: ${productCount}`);
  console.log(`  Mesas: ${tableCount}`);
  console.log(`  Taxas de bairro: ${deliveryFees.length}`);
  console.log('\n  Print agent:');
  console.log(`    PRINTER_TOKEN=${printerToken}`);
  console.log('\nGuarde esse token agora; o banco armazena somente o hash.\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
