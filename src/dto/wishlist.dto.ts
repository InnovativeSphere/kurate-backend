import { IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Exclude, Type } from 'class-transformer';

// ──────────────────────────────────────────────
// Request DTO – add an item
// ──────────────────────────────────────────────
export class AddWishlistItemDto {
  @ApiProperty({ example: 'uuid-of-product', description: 'Product ID to add' })
  @IsUUID()
  product_id: string;
}

// ──────────────────────────────────────────────
// Nested product info for wishlist display
// ──────────────────────────────────────────────
@Exclude()
export class WishlistProductDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  price_in_cents: number;

  @ApiProperty()
  @Expose()
  condition: string;

  @ApiProperty()
  @Expose()
  stock_status: string;

  @ApiPropertyOptional()
  @Expose()
  primary_image_url?: string;   // the primary image URL, if any

  @ApiProperty()
  @Expose()
  seller_shop_name: string;     // shop name shown on card
}

// ──────────────────────────────────────────────
// Response DTO for a single wishlist item
// ──────────────────────────────────────────────
@Exclude()
export class WishlistItemResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  added_at: Date;

  @ApiProperty({ type: WishlistProductDto })
  @Expose()
  @Type(() => WishlistProductDto)
  product: WishlistProductDto;
}