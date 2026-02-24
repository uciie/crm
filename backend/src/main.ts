import { NestFactory }     from '@nestjs/core'
import { ValidationPipe }  from '@nestjs/common'
import { AppModule }       from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api/v1')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
      transformOptions:     { enableImplicitConversion: true },
    }),
  )

  app.enableCors({
    origin:      [process.env.FRONTEND_URL ?? 'http://localhost:3000'],
    methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })

  const port = process.env.PORT ?? 3001
  await app.listen(port)
  console.log(`🚀 Backend CRM démarré → http://localhost:${port}/api/v1`)
}
bootstrap()