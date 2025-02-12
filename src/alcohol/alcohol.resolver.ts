import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { AlcoholService } from './alcohol.service';
import { Alcohol } from './entities/alcohol.entity';
import { CreateAlcoholInput } from './entities/create-alcohol-input.entity';

@Resolver(() => Alcohol)
export class AlcoholResolver {
  constructor(private readonly alcoholService: AlcoholService) {}

  @Query(() => [Alcohol])
  async alcohols(): Promise<Alcohol[]> {
    return this.alcoholService.findAll();
  }

  @Mutation(() => Alcohol)
  async createAlcohol(
    @Args('input') input: CreateAlcoholInput,
  ): Promise<Alcohol> {
    return this.alcoholService.create(input);
  }
}
