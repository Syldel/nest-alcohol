import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { AlcoholService } from './alcohol.service';
import { Alcohol } from './entities/alcohol.entity';
import { CreateAlcoholInput } from './entities/create-alcohol-input.entity';
import { AlcoholFilterInput } from './entities/alcohol-filter-input.entity';

@Resolver(() => Alcohol)
export class AlcoholResolver {
  constructor(private readonly alcoholService: AlcoholService) {}

  @Query(() => Alcohol)
  async alcohol(@Args('id', { type: () => ID }) id: string): Promise<Alcohol> {
    return this.alcoholService.findOne(id);
  }

  @Query(() => [Alcohol], { nullable: true })
  async alcohols(
    @Args('filter', { type: () => AlcoholFilterInput, nullable: true })
    filter?: AlcoholFilterInput,
  ): Promise<Alcohol[]> {
    return this.alcoholService.findByFilter(filter);
  }

  @Mutation(() => Alcohol)
  async createAlcohol(
    @Args('input') input: CreateAlcoholInput,
  ): Promise<Alcohol> {
    return this.alcoholService.create(input);
  }
}
