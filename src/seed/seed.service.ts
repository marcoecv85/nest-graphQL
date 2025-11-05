import { Injectable } from '@nestjs/common';
import { Mutation, ID } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Item } from 'src/items/entities/item.entity';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { SEED_ITEMS, SEED_LISTS, SEED_USERS } from './data/seed-data';
import { ItemsService } from '../items/items.service';
import { ListItem } from 'src/list-item/entities/list-item.entity';
import { List } from 'src/lists/entities/list.entity';
import { ListsService } from 'src/lists/lists.service';
import { ListItemService } from 'src/list-item/list-item.service';

@Injectable()
export class SeedService {
  private isPro: boolean;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Item) private readonly itemRepository: Repository<Item>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(ListItem)
    private readonly listItemRepository: Repository<ListItem>,
    @InjectRepository(List) private readonly listRepository: Repository<List>,
    private readonly userService: UsersService,
    private readonly itemsService: ItemsService,
    private readonly listService: ListsService,
    private readonly listItemService: ListItemService,
  ) {
    this.isPro = this.configService.get('STATE') === 'prod';
  }

  @Mutation(() => Boolean, { name: 'executeSeed' })
  async executeSeed(): Promise<boolean> {
    if (this.isPro) {
      throw new Error('Seeding is not allowed in production environment');
    }
    await this.clearDatabase();

    const users = await this.insertUsers();

    await this.loadItems(users);

    const list = await this.loadLists(users[0]);

    const items = await this.itemsService.findAll(
      users[0],
      { limit: 15, offset: 0 },
      {},
    );

    await this.loadListsItems(list, items);

    return true;
  }

  async clearDatabase() {
    await this.listItemRepository
      .createQueryBuilder()
      .delete()
      .where({})
      .execute();
    await this.listRepository.createQueryBuilder().delete().where({}).execute();
    await this.itemRepository.createQueryBuilder().delete().where({}).execute();
    await this.userRepository.createQueryBuilder().delete().where({}).execute();
  }

  async insertUsers(): Promise<User[]> {
    const users = [];
    for (const user of SEED_USERS) {
      users.push(await this.userService.create(user));
    }
    return users;
  }

  async loadItems(users: User[]) {
    const max = users.length - 1;
    const random = () => Math.floor(Math.random() * (max - 0 + 1)) + 0;

    const itemsPromises = [];
    for (const item of SEED_ITEMS) {
      const user = users[random()];
      itemsPromises.push(this.itemsService.create(item, user));
    }
    await Promise.all(itemsPromises);
  }

  async loadLists(user: User): Promise<List> {
    const lists = [];

    for (const list of SEED_LISTS) {
      lists.push(await this.listService.create(list, user));
    }

    return lists[0];
  }

  async loadListsItems(list: List, items: Item[]) {
    for (const item of items) {
      await this.listItemService.create({
        quantity: Math.ceil(Math.random() * 10),
        completed: Math.ceil(Math.random() * 1) ? true : false,
        listId: list.id,
        itemId: item.id,
      });
    }
  }
}
