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
   * Récupère la liste des marques uniques présentes dans les détails des produits,
   * avec des options de filtrage sur le type de produit et la langue.
   *
   * @param {AlcoholFilterInput} [filter] - (Optionnel) Filtre permettant de restreindre les résultats
   * en fonction du type de produit et/ou du code langue.
   *
   * @returns {Promise<string[]>} - Une liste de noms de marques uniques triées par ordre alphabétique.
   *
   * @example
   * // Récupérer toutes les marques disponibles
   * query {
   *   brands
   * }
   *
   * @example
   * // Récupérer uniquement les marques pour un type spécifique (ex: "Whisky")
   * query {
   *   brands(filter: { type: "Whisky" })
   * }
   *
   * @example
   * // Récupérer les marques disponibles en français (langCode = "fr_FR")
   * query {
   *   brands(filter: { langCode: "fr_FR" })
   * }
   */
  @Query(() => [String])
  async brands(
    @Args('filter', { type: () => AlcoholFilterInput, nullable: true })
    filter?: AlcoholFilterInput,
  ): Promise<string[]> {
    return this.alcoholService.getAllBrands(filter);
  }

  @Mutation(() => Alcohol)
  async createAlcohol(
    @Args('input') input: CreateAlcoholInput,
  ): Promise<Alcohol> {
    return this.alcoholService.create(input);
  }
}
