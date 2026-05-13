// src/controllers/seller.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import {
  CreateSellerDto,
  UpdateSellerDto,
  UpdateVerificationDto,
} from 'src/dto/seller.dto';
import { CurrentUser, JwtUserPayload } from 'src/services/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/services/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/services/auth/guards/roles.guard';
import { Roles } from 'src/services/auth/decorators/roles.decorator';
import { UserRole, VerificationStatus } from '@prisma/client';
import { SellerService } from 'src/services/seller/seller.service';
import { UploadService } from '../cloudinary/upload.service';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Sellers')
@Controller('sellers')
export class SellerController {
  constructor(
    private readonly sellerService: SellerService,
    private readonly uploadService: UploadService,
    private readonly prisma: PrismaService,
  ) {}

  // ──────────────────────────────────────────────
  // PUBLIC ROUTES (non‑auth)
  // ──────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List all active sellers (public)' })
  async findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.sellerService.findAllAdmin(page, limit);
  }

  // ──────────────────────────────────────────────
  // SPECIFIC ROUTES (auth, before wildcard)
  // ──────────────────────────────────────────────
  @Post('my-shop')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        shop_name: { type: 'string' },
        shop_description: { type: 'string' },
        location_text: { type: 'string' },
        whatsapp_number: { type: 'string' },
        certificate: {
          type: 'string',
          format: 'binary',
          description: 'Business certificate (image or PDF)',
        },
      },
      required: ['shop_name', 'whatsapp_number'],
    },
  })
  @UseInterceptors(FileInterceptor('certificate'))
  async createMyShop(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateSellerDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp)$|application\/pdf$/,
          }),
        ],
      }),
    )
    certificate?: any,
  ) {
    if (certificate) {
      const certificateUrl = await this.uploadService.uploadCertificate({
        buffer: certificate.buffer,
        mimetype: certificate.mimetype,
      });
      dto.business_certificate_url = certificateUrl;
    }
    return this.sellerService.create(dto, user.id);
  }

  @Get('my-shop')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMyShop(@CurrentUser() user: JwtUserPayload) {
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });
    if (!fullUser) throw new NotFoundException('User not found');
    return this.sellerService.findSellerByUserEmail(fullUser.email);
  }

  // ✅ Updated: update shop now supports certificate file upload
  @Patch('my-shop')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        shop_name: { type: 'string' },
        shop_description: { type: 'string' },
        location_text: { type: 'string' },
        whatsapp_number: { type: 'string' },
        business_certificate_url: { type: 'string', description: 'Direct URL to certificate (optional)' },
        certificate: {
          type: 'string',
          format: 'binary',
          description: 'Upload a new certificate file (image or PDF)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('certificate'))
  async updateMyShop(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UpdateSellerDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp)$|application\/pdf$/,
          }),
        ],
      }),
    )
    certificate?: any,
  ) {
    // 1. If a file was uploaded, upload it to Cloudinary and set the URL
    if (certificate) {
      const certificateUrl = await this.uploadService.uploadCertificate({
        buffer: certificate.buffer,
        mimetype: certificate.mimetype,
      });
      dto.business_certificate_url = certificateUrl;
    }
    // (If no file but dto.business_certificate_url is present, it stays as the direct URL)

    // 2. Fetch the seller
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });
    if (!fullUser) throw new NotFoundException('User not found');
    const seller = await this.sellerService.findSellerByUserEmail(fullUser.email);

    // 3. Update the shop
    return this.sellerService.update(seller.id, dto, user.id, false);
  }

  @Delete('my-shop')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  async disableMyShop(@CurrentUser() user: JwtUserPayload) {
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });
    if (!fullUser) throw new NotFoundException('User not found');
    const seller = await this.sellerService.findSellerByUserEmail(fullUser.email);
    return this.sellerService.softDelete(seller.id, user.id, false);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async findAllAdmin(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: VerificationStatus,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.sellerService.findAllAdmin(page, limit, status, includeDeleted === 'true');
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async getStats() {
    return this.sellerService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'View seller by ID (public)' })
  async findOne(@Param('id') id: string) {
    return this.sellerService.findById(id);
  }

  @Patch(':id/verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async setVerification(@Param('id') sellerId: string, @Body() dto: UpdateVerificationDto) {
    return this.sellerService.setVerification(sellerId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async adminUpdate(@Param('id') sellerId: string, @Body() dto: UpdateSellerDto) {
    return this.sellerService.update(sellerId, dto, 'admin', true);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  async adminSoftDelete(@Param('id') sellerId: string) {
    return this.sellerService.softDelete(sellerId, 'admin', true);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  async restore(@Param('id') sellerId: string) {
    return this.sellerService.restore(sellerId);
  }

  @Delete(':id/permanent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  async hardDelete(@Param('id') sellerId: string) {
    return this.sellerService.hardDelete(sellerId);
  }
}