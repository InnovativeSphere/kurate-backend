import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { CurrentUser, JwtUserPayload } from 'src/services/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/services/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/services/auth/guards/roles.guard';
import { Roles } from 'src/services/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AddWishlistItemDto } from 'src/dto/wishlist.dto';
import { WishlistService } from 'src/Services/wishlist.service';

@ApiTags('Wishlist')
@ApiBearerAuth()
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  // ─── USER ENDPOINTS ────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add a product to your wishlist' })
  async addItem(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: AddWishlistItemDto,
  ) {
    return this.wishlistService.addItem(user.id, dto);
  }

  @Delete('product/:productId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a product from your wishlist (by product ID)' })
  async removeByProductId(
    @CurrentUser() user: JwtUserPayload,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeByProductId(user.id, productId);
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a wishlist item (by item ID)' })
  async removeById(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') itemId: string,
  ) {
    return this.wishlistService.removeById(user.id, itemId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get your wishlist (active products only)" })
  async getMyWishlist(
    @CurrentUser() user: JwtUserPayload,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.wishlistService.getUserWishlist(user.id, page, limit);
  }

  // ─── ADMIN ENDPOINTS ───────────────────────────────────
  @Get('admin/user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: view any user\'s wishlist' })
  async adminGetUserWishlist(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.wishlistService.adminGetUserWishlist(userId, page, limit);
  }

  @Delete('admin/items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: remove any wishlist item' })
  async adminRemoveItem(@Param('id') itemId: string) {
    return this.wishlistService.adminRemoveItem(itemId);
  }
}