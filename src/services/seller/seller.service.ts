// src/services/seller/seller.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import {
  CreateSellerDto,
  UpdateSellerDto,
  UpdateVerificationDto,
} from "src/dto/seller.dto";
import { VerificationStatus, UserRole } from "@prisma/client";

@Injectable()
export class SellerService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helper to remove non‑DB fields (like certificate) before passing to Prisma ──
  private stripNonDbFields(dto: CreateSellerDto | UpdateSellerDto): any {
    const { certificate, ...clean } = dto as any;
    return clean;
  }

  async create(dto: CreateSellerDto, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException("Admins cannot create a seller profile");
    }

    const existing = await this.prisma.seller.findFirst({
      where: { user_id: userId },
    });
    if (existing) {
      throw new ConflictException("You already have a seller profile");
    }

    const cleanData = this.stripNonDbFields(dto);

    return this.prisma.seller.create({
      data: {
        ...cleanData,
        user_id: userId,
      },
    });
  }

  async findSellerByUserEmail(email: string) {
    const seller = await this.prisma.seller.findFirst({
      where: { user: { email } },
    });
    if (!seller) throw new NotFoundException("Seller not found");
    return seller;
  }

  async findMyShop(userId: string) {
    const seller = await this.prisma.seller.findFirst({
      where: { user_id: userId },
    });
    if (!seller) throw new NotFoundException("Seller not found");
    return seller;
  }

  async findById(sellerId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
    });
    if (!seller || seller.deleted_at) {
      throw new NotFoundException("Seller not found");
    }
    return seller;
  }

  async update(
    sellerId: string,
    dto: UpdateSellerDto,
    userId: string,
    isAdmin: boolean,
  ) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
    });
    if (!seller) throw new NotFoundException("Seller not found");

    if (seller.user_id !== userId && !isAdmin) {
      throw new ForbiddenException("You can only edit your own shop");
    }

    if (seller.deleted_at) {
      throw new BadRequestException(
        "Cannot update a soft‑deleted shop. Restore it first.",
      );
    }

    const cleanData = this.stripNonDbFields(dto);

    return this.prisma.seller.update({
      where: { id: sellerId },
      data: cleanData,
    });
  }

  async softDelete(sellerId: string, userId: string, isAdmin: boolean) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
    });
    if (!seller) throw new NotFoundException("Seller not found");

    if (seller.user_id !== userId && !isAdmin) {
      throw new ForbiddenException("You can only delete your own shop");
    }

    if (seller.deleted_at) {
      throw new BadRequestException("Shop is already disabled");
    }

    return this.prisma.seller.update({
      where: { id: sellerId },
      data: { deleted_at: new Date() },
    });
  }

  async restore(sellerId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
    });
    if (!seller) throw new NotFoundException("Seller not found");
    if (!seller.deleted_at) {
      throw new BadRequestException("Shop is already active");
    }

    return this.prisma.seller.update({
      where: { id: sellerId },
      data: { deleted_at: null },
    });
  }

  async hardDelete(sellerId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
    });
    if (!seller) throw new NotFoundException("Seller not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.product.deleteMany({ where: { seller_id: sellerId } });
      await tx.seller.delete({ where: { id: sellerId } });
    });

    return {
      message: "Seller and all associated products permanently deleted",
    };
  }

  async setVerification(sellerId: string, dto: UpdateVerificationDto) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
    });
    if (!seller) throw new NotFoundException("Seller not found");
    if (seller.deleted_at) {
      throw new BadRequestException("Cannot verify a soft‑deleted shop");
    }

    return this.prisma.seller.update({
      where: { id: sellerId },
      data: { verification_status: dto.status },
    });
  }

  async findAllAdmin(
    page: number = 1,
    limit: number = 20,
    statusFilter?: VerificationStatus,
    includeDeleted = false,
  ) {
    const where: any = {};
    if (!includeDeleted) {
      where.deleted_at = null;
    }
    if (statusFilter) {
      where.verification_status = statusFilter;
    }

    const skip = (page - 1) * limit;
    const [sellers, total] = await Promise.all([
      this.prisma.seller.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: { user: { select: { id: true, email: true, phone: true } } },
      }),
      this.prisma.seller.count({ where }),
    ]);

    return { data: sellers, total, page, limit };
  }

  async getStats() {
    const total = await this.prisma.seller.count();
    const newThisWeek = await this.prisma.seller.count({
      where: {
        created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    const byStatus = await this.prisma.seller.groupBy({
      by: ["verification_status"],
      _count: true,
    });

    const statusCounts = byStatus.reduce((acc, curr) => {
      acc[curr.verification_status] = curr._count;
      return acc;
    }, {});

    return {
      total,
      newThisWeek,
      byStatus: statusCounts,
    };
  }
}
