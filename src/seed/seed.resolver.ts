import { Resolver } from '@nestjs/graphql';
import { SeedService } from './seed.service';

@Resolver()
export class SeedResolver {
  constructor(private readonly seedService: SeedService) {}

  async executeSeed(): Promise<boolean> {
    return this.seedService.executeSeed();
  }
}
