import 'dotenv/config';
import { SUPPORTED_COUNTRIES } from '@creator-platform/contracts';
import * as admin from 'firebase-admin';
import { loadConfig } from '../config/configuration';
import { COLLECTIONS } from './collections';
import { FirestoreService } from './firestore.service';

const policyDefaults = {
  signupEnabled: true,
  creatorUploadsEnabled: true,
  adsEnabled: false,
  payoutsEnabled: false,
  dataRegion: 'global',
};

async function main(): Promise<void> {
  const config = loadConfig(process.env);

  if (!admin.apps.length) {
    if (config.firebaseServiceAccountJson) {
      admin.initializeApp({
        credential: admin.credential.cert(
          JSON.parse(config.firebaseServiceAccountJson) as admin.ServiceAccount,
        ),
        projectId: config.firebaseProjectId,
      });
    } else {
      admin.initializeApp({ projectId: config.firebaseProjectId });
    }
  }

  const db = admin.firestore();
  const now = FirestoreService.timestampFromDate(new Date());

  const policies = [
    { id: 'GLOBAL', ...policyDefaults },
    ...SUPPORTED_COUNTRIES.map(({ code }) => ({ id: code, ...policyDefaults })),
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