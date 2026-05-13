// src/services/user/user.services.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { CreateUserDto, UpdateUserDto } from "../../dto/user.dto";
import * as bcrypt from "bcrypt";
import { PrismaService } from "src/prisma/prisma.service";
import { UserRole } from "@prisma/client";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Internal helpers ───────────────────────────────────
  buildUserProfile(user: any) {
    if (!user) return null;
    const { password_hash, ...safeUser } = user;
    // Extract shop ID from seller relation (if loaded)
    const shopId = safeUser.seller?.id ?? null;
    // Remove the raw seller object to keep the response clean
    delete safeUser.seller;
    return {
      ...safeUser,
      shopId,                 // sellers have a shopId or null
    };
  }

  private async findActiveById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  // ── Basic CRUD ─────────────────────────────────────────
  async create(data: {
    email: string;
    password_hash: string;
    phone?: string;
    role?: UserRole;
  }) {
    return this.prisma.user.create({ data });
  }

  // 👇 Updated: optional includeSeller to fetch seller id
  async findByEmail(email: string, includeSeller = false) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { seller: includeSeller ? { select: { id: true } } : false },
    });
  }

  async findAll(page = 1, limit = 20, includeDeleted = false) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (!includeDeleted) where.deleted_at = null;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      data: users.map((u) => this.buildUserProfile(u)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const user = await this.findActiveById(id);
    return this.buildUserProfile(user);
  }

  async findOneWithPassword(id: string) {
    return this.findActiveById(id);
  }

  async findMe(userId: string) {
    return this.findOne(userId);
  }

  async update(userId: string, dto: UpdateUserDto) {
    const user = await this.findActiveById(userId);
    const data: any = {};

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) throw new ConflictException("Email already in use");
      data.email = dto.email;
    }
    if (dto.password) data.password_hash = await bcrypt.hash(dto.password, 12);
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.theme !== undefined) data.theme = dto.theme;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.buildUserProfile(updated);
  }

  // ── Admin actions ──────────────────────────────────────
  async updateRole(adminId: string, targetUserId: string, newRole: UserRole) {
    if (adminId === targetUserId)
      throw new ForbiddenException("You cannot change your own role");

    const [target, adminCount] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: targetUserId } }),
      this.prisma.user.count({ where: { role: "ADMIN" } }),
    ]);
    if (!target) throw new NotFoundException("Target user not found");
    if (target.role === "ADMIN" && adminCount <= 1 && newRole !== "ADMIN") {
      throw new ForbiddenException("Cannot remove the last remaining admin");
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });
    return this.buildUserProfile(updated);
  }

  async remove(userId: string) {
    const user = await this.findActiveById(userId);
    await this.prisma.seller.updateMany({
      where: { user_id: userId, deleted_at: null },
      data: { deleted_at: new Date() },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { deleted_at: new Date() },
    });
    return { message: "Account disabled successfully" };
  }

  async adminRemove(targetUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { seller: true },
    });
    if (!user) throw new NotFoundException("User not found");

    await this.prisma.$transaction(async (tx) => {
      if (user.seller) {
        const products = await tx.product.findMany({
          where: { seller_id: user.seller.id },
          select: { id: true },
        });
        const productIds = products.map((p) => p.id);

        if (productIds.length > 0) {
          await tx.productImage.deleteMany({
            where: { product_id: { in: productIds } },
          });
        }
        await tx.product.deleteMany({
          where: { seller_id: user.seller.id },
        });
        await tx.seller.delete({
          where: { id: user.seller.id },
        });
      }
      await tx.productView.deleteMany({
        where: { user_id: targetUserId },
      });
      await tx.user.delete({
        where: { id: targetUserId },
      });
    });

    return { message: "User permanently deleted" };
  }

  async adminRestore(targetUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) throw new NotFoundException("User not found");
    if (!user.deleted_at) return { message: "User is already active" };
    await this.prisma.seller.updateMany({
      where: { user_id: targetUserId, deleted_at: { not: null } },
      data: { deleted_at: null },
    });
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { deleted_at: null },
    });
    return { message: "User restored successfully" };
  }

  async getUserStats() {
    const total = await this.prisma.user.count();
    const newThisWeek = await this.prisma.user.count({
      where: {
        created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    const byRole = await this.prisma.user.groupBy({
      by: ["role"],
      _count: true,
    });
    const roleCounts = byRole.reduce((acc, curr) => {
      acc[curr.role] = curr._count;
      return acc;
    }, {});
    return { total, newThisWeek, byRole: roleCounts };
  }
}