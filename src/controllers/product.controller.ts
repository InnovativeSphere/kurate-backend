// src/controllers/product.controller.ts
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
  UploadedFiles,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  Req,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { Request } from "express";
import {
  CreateProductDto,
  UpdateProductDto,
  AddProductImageDto,
  UpdateProductImageDto,
} from "src/dto/product.dto";
import {
  CurrentUser,
  JwtUserPayload,
} from "src/services/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "src/services/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/services/auth/guards/roles.guard";
import { Roles } from "src/services/auth/decorators/roles.decorator";
import { UserRole } from "@prisma/client";
import {
  ImageFileInput,
  ProductService,
} from "src/services/product/product.service";
import { PrismaService } from "src/prisma/prisma.service";

@ApiTags("Products")
@Controller("products")
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly prisma: PrismaService,
  ) {}

  // ──────────────────────────────────────────────
  // PUBLIC
  // ──────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: "List active products (public)" })
  async findAll(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("category_id") category_id?: string,
    @Query("condition") condition?: string,
    @Query("min_price") min_price?: number,
    @Query("max_price") max_price?: number,
    @Query("search") search?: string,
    @Query("seller_id") seller_id?: string, // 👈 new
  ) {
    return this.productService.findAll({
      page,
      limit,
      category_id,
      condition,
      min_price,
      max_price,
      search,
      seller_id, // pass it
    });
  }

  // ──────────────────────────────────────────────
  // SELLER ROUTES (specific, before wildcard)
  // ──────────────────────────────────────────────
  @Get("my-products")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current seller's own products" })
  async getMyProducts(@CurrentUser() user: JwtUserPayload) {
    const seller = await this.prisma.seller.findFirst({
      where: { user_id: user.id },
    });
    if (!seller) throw new NotFoundException("Seller not found");
    return this.productService.findAllAdmin({
      seller_id: seller.id,
      limit: 100,
      includeDeleted: false,
    });
  }

  @Get("admin/all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all products (admin, incl. soft-deleted)" })
  async findAllAdmin(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("includeDeleted") includeDeleted?: string,
    @Query("seller_id") seller_id?: string,
  ) {
    return this.productService.findAllAdmin({
      page,
      limit,
      includeDeleted: includeDeleted === "true",
      seller_id,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get product by ID (public, records view)" })
  async findOne(@Param("id") id: string, @Req() req: Request) {
    return this.productService.findOne(
      id,
      req.ip,
      req.headers["user-agent"],
      (req as any).user?.id,
    );
  }

  // ──────────────────────────────────────────────
  // SELLER ACTIONS – create (no :id)
  // ──────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        data: {
          type: "string",
          description: "JSON string of CreateProductDto (without images)",
        },
        images: {
          type: "array",
          items: { type: "string", format: "binary" },
          description: "Product image files (max 10)",
        },
        image_metadata: {
          type: "string",
          description: "JSON array of image metadata matching images order",
        },
      },
      required: ["data", "images"],
    },
  })
  @UseInterceptors(FilesInterceptor("images", 10))
  async create(
    @CurrentUser() user: JwtUserPayload,
    @UploadedFiles() files: any[],
    @Body("data") data: string,
    @Body("image_metadata") metadata?: string,
  ) {
    if (!data) throw new NotFoundException("Product data is required");
    const productDto: CreateProductDto = JSON.parse(data);

    if (
      (!files || files.length === 0) &&
      (!productDto.images || productDto.images.length === 0)
    ) {
      throw new NotFoundException(
        "At least one product image (file or URL) is required",
      );
    }

    let imageMetaArray: any[] = [];
    if (metadata && files && files.length > 0) {
      imageMetaArray = JSON.parse(metadata);
      if (
        !Array.isArray(imageMetaArray) ||
        imageMetaArray.length !== files.length
      ) {
        throw new NotFoundException(
          "image_metadata must be an array with the same length as images files",
        );
      }
    }

    const imageFiles: ImageFileInput[] = files
      ? files.map((file, index) => {
          const meta = imageMetaArray[index] || {};
          return {
            buffer: file.buffer,
            mimetype: file.mimetype,
            alt_text: meta.alt_text,
            display_order:
              meta.display_order !== undefined ? meta.display_order : index + 1,
            is_primary:
              meta.is_primary !== undefined ? meta.is_primary : index === 0,
          };
        })
      : [];

    return this.productService.create(productDto, user.id, imageFiles);
  }

  // ──────────────────────────────────────────────
  // IMAGE MANAGEMENT – must come BEFORE wildcard `:id`
  // ──────────────────────────────────────────────
  @Post(":id/images")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        image: {
          type: "string",
          format: "binary",
          description: "Image file (jpeg, png, webp)",
        },
        image_url: { type: "string", description: "Direct image URL" },
        alt_text: { type: "string" },
        display_order: { type: "integer" },
        is_primary: { type: "boolean" },
      },
    },
  })
  @UseInterceptors(FileInterceptor("image"))
  async addImage(
    @CurrentUser() user: JwtUserPayload,
    @Param("id") productId: string,
    @Body() dto: AddProductImageDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file?: any,
  ) {
    if (file) {
      const url = await this.productService["uploadService"].uploadImage({
        buffer: file.buffer,
        mimetype: file.mimetype,
      });
      dto.image_url = url;
    }
    if (!dto.image_url || dto.image_url.trim() === "") {
      throw new BadRequestException(
        "Either an image file or a non‑empty image_url is required",
      );
    }
    return this.productService.addImage(productId, dto, user.id, false);
  }

  @Patch("images/:imageId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update image details (seller)" })
  async updateImage(
    @CurrentUser() user: JwtUserPayload,
    @Param("imageId") imageId: string,
    @Body() dto: UpdateProductImageDto,
  ) {
    return this.productService.updateImage(imageId, dto, user.id, false);
  }

  @Delete("images/:imageId")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete image (seller)" })
  async removeImage(
    @CurrentUser() user: JwtUserPayload,
    @Param("imageId") imageId: string,
  ) {
    return this.productService.removeImage(imageId, user.id, false);
  }

  // ──────────────────────────────────────────────
  // SELLER ACTIONS on a specific product (wildcard :id)
  // ──────────────────────────────────────────────
  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update your own product (seller)" })
  async update(
    @CurrentUser() user: JwtUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(id, dto, user.id, false);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Soft‑delete your own product (seller)" })
  async softDelete(
    @CurrentUser() user: JwtUserPayload,
    @Param("id") id: string,
  ) {
    return this.productService.softDelete(id, user.id, false);
  }

  // ──────────────────────────────────────────────
  // ADMIN ACTIONS
  // ──────────────────────────────────────────────
  @Post(":id/restore")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Restore soft-deleted product (admin)" })
  async restore(@Param("id") id: string) {
    return this.productService.restore(id);
  }

  @Delete(":id/permanent")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Permanently delete product (admin)" })
  async hardDelete(@Param("id") id: string) {
    return this.productService.hardDelete(id);
  }
}
