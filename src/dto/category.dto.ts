import {
  IsString,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Exclude } from 'class-transformer';

// ──────────────────────────────────────────────
// Create Category DTO (admin only)
// ──────────────────────────────────────────────
export class CreateCategoryDto {
  @ApiProperty({ example: 'Smartphones' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty({
    example: 'smartphones',
    description: 'URL-friendly slug (auto‑generated if empty)',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase letters, numbers, and hyphens only',
  })
  slug: string;

  @ApiPropertyOptional({ example: 'Latest mobile phones and accessories' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.kurate.com/icons/smartphones.svg' })
  @IsOptional()
  @IsUrl()
  icon_url?: string;
}

// ──────────────────────────────────────────────
// Update Category DTO (admin only)
// ──────────────────────────────────────────────
export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Mobile Phones' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: 'mobile-phones' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase letters, numbers, and hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  icon_url?: string;
}

// ──────────────────────────────────────────────
// Response DTO (public + admin)
// ──────────────────────────────────────────────
@Exclude()
export class CategoryResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  slug: string;

  @ApiPropertyOptional()
  @Expose()
  description?: string;

  @ApiPropertyOptional()
  @Expose()
  icon_url?: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  // deletedAt intentionally omitted from public responses
}