// src/dto/seller.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  IsPhoneNumber,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { VerificationStatus } from '@prisma/client';

// ──────────────────────────────────────────────
// Create Seller DTO
// ──────────────────────────────────────────────
export class CreateSellerDto {
  @ApiProperty({ example: 'TechGizmo Store' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  shop_name: string;

  @ApiPropertyOptional({ example: 'We sell premium refurbished phones.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shop_description?: string;

  @ApiPropertyOptional({ example: 'Lagos, Nigeria' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location_text?: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsPhoneNumber(null)
  whatsapp_number: string;

  // The certificate file (handled by interceptor) – just allow it to exist
  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Business certificate file (image or PDF)',
  })
  @IsOptional()
  certificate?: any;

  // Direct URL fallback
  @ApiPropertyOptional({
    description: 'Business certificate URL (use this OR upload a file)',
  })
  @IsOptional()
  @IsString()
  business_certificate_url?: string;
}

// ──────────────────────────────────────────────
// Update Seller DTO
// ──────────────────────────────────────────────
export class UpdateSellerDto {
  @ApiPropertyOptional({ example: 'TechGizmo International' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  shop_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shop_description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location_text?: string;

  @ApiPropertyOptional({ example: '+2348076543210' })
  @IsOptional()
  @IsPhoneNumber(null)
  whatsapp_number?: string;

  // The certificate file (handled by interceptor) – just allow it
  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Updated business certificate file (image or PDF)',
  })
  @IsOptional()
  certificate?: any;

  // Direct URL fallback
  @ApiPropertyOptional({
    description: 'Business certificate URL (use this OR upload a file)',
  })
  @IsOptional()
  @IsString()
  business_certificate_url?: string;
}

// ──────────────────────────────────────────────
// Admin: update verification status DTO
// ──────────────────────────────────────────────
export class UpdateVerificationDto {
  @ApiProperty({ enum: VerificationStatus, example: 'VERIFIED' })
  @IsEnum(VerificationStatus)
  status: VerificationStatus;
}

// ──────────────────────────────────────────────
// Response DTO (unchanged)
// ──────────────────────────────────────────────
@Exclude()
export class SellerResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiPropertyOptional()
  @Expose()
  user_id?: string;

  @ApiProperty()
  @Expose()
  shop_name: string;

  @ApiPropertyOptional()
  @Expose()
  shop_description?: string;

  @ApiPropertyOptional()
  @Expose()
  location_text?: string;

  @ApiProperty()
  @Expose()
  whatsapp_number: string;

  @ApiProperty({ enum: VerificationStatus })
  @Expose()
  verification_status: VerificationStatus;

  @ApiPropertyOptional()
  @Expose()
  business_certificate_url?: string;

  @ApiProperty()
  @Expose()
  created_at: Date;

  @ApiProperty()
  @Expose()
  updated_at: Date;
}