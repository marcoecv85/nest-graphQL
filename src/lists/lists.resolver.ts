import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ID,
  Parent,
  ResolveField,
} from '@nestjs/graphql';
import { ListsService } from './lists.service';
import { List } from './entities/list.entity';
import { CreateListInput } from './dto/create-list.input';
import { UpdateListInput } from './dto/update-list.input';
import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { PaginationArgs, SearchArgs } from 'src/common/dto/args';
import { ValidRoles } from 'src/auth/enums/valid-roles.enum';
import { Item } from 'src/items/entities/item.entity';
import { ListItem } from 'src/list-item/entities/list-item.entity';
import { ListItemService } from '../list-item/list-item.service';

@Resolver(() => List)
@UseGuards(JwtAuthGuard)
export class ListsResolver {
  constructor(
    private readonly listsService: ListsService,
    private readonly listItemService: ListItemService,
  ) {}

  @Mutation(() => List)
  async createList(
    @CurrentUser() user: User,
    @Args('createListInput') createListInput: CreateListInput,
  ): Promise<List> {
    return await this.listsService.create(createListInput, user);
  }

  @Query(() => [List], { name: 'lists' })
  async findAll(
    @CurrentUser() user: User,
    @Args() paginationArgs: PaginationArgs,
    @Args() searchArgs: SearchArgs,
  ): Promise<List[]> {
    return await this.listsService.findAll(user, paginationArgs, searchArgs);
  }

  @Query(() => List, { name: 'list' })
  async findOne(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<List> {
    return await this.listsService.findOne(user, id);
  }

  @Mutation(() => List)
  async updateList(
    @CurrentUser() user: User,
    @Args('updateListInput') updateListInput: UpdateListInput,
  ): Promise<List> {
    return await this.listsService.update(
      user,
      updateListInput.id,
      updateListInput,
    );
  }

  @Mutation(() => List)
  removeList(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ) {
    return this.listsService.remove(user, id);
  }

  @ResolveField(() => [ListItem], { name: 'items' })
  async getListItems(
    @Parent() list: List,
    @Args() paginationArgs: PaginationArgs,
    @Args() searchArgs: SearchArgs,
  ): Promise<ListItem[]> {
    return this.listItemService.findAll(list, paginationArgs, searchArgs);
  }

  @ResolveField(() => Number, { name: 'totalItems' })
  async getTotalItems(@Parent() list: List): Promise<number> {
    return this.listItemService.countListItemsByList(list);
  }
}
