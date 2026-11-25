import { ForbiddenException, Injectable } from '@nestjs/common';
import type { CountryPolicy } from '../domain/types';
import { FirestoreRepository } from '../firestore/firestore.repository';
import { resolveCountryPolicy } from './country-policy';

@Injectable()
export class CountryPolicyService {
  constructor(private readonly repository: FirestoreRepository) {}

  async resolve(countryCode: string): Promise<CountryPolicy | null> {
    const normalizedCode = countryCode.trim().toUpperCase();
    const countryPolicy = await this.repository.findCountryPolicy(normalizedCode);
    const globalPolicy = await this.repository.findCountryPolicy('GLOBAL');

    return resolveCountryPolicy(countryPolicy, globalPolicy);
  }

  async requireSignup(countryCode: string): Promise<CountryPolicy> {
    const policy = await this.resolve(countryCode);
    if (!policy?.signupEnabled) {
      throw new ForbiddenException('Signup is not available for this country');
    }
    return policy;
  }

  async requireCreatorUploads(countryCode: string): Promise<CountryPolicy> {
    const policy = await this.resolve(countryCode);
    if (!policy?.creatorUploadsEnabled) {
      throw new ForbiddenException('Creator uploads are not available for this country');
    }
    return policy;
  }
}