import { ForbiddenException, Injectable } from '@nestjs/common';
import type { CountryPolicy } from '@prisma/client';
import { resolveCountryPolicy } from './country-policy';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CountryPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(countryCode: string): Promise<CountryPolicy | null> {
    const normalizedCode = countryCode.trim().toUpperCase();
    const countryPolicy = await this.prisma.countryPolicy.findUnique({
      where: { id: normalizedCode },
    });
    const globalPolicy = await this.prisma.countryPolicy.findUnique({
      where: { id: 'GLOBAL' },
    });

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
