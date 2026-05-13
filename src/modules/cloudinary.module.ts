import { Module, Global } from '@nestjs/common';
import { CloudinaryProvider } from 'src/cloudinary/cloudinary.provider';

@Global()   // makes it available everywhere without importing again
@Module({
  providers: [CloudinaryProvider],
  exports: [CloudinaryProvider],
})
export class CloudinaryModule {}