import {
  Controller,
  Get,
  Param,
  UseGuards,
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
import { AnalyticsService } from 'src/services/analytics/analytics.service';
import { SellerService } from 'src/services/seller/seller.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly sellerService: SellerService
    ,
  ) {}

  // ──────────────────────────────────────────────
  // SELLER DASHBOARD
  // ──────────────────────────────────────────────

  @Get('my-shop')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seller dashboard – all your products with view stats' })
  async getMyDashboard(@CurrentUser() user: JwtUserPayload) {
    const seller = await this.sellerService.findMyShop(user.id);   // throws if no shop
    return this.analyticsService.getSellerDashboard(seller.id);
  }

  @Get('my-shop/products/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detailed view stats for one of your products' })
  async getProductDetail(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') productId: string,
  ) {
    const seller = await this.sellerService.findMyShop(user.id);
    return this.analyticsService.getProductDetail(seller.id, productId);
  }

  // ──────────────────────────────────────────────
  // ADMIN OVERVIEW
  // ──────────────────────────────────────────────

  @Get('admin/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin – platform‑wide analytics' })
  async getAdminOverview() {
    return this.analyticsService.getAdminOverview();
  }
}