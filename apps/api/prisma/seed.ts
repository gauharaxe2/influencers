import 'dotenv/config';
import { SUPPORTED_COUNTRIES } from '@creator-platform/contracts';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const policyDefaults = {
  signupEnabled: true,
  creatorUploadsEnabled: true,
  adsEnabled: false,
  payoutsEnabled: false,
  dataRegion: 'global',
};

async function main(): Promise<void> {
  const policies = [
    { id: 'GLOBAL', ...policyDefaults },
    ...SUPPORTED_COUNTRIES.map(({ code }) => ({ id: code, ...policyDefaults })),
  ];

  await prisma.$transaction(
    policies.map((policy) =>
      prisma.countryPolicy.upsert({
        where: { id: policy.id },
        create: policy,
        update: policy,
      }),
    ),
  );
}

main()
  .catch(() => {
    process.stderr.write('Country policy seed failed\n');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
