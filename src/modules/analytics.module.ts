import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AnalyticsController } from 'src/controllers/analytics.controller';

import { SellerModule } from 'src/Modules/seller.module';   // for SellerService
import { AnalyticsService } from 'src/services/analytics/analytics.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-key',
    }),
    SellerModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}