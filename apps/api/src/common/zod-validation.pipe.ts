import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodType, z } from 'zod';

@Injectable()
export class ZodValidationPipe<Schema extends ZodType> implements PipeTransform<unknown, z.output<Schema>> {
  constructor(private readonly schema: Schema) {}

  transform(value: unknown): z.output<Schema> {
    const result = this.schema.safeParse(value ?? {});
    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid request',
        errors: result.error.flatten(),
      });
    }

    return result.data;
  }
}
