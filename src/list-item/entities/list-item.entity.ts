import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { Item } from 'src/items/entities/item.entity';
import { List } from 'src/lists/entities/list.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'listItems' })
@ObjectType()
export class ListItem {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column()
  @Field(() => Number)
  quantity: number;

  @Column()
  @Field(() => Boolean)
  completed: boolean;

  @ManyToOne(() => List, (list) => list.items, { lazy: true })
  @Field(() => List)
  list: List;

  @ManyToOne(() => Item, (item) => item.listItems, { lazy: true })
  @Field(() => Item)
  item: Item;
}
