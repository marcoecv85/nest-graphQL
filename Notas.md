# Notas Api NestJs + GraphQL

## Creacion del proyecto e instalacion de dependencias

- El proyecto se arranco con el comando `npm i -g @nestjs/cli` para la instalacion del CLI de nest.
- Luego se crea el proyecto con `nest new [project-name]`
- Como se va a trabajar con `GraphQL` se eliminaron los controladores creados por defecto, asi como el app.service y el app.resolver pues no son necesarios
- El curso estaba hecho en una version desactualizada de Nest por lo que fue necesario ir a la documentacion oficial de Nest para realizar la instalacion de las primeras dependencias:

Estas son las dependencias instaladas en el proyecto hasta el momento.

```json
{
  "@apollo/server": "^5.0.0", //Servidor de apollo
  "@as-integrations/express5": "^1.1.2", //Express
  "@nestjs/apollo": "^13.2.1",
  "@nestjs/config": "^4.0.2", // Configuracion de variables de entorno, Requiere crear configService
  "@nestjs/graphql": "^13.2.0",
  "@nestjs/jwt": "^11.0.0", //Para creacion de tokens
  "@nestjs/passport": "^11.0.5", //Para temas de autenticacion
  "@nestjs/platform-express": "^11.1.6",
  "@nestjs/typeorm": "^11.0.0", //Para mapear las entities con objetos de base de datos
  "bcrypt": "^6.0.0", // Encriptacion de contraseñas
  "class-transformer": "^0.5.1",
  "class-validator": "^0.14.2", //Para validar tipos de datos en las propiedades de las entidades
  "graphql": "^16.11.0",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "passport-local": "^1.0.0",
  "path": "^0.12.7", //para enlaces y rutas
  "pg": "^8.16.3" //conexion con postgres
}
```

- Creamos el archivo `.env` con las variables de entorno necesarias. Ver `.env.template`

## Configuracion del App Module

El `app.module.ts` es el modulo principal de la aplicacion, aqui se realizan configuraciones globales para todo el proyecto. Por ejemplo:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot(), // Inyectamos el configModule y lo aplicamos todo el proyecto (forRoot)
    //forRoot es un método estático utilizado en módulos para inicializar y configurar esos módulos de forma global y única en la aplicación

    GraphQLModule.forRoot<ApolloDriverConfig>({
      // agregamos graphqlModule
      driver: ApolloDriver,
      // debug: false,
      playground: false, // desabilitar el playground
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'), // Le decimos a nest que coloque el esquema autogenerado en la raiz
      plugins: [
        process.env.STATE === 'dev' &&
          ApolloServerPluginLandingPageLocalDefault(), //Este plugin es para usar el apollo en lugar del playground por defecto y se habilita solo para dev
      ],
    }),

    TypeOrmModule.forRoot({
      // aplicamos TypeOrm, y le pasamos los datos para crear la conexion
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      synchronize: true,
      autoLoadEntities: true,
    }),

    //de aqui para abajo se inyectan todos los modulos que vayamos creando
    ItemsModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

## Creacion de nuevos recursos

- Cada entidad de BD deberia ser un recurso de NestJs.
- Se utiliza el comando `nest g res users` para generar el recurso `Users` asi como todos los demas recursos como `items`e incluso `auth` que es un poco diferente al resto.

- Al usar el comando para generar recursos se selecciona la opcion de `GraphQL (Code First)` se generaran `modulos`, `servicios`, `resolvers`, `entity`, y los `dto's` para ceacion y modificacion de esa entidad.

- Tanto los `dto's` como la entidad vienen con un solo campo por defecto, por lo que debemos crear los campos de la entidad, agregar los decoradores de los tipos de dato de GraphQL (`@ObyectType` y `@Field`) y agregar los decoradores de `TypeOrm`(`@Column`,`@PrimaryGeneratedColumn` ).

- En los `dtos` agregamos los campos que vamos a recibir del cliente para creación y actualizacion (se separan en 2 archivos) y agregamos las validaciones de `class-validator` para cada campo asi como su tipo de dato de `GraphQL` igual que en la entidad. Ver `/src/items/dto/inputs/create-item.input.ts`, `src/items/entities/item.entity.ts`

## Creacion del servicio y el resolver

### Service

- Durante la ejecucion del comando para generar el recurso se nos pregunta si queremos generar el CRUD por defecto. Si respondimos que si, probablemente nuestro servicio y nuestro resolver ya tengan dentro metodos para Listar, Buscar por ID, Crear, Actualizar y Remover. Por lo que debemos implementarlos.

- Lo primero es el servivio. Al service debemos inyectarle en su contructor la entidad que creamos en el paso anterior, asi como un `Repository` del tipo de la entidad que declaramos arriba. `Repository` pertenece a TypeOrm asi que solo estamos pasando el Un repositorio de `TypeOrm`. Ejemplo:

```typescript
@Injectable()
export class ItemsService {

  constructor(
    @InjectRepository( Item )
    private readonly itemsRepository: Repository<Item>,

  ) {}
```

En este caso le hemos pasado al `itemsService` la entidad `Item` y un repositorio de `TypeOrm` del tipo `Item`
Recordar que los servicios requieren el decorador `@Injectable()`

- Despues podremos ejecutar los metodos que TypeORM provee para iteractuar con la BD:
  - save
  - find
  - remove
  - findOne
  - findOneOrFail y mas
- Usamos los metodos anteriores segun corresponda en cada accion del servicio (Listar, crear, etc...)
- Aqui es donde usams los inputs, ya que los metodos `create` y `update` reciben como argumento el input respectivo y asi restringimos la data que entra a nuestro servicio y no puede recibir nada diferente a lo que el servicio necesita.

```typescript
async create( createItemInput: CreateItemInput ): Promise<Item> {
    const newItem = this.itemsRepository.create( createItemInput )
    return await this.itemsRepository.save( newItem );
  }
```

### Resolver

- El resolver contiene los elementos que graphQL necesita para intectuar con la data. Es decir `@Query` para consultas y `@Mutation` Para mutar data.
- Ambos deben usar los metodos que creamos en el `service`para proveerle a graphQL de acciones.
- El resolver debe tener el decorador `@Resolver()`
- debemos inyectar el `Service` en el constructor.

```typescript
@Resolver(() => Item)
export class ItemsResolver {
  constructor(private readonly itemsService: ItemsService) {}

  @Mutation(() => Item)
  async createItem(
    @Args('createItemInput') createItemInput: CreateItemInput
  ): Promise<Item> {
    return this.itemsService.create(createItemInput);
  }

  @Query(() => [Item], { name: 'items' })
  async findAll(): Promise<Item[]> {
    return this.itemsService.findAll();
  }
```

## Creacion del AuthModule

El `authModule` se creo como un recurso cualquiera sin embargo tiene particularidades y cabe destacar que un servicio de autenticación deberia estar separado del API, pero para efectos didacticos estara aqui mismo.

- Como Auth no tiene una entodad como tal si no que trabaja con la entidad de User, lo primero que se creo fueron los `dto's`. 2 estructuras llamadas `Signup` y `SignIn` para registro de usuarios y login respectivamente.
- Ambos inputs siguen el mismo patron de los anteriores. Dar forma a la data que el servicio va a recibir.
- Aqui es donde empezamos a usar las dependencias de `JWT` y `Passport`.

### Passport

Passport es una popular librería de autenticación para Node.js, que se integra en NestJS a través del módulo `@nestjs/passport`. Permite implementar fácilmente diversas estrategias de autenticación, como usuario y contraseña (estrategia local) o inicio de sesión con redes sociales (OAuth), o tokens (JWT) para verificar la identidad de los usuarios de una aplicación.

### JWT

Se usa `JWT` para generar los tokens. El secretKey necesario para generarlos se encuentra en `.env`

### AuthModule

Aqui definimos la estrategia de seguridad que vamos a usar.

```typescript
@Module({
  providers: [AuthResolver, AuthService, JwtStrategy],
  exports: [
    JwtStrategy, PassportModule, JwtModule // Ver nota
  ],
  imports: [
    ConfigModule,//Importamos el configModule para poder usar las variables de entorno

    PassportModule.register({ defaultStrategy: 'jwt' }), // Configuramos Passport con la estrategia JWT por defecto

    // Y el authService es el unico que deberia tener acceso a este modulo pues se va a encargar de generar los tokens
    JwtModule.registerAsync({ // Configuramos el módulo JWT de forma asíncrona para poder usar variables de entorno
      imports: [ConfigModule],// Importamos el ConfigModule para poder usar el ConfigService
      inject: [ConfigService],// Inyectamos el ConfigService para poder acceder a las variables de entorno
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), // Clave secreta para firmar los tokens JWT
        signOptions: {
          expiresIn: '4h', // Tiempo de expiración del token
        },
      }),
    }),

    UsersModule, // Importamos el UsersModule para poder usar el UsersService dentro del AuthService
  ],
```

**Nota**: La exportacion de esos 3 modulos es importante.

- `JwtModule`: Es la configuracion que le hemos dado a jwt para que genere los token. `registerAsync` provee a `JWTModule` del configModule de modo que traves de el podamos inyectarle al `JwtModule` el ConfigService. De esa manera es que `JwtModule` puede acceder a las variables de entorno que le pasamos en la funcion `useFactory`. `useFactory` es una funcion asincrona a la que le pasamos los parametros del `secret`y la expiracion, para que cuando el `JwService` cree el token lo haga con estas propiedades.
- `PassportModule`: es solo la manera de definir la estrategia de autenticacion que vamos a usar. (Jwt).

- **Que es una estrategia?**: es un componente clave que define el mecanismo específico para autenticar a los usuarios en una aplicación, como usar credenciales de nombre de usuario y contraseña o tokens JWT como en este caso

- `JwtStrategy`: es una clase que nos dice como se va a autenticar el usuario. En el constructor de `JwtStrategy` podemos ver como se inyectan el `ConfigService` (para obtener acceso a las variables de entorno, en este caso el `secret`) y el `AuthService` para tener acceso al metodo `validateUser` que es indispesable para saber si el id de usuario que venia insertado en el token existe y esta activo.

### AuthService

Para dar forma a las respuestas del servicio se creó un `type` llamado `AuthResponse`.
`AuthResponse` es un objet que tiene un `accessToken`y un `User`.

El authService tiene 4 funciones públicas:

- `signUp`: Registro de nuevos usuarios. Recibe los datos necesarios para crear un usuario y devuelve un token y el usuario (`AuthResponse`).
- `signIn`: Login. Recibe usuario y contraseña y devuelve el token y la informacion del usuario menos la contraseña.
- `validateUser`: Valida el usuario. Recibe un id de usuario y retorna el usuario.
- `revalidateToken`: Refresca el token de un usuario y devuelve un `AuthResponse`.

### AuthResolver

El authResolver contiene 2 mutaciones y un query

- Las mutaciones son `SingIn` y `SignUp`. Ambas usan sus respectivos metodos de service.
- El query es `revalidateToken`. BAsicamente se encaga de verificar si el token de acceso viene en el payload y es el correcto.
  Para ello utiliza un `@Guard`.

### Guards

un Guard es una clase que implementa la interfaz CanActivate y se utiliza para controlar si una solicitud debe ser procesada por un resolver o no, en función de ciertas condiciones como permisos o autenticación. Los Guards son esenciales para la autorización, verificando que el usuario tenga los permisos necesarios para acceder a un recurso antes de que llegue al resolver.

En aplicaciones NestJS que usan GraphQL, el flujo de las solicitudes es diferente al de REST.
Por defecto, los guards como `AuthGuard('jwt')` esperan encontrar el objeto Request típico de HTTP,
pero en GraphQL, la información relevante (como el token JWT) suele estar en el contexto de GraphQL,
no directamente en el objeto Request.

Por eso, se creó el `JwtAuthGuard` que sobrescribe el método getRequest, para extraer el objeto req desde el contexto de GraphQL. Esto permite que el guard pueda acceder al token JWT y validar la autenticación correctamente en resolvers de GraphQL.
Sin este override, el guard no encontraría el token y la autenticación fallaría.

Resumen:
Este custom guard es necesario porque adapta el flujo de autenticación JWT para funcionar con GraphQL,
extrayendo el request correcto desde el contexto de GraphQL en vez del contexto HTTP tradicional.

## Bloquear el schema en apollo si no hay token

Cambiamos el modulo de `GraphQL`:

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  ...
})
```

por:

```typescript
  GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      imports: [AuthModule],
      inject: [JwtService],
      useFactory: async (jwtService: JwtService) => ({
        playground: false,
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        plugins: [ApolloServerPluginLandingPageLocalDefault],
        context({ req }) {
          const token = req.headers.authorization?.replace('Bearer ', '');
          if (!token) throw new Error('No token found');
          const payload = jwtService.decode(token);
          if (!payload) throw new Error('Invalid token');
        },
      }),
    }),
```
