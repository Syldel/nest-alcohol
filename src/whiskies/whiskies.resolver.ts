import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { WhiskiesService } from './whiskies.service';
import { WhiskyType } from './dto/whisky.dto';
import { CreateWhiskyInput } from './dto/create-whisky.input';

@Resolver(() => WhiskyType)
export class WhiskiesResolver {
  constructor(private readonly whiskiesService: WhiskiesService) {}

  @Query(() => [WhiskyType])
  async getWhiskies() {
    return this.whiskiesService.findAll();
  }

  @Mutation(() => WhiskyType)
  async createWhisky(@Args('input') input: CreateWhiskyInput) {
    return this.whiskiesService.create(input);
  }
}
