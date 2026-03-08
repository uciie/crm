import { NestFactory }    from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule }      from './app.module'
import { ExpressAdapter } from '@nestjs/platform-express'
import express from 'express'

// Instance Express partagée (réutilisée entre les invocations serverless)
const expressApp = express()
let isBootstrapped  = false
let bootstrapPromise: Promise<void> | null = null

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn', 'log'] },
  )

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://crm-zeta-rosy.vercel.app', // Votre URL frontend
        'http://localhost:3000',
        'http://localhost:3001',
      ];

      // Autorise les sous-domaines Vercel pour les previews
      const isVercelPreview = origin?.endsWith('.vercel.app');

      if (!origin || allowedOrigins.includes(origin) || isVercelPreview) {
        callback(null, true);
      } else {
        callback(new Error(`CORS bloqué pour l'origine : ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Accept', 
      'X-Requested-With',
      'svix-id', 
      'svix-timestamp', 
      'svix-signature'
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
      transformOptions:     { enableImplicitConversion: true },
    }),
  )

  // ⚠️ app.init() au lieu de app.listen() → pas de port en serverless
  await app.init()
  isBootstrapped = true
}

// ── Handler exporté pour Vercel ────────────────────────────────
export default async (req: express.Request, res: express.Response) => {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap()
  }
  if (!isBootstrapped) {
    await bootstrapPromise
  }
  expressApp(req, res)
}

// ── Démarrage local classique (hors Vercel) ────────────────────
if (process.env.NODE_ENV !== 'production') {
  bootstrap().then(() => {
    expressApp.listen(process.env.PORT ?? 3001, () => {
      console.log(`Server running on port ${process.env.PORT ?? 3001}`)
    })
  })
}