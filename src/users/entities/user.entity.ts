import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Item } from 'src/items/entities/item.entity';
import { List } from 'src/lists/entities/list.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'users' })
@ObjectType()
export class User {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column()
  @Field(() => String)
  fullName: string;

  @Column({ unique: true })
  @Field(() => String)
  email: string;

  @Column()
  // @Field(() => String)
  password: string;

  @Column({
    type: 'text',
    array: true,
    default: ['user'],
  })
  @Field(() => [String])
  roles: string[];

  @Column({
    type: 'boolean',
    default: true,
  })
  @Field(() => Boolean)
  isActive: boolean;

  //TODO: relaciones
  @ManyToOne(() => User, (user) => user.lastUpdateBy, {
    nullable: true,
    lazy: true,
  })
  @JoinColumn({ name: 'last_update_by' })
  @Field(() => User, { nullable: true })
  lastUpdateBy: User;

  @OneToMany(() => Item, (item) => item.user, { lazy: true })
  // @Field(() => [Item], { nullable: true }) Se comenta para pasar esta relacion de items al UsersResolver como un resolvedField
  items: Item[];

  @OneToMany(() => List, (list) => list.user, { lazy: true })
  lists: List[];
}

/*NOTAS:
TypeOrm tiene 2 argumentos que podemos usar para cargar relaciones de entidades:
- eager: true/false -> Si es true, cada vez que se consulte la entidad, se cargan 
  todas las relaciones marcadas como eager. siempre y cuando apunten a otras entidades.
- lazy: true/false -> Si es true, las relaciones no se cargan automáticamente, pero se pueden cargar bajo demanda usando promesas.
En este caso se uso lazy: true para la relacion lastUpdateBy, lo que significa que
cuando se consulte un usuario, la informacion del usuario que hizo la ultima 
actualizacion no se cargara automaticamente. En su lugar, se puede acceder a 
esa informacion cuando sea necesario, lo que puede ayudar a mejorar el rendimiento 
de la aplicacion al evitar cargas innecesarias de datos.
*/
