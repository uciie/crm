import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  /**
   * GET /health
   * Utilisé par le healthcheck Docker (docker-compose.yml).
   * Répond 200 dès que NestJS est prêt à traiter des requêtes.
   */
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }
  
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
