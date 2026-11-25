import { Module } from '@nestjs/common';
import { CountryPolicyService } from './country-policy.service';

@Module({
  providers: [CountryPolicyService],
  exports: [CountryPolicyService],
})
export class CommonModule {}
