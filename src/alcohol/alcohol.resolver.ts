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

  /**
   * Récupère une liste unique de valeurs pour une `legend` donnée (ex: "Marque", "Pays").
   *
   * @param {string} legend - Le champ ciblé dans `details`.
   * @param {AlcoholFilterInput} [filter] - Filtre optionnel sur le type et la langue.
   * @returns {Promise<string[]>} - Liste unique des valeurs correspondant à la `legend` demandée.
   */
  @Query(() => [String])
  async distinctValues(
    @Args('legend') legend: string,
    @Args('filter', { type: () => AlcoholFilterInput, nullable: true })
    filter?: AlcoholFilterInput,
  ): Promise<string[]> {
    return this.alcoholService.getUniqueDetailsValues(legend, filter);
  }

  @Mutation(() => Alcohol)
  async createAlcohol(
    @Args('input') input: CreateAlcoholInput,
  ): Promise<Alcohol> {
    return this.alcoholService.create(input);
  }
}
