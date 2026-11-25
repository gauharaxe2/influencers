import 'dotenv/config';
import { SUPPORTED_COUNTRIES } from '@creator-platform/contracts';
import * as admin from 'firebase-admin';
import { loadConfig } from '../config/configuration';
import { COLLECTIONS } from './collections';
import { FirestoreService, initializeFirebaseAdmin } from './firestore.service';

const policyDefaults = {
  signupEnabled: true,
  creatorUploadsEnabled: true,
  adsEnabled: false,
  payoutsEnabled: false,
  dataRegion: 'asia-south1',
};

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  initializeFirebaseAdmin(config);

  const db = admin.firestore();
  const now = FirestoreService.timestampFromDate(new Date());

  const policies = [
    { id: 'GLOBAL', ...policyDefaults },
    {
      id: 'PK',
      signupEnabled: true,
      creatorUploadsEnabled: true,
      adsEnabled: false,
      payoutsEnabled: false,
      dataRegion: 'asia-south1',
    },
    ...SUPPORTED_COUNTRIES.filter(({ code }) => code !== 'PK').map(({ code }) => ({
      id: code,
      ...policyDefaults,
    })),
  ];

  const batch = db.batch();
  for (const policy of policies) {
    const ref = db.collection(COLLECTIONS.countryPolicies).doc(policy.id);
    batch.set(
      ref,
      {
        signupEnabled: policy.signupEnabled,
        creatorUploadsEnabled: policy.creatorUploadsEnabled,
        adsEnabled: policy.adsEnabled,
        payoutsEnabled: policy.payoutsEnabled,
        dataRegion: policy.dataRegion,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
  }

  await batch.commit();
}

main()
  .catch(() => {
    process.stderr.write('Country policy seed failed\n');
    process.exitCode = 1;
  })
  .finally(async () => {
    await admin.app().delete().catch(() => undefined);
  });