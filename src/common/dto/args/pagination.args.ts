import { Args, ArgsType, Field, Int } from '@nestjs/graphql';
import { IsOptional, Min } from 'class-validator';

@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @Min(1)
  @IsOptional()
  limit: number = 10;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @Min(0)
  @IsOptional()
  offset: number = 0;
}

/* 
Notas:
Los elementos necesarios para la paginacion son Arguments, esos arguments seran usados por varios modulos a la vez,
por lo que creamos un modulo common (nest g mo common) y dentro un dto (nest g d dto/args/pagination)
- Se define una clase PaginationArgs que se utiliza para manejar la paginación en las consultas GraphQL.
- La clase utiliza decoradores de @nestjs/graphql para definir los campos limit y offset, ambos de tipo Int y opcionales.
- Se aplican validaciones con class-validator para asegurar que los valores sean mayores o iguales a 0.
- Los valores predeterminados son 0 para limit y 10 para offset, lo que significa que si no se proporcionan, se usarán estos valores por defecto.

Una vez creado este DTO, podemos usarlo en cualquier resolver que necesite paginacion, como en items.resolver.ts
mediante la inyeccion de dependencias en el metodo findAll:
  @Query(() => [Item], { name: 'items' })
  async findAll(
    @CurrentUser() user: User,
    @Args() paginationArgs: PaginationArgs,
  ): Promise<Item[]> {
    return this.itemsService.findAll(user, paginationArgs);
  }
*/
