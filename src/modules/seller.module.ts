// src/modules/seller/seller.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UploadModule } from 'src/cloudinary/upload.module';
import { SellerController } from 'src/controllers/seller.controller';
import { SellerService } from 'src/services/seller/seller.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-key',
    }),
    UploadModule,   
  ],
  controllers: [SellerController],
  providers: [SellerService],
  exports: [SellerService],
})
export class SellerModule {}


