import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CategoryController } from 'src/controllers/category.controller';
import { CategoryService } from 'src/services/category/category.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-key',
    }),
  ],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService], 
})
export class CategoryModule {}