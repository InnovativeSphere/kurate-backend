import {
  Controller,
  Get,
  Post,
  Patch,
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
  ApiResponse,
} from '@nestjs/swagger';
import { CreateCategoryDto, UpdateCategoryDto } from 'src/dto/category.dto';
import { JwtAuthGuard } from 'src/services/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/services/auth/guards/roles.guard';
import { Roles } from 'src/services/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CategoryService } from 'src/services/category/category.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // ──────────────────────────────────────────────
  // PUBLIC
  // ──────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List all active categories (public)' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.categoryService.findAll(page, limit);
  }

  // ──────────────────────────────────────────────
  // ADMIN — MUST be before :id to avoid collisions
  // ──────────────────────────────────────────────
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all categories (including soft‑deleted) — admin' })
  async findAllAdmin(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.categoryService.findAllAdmin(page, limit);
  }

  // ──────────────────────────────────────────────
  // PUBLIC by ID
  // ──────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID (public)' })
  async findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  // ──────────────────────────────────────────────
  // ADMIN MUTATIONS
  // ──────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category (admin)' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft‑delete a category (admin)' })
  async softDelete(@Param('id') id: string) {
    return this.categoryService.softDelete(id);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore a soft‑deleted category (admin)' })
  async restore(@Param('id') id: string) {
    return this.categoryService.restore(id);
  }

  @Delete(':id/permanent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Permanently delete a category (admin, only if no products)' })
  async hardDelete(@Param('id') id: string) {
    return this.categoryService.hardDelete(id);
  }
}