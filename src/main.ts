import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // forbidNonWhitelisted: true, Esto se comenta para evitar un error de a la hora de tener 2 argumentos en los queries
      // Estos argumentos son paginationArgs y searchArgs ya que class-validator cuando hay mas de un args no reconoce el segundo arg
    }),
  );
  await app.listen(3000);
}
bootstrap();
