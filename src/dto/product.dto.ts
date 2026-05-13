import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  IsUUID,
  IsObject,
  IsUrl,
  IsBoolean,
  ValidateNested,
  ArrayMinSize,
  MaxLength,
} from "class-validator";
import { Type, Exclude, Expose } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProductCondition, StockStatus } from "@prisma/client";
import { Transform } from "class-transformer";

// ──────────────────────────────────────────────
// Nested DTO for product images (creation)
// ──────────────────────────────────────────────
export class CreateProductImageDto {
  @ApiProperty({
    example: "https://storage.kurate.com/products/iphone-13-front.jpg",
  })
  @IsUrl()
  image_url: string;

  @ApiPropertyOptional({ example: "Front view of iPhone 13" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt_text?: string;

  @ApiProperty({ example: 1, description: "Display order (1 = first)" })
  @IsInt()
  @Min(0)
  display_order: number;

  @ApiPropertyOptional({ default: false, example: true })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

// ──────────────────────────────────────────────
// Create Product DTO (seller creates a product)
// ──────────────────────────────────────────────
export class CreateProductDto {
  @ApiProperty({ example: "iPhone 13 Pro" })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: "Brand new, factory unlocked" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    example: 450000,
    description: "Price in cents (₦1 = 100 cents)",
  })
  @IsInt()
  @Min(0)
  price_in_cents: number;

  @ApiProperty({ enum: ProductCondition, example: "NEW" })
  @IsEnum(ProductCondition)
  condition: ProductCondition;

  @ApiPropertyOptional({ enum: StockStatus, default: "IN_STOCK" })
  @IsOptional()
  @IsEnum(StockStatus)
  stock_status?: StockStatus;

  @ApiProperty({
    example: {
      brand: "Apple",
      model: "iPhone 13 Pro",
      storage: "256GB",
      color: "Graphite",
    },
    description: "Product specifications as JSON object",
  })
  @IsObject()
  specs: Record<string, any>;

  @ApiProperty({ example: "uuid-of-category" })
  @IsUUID()
  category_id: string;

  @ApiPropertyOptional({
    type: [CreateProductImageDto],
    description:
      "Not required when using file upload (use images field for files)",
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[]; // now optional
}

// ──────────────────────────────────────────────
// Update Product DTO (seller updates a product)
// ──────────────────────────────────────────────
export class UpdateProductDto {
  @ApiPropertyOptional({ example: "iPhone 13 Pro Max (Updated)" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  price_in_cents?: number;

  @ApiPropertyOptional({ enum: ProductCondition })
  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition;

  @ApiPropertyOptional({ enum: StockStatus })
  @IsOptional()
  @IsEnum(StockStatus)
  stock_status?: StockStatus;

  @ApiPropertyOptional({
    example: { storage: "512GB" },
    description: "Updated specs (partial merge allowed)",
  })
  @IsOptional()
  @IsObject()
  specs?: Record<string, any>;

  @ApiPropertyOptional({ example: "uuid-of-new-category" })
  @IsOptional()
  @IsUUID()
  category_id?: string;
}

// ──────────────────────────────────────────────
// Image-specific DTOs for separate image endpoints
// ──────────────────────────────────────────────

export class AddProductImageDto {
  @ApiPropertyOptional({
    type: "string",
    format: "binary",
    description: "Image file (if not using image_url)",
  })
  @IsOptional()
  image?: any; // allowed but not processed; file is handled by interceptor

  @ApiPropertyOptional({
    example: "https://storage.kurate.com/products/new-image.jpg",
  })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alt_text?: string;

  @ApiProperty({ example: 1 })
  @Transform(({ value }) => parseInt(value, 10)) // parse string to int
  @IsInt()
  @Min(0)
  display_order: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true) // parse string to boolean
  @IsBoolean()
  is_primary?: boolean;
}
export class UpdateProductImageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  image_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alt_text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

// ──────────────────────────────────────────────
// Response DTOs (safe for API output)
// ──────────────────────────────────────────────

@Exclude()
export class ProductImageResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  image_url: string;

  @ApiPropertyOptional()
  @Expose()
  alt_text?: string;

  @ApiProperty()
  @Expose()
  display_order: number;

  @ApiProperty()
  @Expose()
  is_primary: boolean;
}

@Exclude()
export class ProductResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  description?: string;

  @ApiProperty()
  @Expose()
  price_in_cents: number;

  @ApiProperty({ enum: ProductCondition })
  @Expose()
  condition: ProductCondition;

  @ApiProperty({ enum: StockStatus })
  @Expose()
  stock_status: StockStatus;

  @ApiProperty()
  @Expose()
  specs: Record<string, any>;

  @ApiProperty()
  @Expose()
  category_id: string;

  @ApiProperty()
  @Expose()
  seller_id: string;

  @ApiProperty({ type: [ProductImageResponseDto] })
  @Expose()
  @Type(() => ProductImageResponseDto)
  images: ProductImageResponseDto[];

  @ApiProperty()
  @Expose()
  created_at: Date;

  @ApiProperty()
  @Expose()
  updated_at: Date;

  // Seller and category brief info can be added via service mapping if needed.
  // For now, we keep the foreign keys; later we can add nested DTOs.
}
