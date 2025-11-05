import { Injectable } from '@nestjs/common';
import { CreateListItemInput } from './dto/create-list-item.input';
import { UpdateListItemInput } from './dto/update-list-item.input';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ListItem } from './entities/list-item.entity';
import { User } from 'src/users/entities/user.entity';
import { List } from 'src/lists/entities/list.entity';
import { PaginationArgs, SearchArgs } from 'src/common/dto/args';

@Injectable()
export class ListItemService {
  constructor(
    @InjectRepository(ListItem)
    private readonly listItemRepository: Repository<ListItem>,
  ) {}

  async create(createListItemInput: CreateListItemInput): Promise<ListItem> {
    const { itemId, listId, ...rest } = createListItemInput;

    const listItem = this.listItemRepository.create({
      item: { id: itemId }, //Esta parte es diferente a otros creates porque item y list son relaciones ManyToOne y debemos pasar un objeto con el id
      list: { id: listId },
      ...rest,
    });
    await this.listItemRepository.save(listItem);
    /* Este findone se hace porque queremos que al crear un listItem, se retorne el entity completo con sus relaciones y el save solo retorna 
    la entidad creada sin relaciones cargadas por lo que si consultamos items o list en el mutation de creacion no endran valor y GRAPHQL 
    lanzara un error al intentar resolver esos campos nulos.  
    */
    return this.findOne(listItem.id);
  }

  async findAll(
    list: List,
    paginationArgs: PaginationArgs,
    searchArgs: SearchArgs,
  ): Promise<ListItem[]> {
    const { limit, offset } = paginationArgs;
    const { search } = searchArgs;

    const queryBuilder = this.listItemRepository
      .createQueryBuilder('listItem')
      .where('listItem.listId = :listId', { listId: list.id })
      .take(limit)
      .skip(offset);

    if (search) {
      queryBuilder.andWhere('listItem.title ILIKE :search', {
        search: `%${search}%`,
      });
    }

    return await queryBuilder.getMany();
  }

  async findOne(id: string): Promise<ListItem> {
    const listItem = await this.listItemRepository.findOneBy({ id });
    if (!listItem) throw new Error('ListItem not found');
    return listItem;
  }

  async update(
    id: string,
    updateListItemInput: UpdateListItemInput,
  ): Promise<ListItem> {
    const { listId, itemId, ...rest } = updateListItemInput;

    const queryBuilder = this.listItemRepository
      .createQueryBuilder('listItem')
      .update()
      .set(rest) //en el set ponemos los campos simples que no son relaciones y que seran actualizados directamente
      .where('id = :id', { id });

    if (listId) {
      // si se proporciona listId en el input, actualizamos la relacion ManyToOne
      queryBuilder.set({ list: { id: listId } });
    }

    if (itemId) {
      // si se proporciona itemId en el input, actualizamos la relacion ManyToOne
      queryBuilder.set({ item: { id: itemId } });
    }

    await queryBuilder.execute(); //execute  diferencia de find y save solo ejecuta la actualizacion y no retorna el entity actualizado
    return this.findOne(id); // por eso hacemos una consulta adicional para retornar el entity actualizado
  }

  remove(id: number) {
    return `This action removes a #${id} listItem`;
  }

  async countListItemsByList(list: List): Promise<number> {
    return await this.listItemRepository.count({
      where: { list: { id: list.id } },
    });
  }
}

/*
NOTAS:
Notese que en el update no utilizamos preload como en otros servicios, esto es porque en este caso 
necesitamos un manejo mas fino de las relaciones ManyToOne (item y list), por lo que utilizamos QueryBuilder para hacer el update.

Esto se debe a que en TypeORM, el metodo preload no maneja bien la actualizacion de relaciones ManyToOne cuando solo se proporciona 
el id de la relacion y provoca que las actualizaciones de esas relaciones no se realicen correctamente.
*/
