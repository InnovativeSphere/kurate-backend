// src/cloudinary/upload.module.ts   (or wherever your UploadModule file is)
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-key',
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],          // 👈 add this line
})
export class UploadModule {}