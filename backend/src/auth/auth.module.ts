import { Module }           from '@nestjs/common'
import { PassportModule }   from '@nestjs/passport'
import { JwtModule }        from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { AuthController }   from './auth.controller'
import { AuthService }      from './auth.service'
import { JwtStrategy }      from './jwt.strategy'
import { JwtAuthGuard }     from './jwt-auth.guard'
import { RolesGuard }       from './roles.guard'

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JwtModule utilisé uniquement pour la vérification du token Supabase.
    // La signature réelle est faite par Supabase, pas par NestJS.
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        publicKey:  config.getOrThrow<string>('SUPABASE_JWT_PUBLIC_KEY'),
        algorithms: ['ES256'],
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,   // Exporté pour être utilisé dans les autres modules
    RolesGuard,     // Exporté pour être utilisé dans les autres modules
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}