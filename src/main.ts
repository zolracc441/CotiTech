import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);


  app.setGlobalPrefix('api');

 
  app.enableCors();


  app.useStaticAssets(join(__dirname, '..', 'public'));

  await app.listen(3000);
  console.log('====================================================');
  console.log('CotiTech Web App:    http://localhost:3000');
  console.log('CotiTech REST API:   http://localhost:3000/api');
  console.log('====================================================');
}
bootstrap();
