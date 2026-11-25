import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { FirestoreRepository } from './firestore.repository';
import { FirestoreService } from './firestore.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [FirestoreService, FirestoreRepository],
  exports: [FirestoreService, FirestoreRepository],
})
export class FirestoreModule {}