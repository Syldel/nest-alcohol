import { ObjectType, Field } from '@nestjs/graphql';
import { Prop } from '@nestjs/mongoose';

@ObjectType()
export class RegionInfo {
  @Field(() => String)
  @Prop({ type: Object })
  names: {
    en: string;
    fr: string;
  };

  @Field(() => String)
  @Prop({ type: String })
  iso: string; // iso3166-2 code
}

@ObjectType()
export class CountryInfo {
  @Field(() => String)
  @Prop({ type: Object })
  names: {
    en: string;
    fr: string;
  };

  @Field(() => String)
  @Prop({ type: String })
  iso: string; // iso3166-1 `two` letter code

  @Field(() => String)
  @Prop({ type: String })
  iso3: string; // iso3166-1 `three` letter code

  @Field(() => [RegionInfo], { nullable: true })
  @Prop({ type: [Object], default: [] })
  regions?: RegionInfo[];
}
