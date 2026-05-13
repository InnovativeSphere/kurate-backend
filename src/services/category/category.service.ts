import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';   // adjust path if needed
import { CreateCategoryDto, UpdateCategoryDto } from 'src/dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // PUBLIC METHODS (non‑deleted only)
  // ──────────────────────────────────────────────

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where: { deleted_at: null },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.count({ where: { deleted_at: null } }),
    ]);
    return { data: categories, total, page, limit };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category || category.deleted_at) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
    });
    if (!category || category.deleted_at) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  // ──────────────────────────────────────────────
  // ADMIN METHODS
  // ──────────────────────────────────────────────

  async create(dto: CreateCategoryDto) {
    // Check slug uniqueness (including soft‑deleted records to avoid confusion)
    const existing = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('A category with this slug already exists');
    }

    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException('A category with this slug already exists');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async softDelete(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (category.deleted_at) {
      throw new BadRequestException('Category is already soft‑deleted');
    }

    return this.prisma.category.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async restore(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (!category.deleted_at) {
      throw new BadRequestException('Category is not soft‑deleted');
    }

    return this.prisma.category.update({
      where: { id },
      data: { deleted_at: null },
    });
  }

  async hardDelete(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { products: { select: { id: true } } },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (category.products.length > 0) {
      throw new BadRequestException(
        'Cannot permanently delete a category that still has products. Soft‑delete it instead.',
      );
    }

    return this.prisma.category.delete({ where: { id } });
  }

  // Admin listing — includes soft‑deleted categories
  async findAllAdmin(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.count(),
    ]);
    return { data: categories, total, page, limit };
  }
}