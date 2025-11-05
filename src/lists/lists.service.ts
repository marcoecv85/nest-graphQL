import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateListInput } from './dto/create-list.input';
import { UpdateListInput } from './dto/update-list.input';
import { InjectRepository } from '@nestjs/typeorm';
import { List } from './entities/list.entity';
import { Repository } from 'typeorm';
import { PaginationArgs, SearchArgs } from 'src/common/dto/args';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class ListsService {
  constructor(
    @InjectRepository(List)
    private listsRepository: Repository<List>,
  ) {}

  async create(createListInput: CreateListInput, user: User): Promise<List> {
    const list = this.listsRepository.create({
      ...createListInput,
      user,
    });
    return await this.listsRepository.save(list);
  }

  async findAll(
    user: User,
    paginationArgs: PaginationArgs,
    searchArgs: SearchArgs,
  ): Promise<List[]> {
    const { limit, offset } = paginationArgs;
    const { search } = searchArgs;

    const queryBuilder = this.listsRepository
      .createQueryBuilder('list')
      .take(limit)
      .skip(offset)
      .where('list.userId = :userId', { userId: user.id });

    if (search) {
      queryBuilder.andWhere('LOWER(name) LIKE :name', {
        name: `%${search.toLowerCase()}%`,
      });
    }

    return await queryBuilder.getMany();
  }

  async findOne(user: User, id: string): Promise<List> {
    return await this.listsRepository.findOneBy({ id, user: { id: user.id } });
  }

  async update(
    user: User,
    id: string,
    updateListInput: UpdateListInput,
  ): Promise<List> {
    await this.findOne(user, id);
    const list = await this.listsRepository.preload(updateListInput);

    if (!list) {
      throw new NotFoundException(`List with ID ${id} not found`);
    }
    return this.listsRepository.save(list);
  }

  async remove(user: User, id: string): Promise<boolean> {
    const result = await this.listsRepository.delete({
      id,
      user: { id: user.id },
    });
    return result.affected > 0;
  }

  async listCount(user: User): Promise<number> {
    const count = await this.listsRepository.count({
      where: { user: { id: user.id } },
    });
    return count;
  }
}
