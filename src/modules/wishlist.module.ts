import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WishlistService } from 'src/Services/wishlist.service';
import { WishlistController } from 'src/Controllers/wishlist.controller';

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