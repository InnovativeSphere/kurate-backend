// src/services/product/product.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { UploadService } from "../../cloudinary/upload.service";
import {
  CreateProductDto,
  UpdateProductDto,
  AddProductImageDto,
  UpdateProductImageDto,
} from "src/dto/product.dto";
import { Prisma } from "@prisma/client";

// 👇 interface for file input from controller
export interface ImageFileInput {
  buffer: Buffer;
  mimetype: string;
  alt_text?: string;
  display_order: number;
  is_primary: boolean;
}

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  // ─── HELPER: fetch product with seller and images, throw if not found ───
  private async findProductOrFail(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: true,
        product_images: { orderBy: { display_order: "asc" } },
      },
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  private mapProductResponse(product: any) {
    if (!product) return null;
    const { product_images, ...rest } = product;
    return { ...rest, images: product_images ?? [] };
  }

  // ─── PUBLIC ─────────────────────────────────────────────
  async findAll(
    filters: {
      category_id?: string;
      condition?: string;
      min_price?: number;
      max_price?: number;
      search?: string;
      seller_id?: string; // ✅ new filter
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      deleted_at: null,
      seller: { deleted_at: null },
      category: { deleted_at: null },
    };

    if (filters.category_id) {
      where.category_id = filters.category_id;
    }
    if (filters.condition) {
      where.condition = filters.condition as any;
    }
    if (filters.min_price !== undefined || filters.max_price !== undefined) {
      where.price_in_cents = {};
      if (filters.min_price !== undefined)
        where.price_in_cents.gte = filters.min_price;
      if (filters.max_price !== undefined)
        where.price_in_cents.lte = filters.max_price;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.seller_id) {
      where.seller_id = filters.seller_id; // ✅ apply seller filter
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          product_images: { orderBy: { display_order: "asc" } },
          category: { select: { id: true, name: true, slug: true } },
          seller: {
            select: { id: true, shop_name: true, whatsapp_number: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map((p) => this.mapProductResponse(p)),
      total,
      page,
      limit,
    };
  }

  async findOne(
    productId: string,
    ip?: string,
    userAgent?: string,
    userId?: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deleted_at: null,
        seller: { deleted_at: null },
        category: { deleted_at: null },
      },
      include: {
        product_images: { orderBy: { display_order: "asc" } },
        category: { select: { id: true, name: true, slug: true } },
        seller: {
          select: { id: true, shop_name: true, whatsapp_number: true },
        },
      },
    });

    if (!product) throw new NotFoundException("Product not found");

    await this.prisma.productView.create({
      data: {
        product_id: productId,
        ip_address: ip || null,
        user_agent: userAgent || null,
        user_id: userId || null,
      },
    });

    return this.mapProductResponse(product);
  }

  // ─── SELLER ACTIONS ─────────────────────────────────────
  async create(
    dto: CreateProductDto,
    userId: string,
    imageFiles?: ImageFileInput[],
  ) {
    // 1. Find seller
    const seller = await this.prisma.seller.findUnique({
      where: { user_id: userId },
    });
    if (!seller)
      throw new ForbiddenException(
        "You must have a seller profile to create products",
      );

    // 2. Verify category
    const category = await this.prisma.category.findUnique({
      where: { id: dto.category_id },
    });
    if (!category || category.deleted_at) {
      throw new NotFoundException("Category not found or inactive");
    }

    // 3. Merge images from files (uploaded) and direct URLs
    const records: Omit<
      Prisma.ProductImageUncheckedCreateInput,
      "product_id"
    >[] = [];

    // A) Process file uploads → Cloudinary URLs
    if (imageFiles && imageFiles.length > 0) {
      const uploadedUrls = await Promise.all(
        imageFiles.map((file) =>
          this.uploadService.uploadImage({
            buffer: file.buffer,
            mimetype: file.mimetype,
          }),
        ),
      );
      uploadedUrls.forEach((url, idx) => {
        records.push({
          image_url: url,
          alt_text: imageFiles[idx].alt_text,
          display_order: imageFiles[idx].display_order,
          is_primary: imageFiles[idx].is_primary,
        });
      });
    }

    // B) Direct URL images from dto.images (if any)
    if (dto.images && dto.images.length > 0) {
      dto.images.forEach((img) => {
        records.push({
          image_url: img.image_url,
          alt_text: img.alt_text,
          display_order: img.display_order,
          is_primary: img.is_primary || false,
        });
      });
    }

    if (records.length === 0) {
      throw new BadRequestException(
        "At least one product image (file or URL) is required",
      );
    }

    // 4. Enforce exactly one primary image
    const primaryCount = records.filter((r) => r.is_primary).length;
    if (primaryCount !== 1) {
      throw new BadRequestException(
        "You must specify exactly one primary image",
      );
    }

    // 5. Transaction: create product, then images with product_id
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: dto.name,
          description: dto.description,
          price_in_cents: dto.price_in_cents,
          condition: dto.condition,
          stock_status: dto.stock_status || "IN_STOCK",
          specs: dto.specs as any,
          category_id: dto.category_id,
          seller_id: seller.id,
        },
      });

      await tx.productImage.createMany({
        data: records.map((img) => ({
          ...img,
          product_id: product.id,
        })),
      });

      const fullProduct = await tx.product.findUnique({
        where: { id: product.id },
        include: { product_images: { orderBy: { display_order: "asc" } } },
      });
      return this.mapProductResponse(fullProduct);
    });
  }

  async update(
    productId: string,
    dto: UpdateProductDto,
    userId: string,
    isAdmin: boolean,
  ) {
    const product = await this.findProductOrFail(productId);

    if (product.seller.user_id !== userId && !isAdmin) {
      throw new ForbiddenException("You can only edit your own products");
    }
    if (product.deleted_at && !isAdmin) {
      throw new BadRequestException("Cannot update a deleted product");
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: dto,
      include: { product_images: { orderBy: { display_order: "asc" } } },
    });
    return this.mapProductResponse(updated);
  }

  async softDelete(productId: string, userId: string, isAdmin: boolean) {
    const product = await this.findProductOrFail(productId);
    if (product.seller.user_id !== userId && !isAdmin) {
      throw new ForbiddenException("You can only delete your own products");
    }
    if (product.deleted_at) {
      throw new BadRequestException("Product is already deleted");
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: { deleted_at: new Date() },
    });
  }

  // ─── IMAGE MANAGEMENT (seller / admin) ──────────────────
  async addImage(
    productId: string,
    dto: AddProductImageDto,
    userId: string,
    isAdmin: boolean,
  ) {
    const product = await this.findProductOrFail(productId);
    if (product.seller.user_id !== userId && !isAdmin) {
      throw new ForbiddenException(
        "You can only manage images of your own products",
      );
    }

    if (dto.is_primary) {
      await this.prisma.productImage.updateMany({
        where: { product_id: productId, is_primary: true },
        data: { is_primary: false },
      });
    }

    return this.prisma.productImage.create({
      data: {
        image_url: dto.image_url!,
        alt_text: dto.alt_text,
        display_order: dto.display_order,
        is_primary: dto.is_primary || false,
        product_id: productId,
      },
    });
  }

  async removeImage(imageId: string, userId: string, isAdmin: boolean) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
      include: { product: { include: { seller: true } } },
    });
    if (!image) throw new NotFoundException("Image not found");
    if (image.product.seller.user_id !== userId && !isAdmin) {
      throw new ForbiddenException(
        "You can only remove images of your own products",
      );
    }

    if (image.is_primary) {
      const nextImage = await this.prisma.productImage.findFirst({
        where: { product_id: image.product_id, id: { not: imageId } },
        orderBy: { display_order: "asc" },
      });
      if (nextImage) {
        await this.prisma.productImage.update({
          where: { id: nextImage.id },
          data: { is_primary: true },
        });
      } else {
        throw new BadRequestException("Cannot delete the only product image");
      }
    }

    return this.prisma.productImage.delete({ where: { id: imageId } });
  }

  async updateImage(
    imageId: string,
    dto: UpdateProductImageDto,
    userId: string,
    isAdmin: boolean,
  ) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
      include: { product: { include: { seller: true } } },
    });
    if (!image) throw new NotFoundException("Image not found");
    if (image.product.seller.user_id !== userId && !isAdmin) {
      throw new ForbiddenException(
        "You can only update images of your own products",
      );
    }

    if (dto.is_primary === true) {
      await this.prisma.productImage.updateMany({
        where: { product_id: image.product_id, is_primary: true },
        data: { is_primary: false },
      });
    }

    return this.prisma.productImage.update({
      where: { id: imageId },
      data: dto,
    });
  }

  // ─── ADMIN ACTIONS ──────────────────────────────────────
  async findAllAdmin(filters: {
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
    seller_id?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    if (!filters.includeDeleted) {
      where.deleted_at = null;
    }
    if (filters.seller_id) {
      where.seller_id = filters.seller_id;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          product_images: { orderBy: { display_order: "asc" } },
          seller: {
            select: { id: true, shop_name: true, whatsapp_number: true },
          },
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map((p) => this.mapProductResponse(p)),
      total,
      page,
      limit,
    };
  }

  async restore(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException("Product not found");
    if (!product.deleted_at)
      throw new BadRequestException("Product is already active");

    return this.prisma.product.update({
      where: { id: productId },
      data: { deleted_at: null },
    });
  }

  async hardDelete(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException("Product not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { product_id: productId } });
      await tx.productView.deleteMany({ where: { product_id: productId } });
      await tx.product.delete({ where: { id: productId } });
    });

    return { message: "Product and all associated data permanently deleted" };
  }
}