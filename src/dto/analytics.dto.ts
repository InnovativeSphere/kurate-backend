import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Exclude, Type } from 'class-transformer';

// ──────────────────────────────────────────────
// Product view stats for a single product
// ──────────────────────────────────────────────
@Exclude()
export class ProductViewStatsDto {
  @ApiProperty()
  @Expose()
  product_id: string;

  @ApiProperty()
  @Expose()
  product_name: string;

  @ApiPropertyOptional()
  @Expose()
  product_description?: string;

  @ApiProperty()
  @Expose()
  price_in_cents: number;

  @ApiProperty()
  @Expose()
  condition: string;

  @ApiProperty()
  @Expose()
  stock_status: string;

  @ApiProperty()
  @Expose()
  total_views: number;

  @ApiProperty()
  @Expose()
  views_this_week: number;

  @ApiProperty()
  @Expose()
  views_this_month: number;

  @ApiProperty()
  @Expose()
  last_viewed_at: Date | null;
}

// ──────────────────────────────────────────────
// Seller dashboard – all products with stats
// ──────────────────────────────────────────────
@Exclude()
export class SellerDashboardDto {
  @ApiProperty()
  @Expose()
  seller_id: string;

  @ApiProperty()
  @Expose()
  shop_name: string;

  @ApiProperty()
  @Expose()
  total_products: number;

  @ApiProperty()
  @Expose()
  total_product_views: number;

  @ApiProperty({ type: [ProductViewStatsDto] })
  @Expose()
  @Type(() => ProductViewStatsDto)
  products: ProductViewStatsDto[];
}

// ──────────────────────────────────────────────
// Admin overview – platform‑wide stats
// ──────────────────────────────────────────────
@Exclude()
export class DailyViewDto {
  @ApiProperty()
  @Expose()
  date: string; // YYYY-MM-DD

  @ApiProperty()
  @Expose()
  count: number;
}

@Exclude()
export class TopProductDto {
  @ApiProperty()
  @Expose()
  product_id: string;

  @ApiProperty()
  @Expose()
  product_name: string;

  @ApiProperty()
  @Expose()
  shop_name: string;

  @ApiProperty()
  @Expose()
  total_views: number;
}

@Exclude()
export class AdminOverviewDto {
  @ApiProperty()
  @Expose()
  total_products: number;

  @ApiProperty()
  @Expose()
  total_views: number;

  @ApiProperty()
  @Expose()
  total_sellers: number;

  @ApiProperty()
  @Expose()
  views_today: number;

  @ApiProperty()
  @Expose()
  views_this_week: number;

  @ApiProperty({ type: [DailyViewDto] })
  @Expose()
  @Type(() => DailyViewDto)
  views_per_day: DailyViewDto[];

  @ApiProperty({ type: [TopProductDto] })
  @Expose()
  @Type(() => TopProductDto)
  top_products: TopProductDto[];
}