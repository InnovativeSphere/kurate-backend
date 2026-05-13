import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── SELLER DASHBOARD ──────────────────────────────────

  /**
   * Returns the seller's shop summary and all their active products with view stats.
   */
  async getSellerDashboard(sellerId: string) {
    // 1. Fetch the seller profile to get shop info
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true, shop_name: true },
    });
    if (!seller) throw new NotFoundException('Seller not found');

    // 2. Get all active products of this seller
    const products = await this.prisma.product.findMany({
      where: { seller_id: sellerId, deleted_at: null },
      select: {
        id: true,
        name: true,
        description: true,
        price_in_cents: true,
        condition: true,
        stock_status: true,
      },
    });

    // 3. For each product, compute view stats
    const productStats = await Promise.all(
      products.map(async (product) => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [totalViews, viewsThisWeek, viewsThisMonth, lastView] =
          await Promise.all([
            this.prisma.productView.count({
              where: { product_id: product.id },
            }),
            this.prisma.productView.count({
              where: {
                product_id: product.id,
                viewed_at: { gte: weekAgo },
              },
            }),
            this.prisma.productView.count({
              where: {
                product_id: product.id,
                viewed_at: { gte: monthAgo },
              },
            }),
            this.prisma.productView.findFirst({
              where: { product_id: product.id },
              orderBy: { viewed_at: 'desc' },
              select: { viewed_at: true },
            }),
          ]);

        return {
          product_id: product.id,
          product_name: product.name,
          product_description: product.description,
          price_in_cents: product.price_in_cents,
          condition: product.condition,
          stock_status: product.stock_status,
          total_views: totalViews,
          views_this_week: viewsThisWeek,
          views_this_month: viewsThisMonth,
          last_viewed_at: lastView?.viewed_at ?? null,
        };
      }),
    );

    // 4. Aggregate totals
    const totalProductViews = productStats.reduce(
      (sum, p) => sum + p.total_views,
      0,
    );

    return {
      seller_id: seller.id,
      shop_name: seller.shop_name,
      total_products: products.length,
      total_product_views: totalProductViews,
      products: productStats,
    };
  }

  /**
   * Detailed stats for a single product (only if the seller owns it).
   */
  async getProductDetail(sellerId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { seller: { select: { id: true, shop_name: true } } },
    });
    if (!product || product.deleted_at) {
      throw new NotFoundException('Product not found');
    }
    if (product.seller.id !== sellerId) {
      throw new ForbiddenException('You can only view analytics for your own products');
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalViews, viewsThisWeek, viewsThisMonth, lastView] =
      await Promise.all([
        this.prisma.productView.count({ where: { product_id: productId } }),
        this.prisma.productView.count({
          where: { product_id: productId, viewed_at: { gte: weekAgo } },
        }),
        this.prisma.productView.count({
          where: { product_id: productId, viewed_at: { gte: monthAgo } },
        }),
        this.prisma.productView.findFirst({
          where: { product_id: productId },
          orderBy: { viewed_at: 'desc' },
          select: { viewed_at: true },
        }),
      ]);

    return {
      product_id: product.id,
      product_name: product.name,
      product_description: product.description,
      price_in_cents: product.price_in_cents,
      condition: product.condition,
      stock_status: product.stock_status,
      total_views: totalViews,
      views_this_week: viewsThisWeek,
      views_this_month: viewsThisMonth,
      last_viewed_at: lastView?.viewed_at ?? null,
    };
  }

  // ─── ADMIN OVERVIEW ────────────────────────────────────

  /**
   * Platform‑wide analytics: total views, daily breakdown, top products.
   */
  async getAdminOverview() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalProducts,
      totalViews,
      totalSellers,
      viewsToday,
      viewsThisWeek,
    ] = await Promise.all([
      this.prisma.product.count({ where: { deleted_at: null } }),
      this.prisma.productView.count(),
      this.prisma.seller.count(),
      this.prisma.productView.count({
        where: { viewed_at: { gte: todayStart } },
      }),
      this.prisma.productView.count({
        where: { viewed_at: { gte: weekAgo } },
      }),
    ]);

    // Views per day for the last 7 days
    const viewsPerDayRaw = await this.prisma.$queryRawUnsafe<
      Array<{ date: string; count: bigint }>
    >(
      `SELECT
         DATE(viewed_at) AS date,
         COUNT(*)::int AS count
       FROM product_views
       WHERE viewed_at >= $1
       GROUP BY DATE(viewed_at)
       ORDER BY date DESC
       LIMIT 7`,
      weekAgo,
    );
    const viewsPerDay = viewsPerDayRaw.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }));

    // Top 5 most viewed products
    const topProductsRaw = await this.prisma.$queryRawUnsafe<
      Array<{
        product_id: string;
        product_name: string;
        shop_name: string;
        total_views: bigint;
      }>
    >(
      `SELECT
         p.id AS product_id,
         p.name AS product_name,
         s.shop_name,
         COUNT(pv.id) AS total_views
       FROM products p
       JOIN product_views pv ON pv.product_id = p.id
       JOIN sellers s ON s.id = p.seller_id
       WHERE p.deleted_at IS NULL
       GROUP BY p.id, p.name, s.shop_name
       ORDER BY total_views DESC
       LIMIT 5`,
    );
    const topProducts = topProductsRaw.map((row) => ({
      product_id: row.product_id,
      product_name: row.product_name,
      shop_name: row.shop_name,
      total_views: Number(row.total_views),
    }));

    return {
      total_products: totalProducts,
      total_views: totalViews,
      total_sellers: totalSellers,
      views_today: viewsToday,
      views_this_week: viewsThisWeek,
      views_per_day: viewsPerDay,
      top_products: topProducts,
    };
  }
}