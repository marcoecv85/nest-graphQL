import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateItemInput, UpdateItemInput } from './dto/inputs';
import { Item } from './entities/item.entity';
import { User } from 'src/users/entities/user.entity';
import { PaginationArgs } from 'src/common/dto/args/pagination.args';
import { SearchArgs } from '../common/dto/args/search.args';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>,
  ) {}

  async create(
    createItemInput: CreateItemInput,
    createdBy: User,
  ): Promise<Item> {
    try {
      const newItem = this.itemsRepository.create({
        ...createItemInput,
        user: createdBy,
      });
      return this.itemsRepository.save(newItem);
    } catch (error) {
      throw new BadRequestException('Error creating item');
    }
  }

  async findAll(
    user: User,
    paginationArgs: PaginationArgs,
    searchArgs: SearchArgs,
  ): Promise<Item[]> {
    //TODO: filtrar, paginar, por usuario...
    const { limit, offset } = paginationArgs;
    const { search } = searchArgs;
    try {
      const queryBuilder = this.itemsRepository
        .createQueryBuilder('item')
        .skip(offset)
        .take(limit)
        .where('item.userId = :userId', { userId: user.id });

      if (search) {
        // Agregar condiciones de búsqueda
        queryBuilder.andWhere('LOWER(name) LIKE :name', {
          name: `%${search.toLocaleLowerCase()}%`,
        });
      }

      return queryBuilder.getMany();

      // Esta es una forma de hacerlo pero a la hora de hacer el search se complica
      // return await this.itemsRepository.find({
      //   where: { user: { id: user.id } },
      //   take: limit,
      //   skip: offset,
      // });
    } catch (error) {
      throw new BadRequestException('Error fetching items');
    }
  }

  async findOne(id: string, user: User): Promise<Item> {
    try {
      const item = await this.itemsRepository.findOneBy({
        id,
        user: { id: user.id },
      });
      if (!item) throw new NotFoundException(`Item with id: ${id} not found`);
      return item;
    } catch (error) {
      throw error;
    }
  }

  async update(
    id: string,
    updateItemInput: UpdateItemInput,
    user: User,
  ): Promise<Item> {
    await this.findOne(id, user);
    const item = await this.itemsRepository.preload(updateItemInput);

    if (!item) throw new NotFoundException(`Item with id: ${id} not found`);

    return this.itemsRepository.save(item);
  }

  async remove(id: string, user: User): Promise<Item> {
    //TODO: soft delete, integridad referencial
    try {
      const item = await this.findOne(id, user);
      if (!item) throw new NotFoundException(`Item with id: ${id} not found`);
      await this.itemsRepository.remove(item);
      return { ...item, id };
    } catch (error) {
      throw error;
    }
  }

  async itemCount(user: User): Promise<number> {
    const count = await this.itemsRepository.count({
      where: { user: { id: user.id } },
    });
    return count;
  }
}
