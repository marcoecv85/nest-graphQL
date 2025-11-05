import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ID,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { ValidRolesArgs } from './dto/args/roles.arg';
import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ValidRoles } from 'src/auth/enums/valid-roles.enum';
import { UpdateUserInput } from './dto/update-user.input';
import { ItemsService } from 'src/items/items.service';
import { Item } from 'src/items/entities/item.entity';
import { PaginationArgs, SearchArgs } from 'src/common/dto/args';
import { List } from 'src/lists/entities/list.entity';
import { ListsService } from 'src/lists/lists.service';

@Resolver(() => User)
@UseGuards(JwtAuthGuard)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly itemsService: ItemsService,
    private readonly listsService: ListsService,
  ) {}

  @Query(() => [User], { name: 'users' })
  findAll(
    @Args() validRoles: ValidRolesArgs,
    @Args() paginationArgs: PaginationArgs,
    @Args() searchArgs: SearchArgs,
    @CurrentUser([ValidRoles.admin, ValidRoles.superUser]) user: User,
  ): Promise<User[]> {
    return this.usersService.findAll(
      validRoles.roles,
      paginationArgs,
      searchArgs,
    );
  }

  @Query(() => User, { name: 'user' })
  findOne(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser([ValidRoles.admin, ValidRoles.superUser]) user: User,
  ): Promise<User> {
    return this.usersService.findOneById(id);
  }

  @Mutation(() => User, { name: 'updateUser' })
  updateUser(
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
    @CurrentUser([ValidRoles.admin, ValidRoles.superUser]) user: User,
  ): Promise<User> {
    return this.usersService.update(updateUserInput.id, updateUserInput, user);
  }

  @Mutation(() => User, { name: 'blockUser' })
  blockUser(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser([ValidRoles.admin, ValidRoles.superUser]) user: User,
  ): Promise<User> {
    return this.usersService.block(id, user);
  }

  @ResolveField(() => Int, { name: 'itemCount' })
  async itemCount(
    @CurrentUser() requesterUser: User,
    @Parent() user: User,
  ): Promise<number> {
    return this.itemsService.itemCount(user);
  }

  @ResolveField(() => Int, { name: 'listCount' })
  async listCount(
    @CurrentUser() requesterUser: User,
    @Parent() user: User,
  ): Promise<number> {
    return this.listsService.listCount(user);
  }

  @ResolveField(() => [Item], { name: 'items' })
  async items(
    @Parent() user: User,
    @Args() paginationArgs: PaginationArgs,
    @Args() searchArgs: SearchArgs,
  ): Promise<Item[]> {
    return this.itemsService.findAll(user, paginationArgs, searchArgs);
  }

  @ResolveField(() => [List], { name: 'lists' })
  async lists(
    @Parent() user: User,
    @Args() paginationArgs: PaginationArgs,
    @Args() searchArgs: SearchArgs,
  ): Promise<List[]> {
    return this.listsService.findAll(user, paginationArgs, searchArgs);
  }
}

/*
NOTAS:
- ParseUUIDPipe: Valida que el ID que se recibe es un UUID válido.
- En el query findAll, se agregó un guardia para que solo los usuarios con roles admin o superUser puedan acceder a la lista de usuarios.
- En el query findOne, se agregó un guardia similar para restringir el acceso a la información de un usuario específico.


- Se agregó un ResolveField llamado itemCount para contar la cantidad de items asociados a un usuario.
- @Parent() user: User -> Permite acceder al usuario padre del cual se está resolviendo el campo itemCount.
- Para lograr el conteo de items:
  1. Se crea un metodo itemsCount en ItemsService que utiliza el repositorio de items para contar los items asociados a un usuario específico.
  2. Exportamos el itemService desde el ItemsModule para poder inyectarlo en el UsersResolver.
  3. importamos ItemsService en el users.module.ts.
  4. En el resolver de usuarios, se inyecta ItemsService en el constructor y se utiliza el metodo itemCount dentro del ResolveField para obtener el conteo de items para el usuario actual.
- Esto permite que cuando se consulte un usuario, también se pueda obtener la cantidad de items asociados a ese usuario a través del campo itemCount.
- Si a la consulta GraphQL no se le agrega el campo itemCount, este no se ejecuta, optimizando el rendimiento.

Se agregó otro ResolveField llamado items para obtener los items asociados a un usuario.
De esa forma podemos usar los args de paginacion y busqueda que ya teniamos en ItemsService. 
Lo cual no se podia hacer si dejabamos la relacion items en el User entity (comentada).
*/
