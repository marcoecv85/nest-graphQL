import { ObjectType, Field, ID } from '@nestjs/graphql';
import { ListItem } from 'src/list-item/entities/list-item.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'lists' })
@ObjectType()
export class List {
  @Field(() => ID, { name: 'id' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => String, { name: 'name' })
  @Column()
  name: string;

  @ManyToOne(() => User, (user) => user.lists, { lazy: true, nullable: false })
  @Index('userId-lists-index')
  @Field(() => User)
  user: User;

  @OneToMany(() => ListItem, (listItem) => listItem.list, { lazy: true })
  // @Field(() => [ListItem], { name: 'items' })
  items: ListItem[];
}

/* Recordar que los campos de la entidades deben tener 2 tipos de decoradores:
1. Los de TypeORM para definir la estructura de la base de datos (como @Entity, @Column, 
@PrimaryGeneratedColumn, etc.)
2. Los de GraphQL para definir el esquema GraphQL (como @ObjectType, @Field, etc.)

Además, las relaciones entre entidades (como ManyToOne) también deben estar decoradas 
adecuadamente para que tanto TypeORM como GraphQL puedan manejarlas correctamente. 
*/
