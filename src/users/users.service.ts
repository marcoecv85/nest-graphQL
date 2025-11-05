import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';

import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';

import { SignupInput } from '../auth/dto/inputs/signup.input';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ValidRoles } from 'src/auth/enums/valid-roles.enum';
import { PaginationArgs, SearchArgs } from 'src/common/dto/args';

@Injectable()
export class UsersService {
  private logger = new Logger('UsersService');

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(signupInput: SignupInput): Promise<User> {
    try {
      const newUser = this.usersRepository.create({
        ...signupInput,
        password: bcrypt.hashSync(signupInput.password, 10),
      });

      return await this.usersRepository.save(newUser);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(
    roles: ValidRoles[],
    paginationArgs: PaginationArgs,
    searchArgs: SearchArgs,
  ): Promise<User[]> {
    const { limit, offset } = paginationArgs;
    const { search } = searchArgs;

    if (roles.length === 0) {
      const queryBuilder = this.usersRepository
        .createQueryBuilder('user')
        .skip(offset)
        .take(limit);

      if (roles.length > 0) {
        queryBuilder.andWhere('ARRAY[roles] && ARRAY[:...roles]', {
          roles,
        });
      }

      if (search) {
        queryBuilder.andWhere(
          'LOWER(fullName) LIKE :name OR LOWER(email) LIKE :email',
          {
            name: `%${search.toLocaleLowerCase()}%`,
            email: `%${search.toLocaleLowerCase()}%`,
          },
        );
      }

      return queryBuilder.getMany();
      // return this.usersRepository.find({
      //   //relations: { lastUpdateBy: true }, Se comentado porque se uso lazy loading
      // });
    }

    return this.usersRepository
      .createQueryBuilder()
      .andWhere('ARRAY[roles] && ARRAY[:...roles]')
      .setParameter('roles', roles)
      .getMany();
  }

  async findOneByEmail(email: string): Promise<User> {
    try {
      return await this.usersRepository.findOneByOrFail({ email });
    } catch (error) {
      throw new NotFoundException(`${email} not found`);

      // this.handleDBErrors({
      //   code: 'error-001',
      //   detail: `${ email } not found`
      // });
    }
  }

  async findOneById(id: string): Promise<User> {
    try {
      return await this.usersRepository.findOneByOrFail({ id });
    } catch (error) {
      throw new NotFoundException(`${id} not found`);
    }
  }

  async update(
    id: string,
    updateUserInput: UpdateUserInput,
    updatedById: User,
  ): Promise<User> {
    const user = this.usersRepository.preload({
      id,
      ...updateUserInput,
    });

    return user.then(async (user) => {
      if (!user) throw new NotFoundException(`User with id: ${id} not found`);
      user.lastUpdateBy = updatedById;
      try {
        return await this.usersRepository.save(user);
      } catch (error) {
        this.handleDBErrors(error);
      }
    });
  }

  async block(id: string, updatedById: User): Promise<User> {
    const userToBlock = await this.findOneById(id);
    userToBlock.lastUpdateBy = updatedById;
    userToBlock.isActive = false;
    return await this.usersRepository.save(userToBlock);
  }

  private handleDBErrors(error: any): never {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail.replace('Key', ''));
    }

    if (error.code == 'error-001') {
      throw new BadRequestException(error.detail.replace('Key', ''));
    }

    this.logger.error(error);

    throw new InternalServerErrorException('Please check server logs');
  }
}

/*NOTAS:
- Notese que en el metodo findAll en la ejecucion del userRepository.find() se agrego 
  la relacion lastUpdateBy para que al traer los usuarios tambien traiga quien fue el 
  ultimo en actualizarlos. Si esta relacion no se pasa por parametro GraphQL no puede 
  relacionar el dato con el campo de la BD y por ende no lo trae.
*/
