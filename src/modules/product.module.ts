// src/modules/product/product.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProductController } from 'src/controllers/product.controller';
import { ProductService } from 'src/services/product/product.service';
import { UploadModule } from 'src/cloudinary/upload.module';  

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-key',
    }),
    UploadModule,   // 👈 must be here
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}