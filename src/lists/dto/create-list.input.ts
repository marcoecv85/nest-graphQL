import { InputType, Int, Field } from '@nestjs/graphql';
import { MinLength } from 'class-validator';

@InputType()
export class CreateListInput {
  @Field(() => String)
  @MinLength(2)
  name: string;
}
