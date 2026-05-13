// src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth.module";
import { UserModule } from "./modules/user.module";
import { PrismaModule } from "./prisma/prisma.module";
import { CategoryModule } from "./Modules/category.module";
import { SellerModule } from "./modules/seller.module";
import { ProductModule } from "./modules/product.module";
import { AnalyticsModule } from "./modules/analytics.module";
import { CloudinaryModule } from "./modules/cloudinary.module";
import { UploadModule } from "./cloudinary/upload.module";
import { WishlistModule } from "./modules/wishlist.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, // global – no extra import needed elsewhere
    AuthModule, // provides guards, JWT config
    UserModule, // user endpoints + service
    CategoryModule,
    SellerModule,
    ProductModule,
    AnalyticsModule,
    CloudinaryModule,
    UploadModule,
    WishlistModule
  ],
})
export class AppModule {}
