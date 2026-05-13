import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddWishlistItemDto } from 'src/dto/wishlist.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── ADD ITEM ──────────────────────────────────────────
  async addItem(userId: string, dto: AddWishlistItemDto) {
    // 1. Verify product is active
    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.product_id,
        deleted_at: null,
        seller: { deleted_at: null },
        category: { deleted_at: null },
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found or unavailable');
    }

    // 2. Create wishlist item, catch duplicate
    try {
      const item = await this.prisma.wishlistItem.create({
        data: {
          user_id: userId,
          product_id: dto.product_id,
        },
        include: {
          product: {
            include: {
              product_images: {
                where: { is_primary: true },
                take: 1,
              },
              seller: { select: { shop_name: true } },
            },
          },
        },
      });
      return this.mapItemResponse(item);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Product is already in your wishlist');
      }
      throw error;
    }
  }

  // ─── REMOVE BY PRODUCT ID ─────────────────────────────
  async removeByProductId(userId: string, productId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { user_id_product_id: { user_id: userId, product_id: productId } },
    });
    if (!item) {
      throw new NotFoundException('Wishlist item not found');
    }
    await this.prisma.wishlistItem.delete({ where: { id: item.id } });
    return { message: 'Item removed from wishlist' };
  }

  // ─── REMOVE BY ITEM ID ────────────────────────────────
  async removeById(userId: string, itemId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException('Wishlist item not found');
    }
    if (item.user_id !== userId) {
      throw new ForbiddenException('You can only remove your own wishlist items');
    }
    await this.prisma.wishlistItem.delete({ where: { id: itemId } });
    return { message: 'Item removed from wishlist' };
  }

  // ─── GET USER'S WISHLIST (active products only) ──────
  async getUserWishlist(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.wishlistItem.findMany({
        where: {
          user_id: userId,
          product: {
            deleted_at: null,
            seller: { deleted_at: null },
            category: { deleted_at: null },
          },
        },
        skip,
        take: limit,
        orderBy: { added_at: 'desc' },
        include: {
          product: {
            include: {
              product_images: {
                where: { is_primary: true },
                take: 1,
              },
              seller: { select: { shop_name: true } },
            },
          },
        },
      }),
      this.prisma.wishlistItem.count({
        where: {
          user_id: userId,
          product: {
            deleted_at: null,
            seller: { deleted_at: null },
            category: { deleted_at: null },
          },
        },
      }),
    ]);

    return {
      data: items.map((item) => this.mapItemResponse(item)),
      total,
      page,
      limit,
    };
  }

  // ─── ADMIN: VIEW ANY USER'S WISHLIST ──────────────────
  async adminGetUserWishlist(targetUserId: string, page = 1, limit = 20) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.getUserWishlist(targetUserId, page, limit);
  }

  // ─── ADMIN: DELETE ANY ITEM ───────────────────────────
  async adminRemoveItem(itemId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Wishlist item not found');
    await this.prisma.wishlistItem.delete({ where: { id: itemId } });
    return { message: 'Wishlist item removed by admin' };
  }

  // ─── Private response formatter ───────────────────────
  private mapItemResponse(item: any) {
    const primaryImage = item.product?.product_images?.[0]?.image_url ?? null;
    return {
      id: item.id,
      added_at: item.added_at,
      product: {
        id: item.product.id,
        name: item.product.name,
        price_in_cents: item.product.price_in_cents,
        condition: item.product.condition,
        stock_status: item.product.stock_status,
        primary_image_url: primaryImage,
        seller_shop_name: item.product.seller?.shop_name ?? 'Unknown',
      },
    };
  }
}