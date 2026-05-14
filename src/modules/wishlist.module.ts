import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WishlistController } from 'src/controllers/wishlist.controller';
import { WishlistService } from 'src/services/wishlist.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-key',
    }),
  ],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}