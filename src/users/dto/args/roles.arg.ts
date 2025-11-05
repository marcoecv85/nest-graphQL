import { ArgsType, Field } from '@nestjs/graphql';
import { IsArray } from 'class-validator';
import { ValidRoles } from 'src/auth/enums/valid-roles.enum';

@ArgsType()
export class ValidRolesArgs {
  @Field(() => [ValidRoles], { nullable: true })
  @IsArray()
  roles: ValidRoles[] = [];
}

// Al crear este ArgsType tendremos este error: Error:
// cannot determine a GraphQL input type null for the "roles". Make sure your class is decorated with an appropriate decorator.
// Esto se debe a que GraphQL no sabe que tipo de dato es "roles", porque debemos registrarlo como un enum de GraphQL
// Para ello vamos a src/auth/enums/valid-roles.enum.ts y registramos el enum ahi.
