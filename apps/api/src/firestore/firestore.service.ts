import { Injectable, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { APP_CONFIG } from '../config/configuration';
import type { AppConfig } from '../config/configuration';

export function initializeFirebaseAdmin(config: {
  firebaseProjectId: string;
  firebaseServiceAccountJson?: string;
}): void {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  if (admin.apps.length) {
    return;
  }

  const projectId = config.firebaseProjectId;
  if (config.firebaseServiceAccountJson) {
    const credential = admin.credential.cert(
      JSON.parse(config.firebaseServiceAccountJson) as admin.ServiceAccount,
    );
    admin.initializeApp({ credential, projectId });
    return;
  }

  admin.initializeApp({ projectId });
}

@Injectable()
export class FirestoreService implements OnModuleInit {
  private db!: Firestore;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  onModuleInit(): void {
    initializeFirebaseAdmin(this.config);
    this.db = admin.firestore();
  }

  get firestore(): Firestore {
    return this.db;
  }

  runTransaction<T>(fn: (transaction: Transaction) => Promise<T>): Promise<T> {
    return this.db.runTransaction(fn);
  }

  static timestampFromDate(date: Date): admin.firestore.Timestamp {
    return admin.firestore.Timestamp.fromDate(date);
  }
}