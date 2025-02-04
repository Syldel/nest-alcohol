import { Resolver, Query } from '@nestjs/graphql';
import { WhiskiesService } from './whiskies.service';
import { WhiskyType } from './dto/whisky.dto';

@Resolver(() => WhiskyType)
export class WhiskiesResolver {
  constructor(private readonly whiskiesService: WhiskiesService) {}

  @Query(() => [WhiskyType])
  async getWhiskies() {
    return this.whiskiesService.findAll();
  }
}
