import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from 'src/services/auth/auth.service';
import { AuthController } from 'src/controllers/auth.controller';   // NEW
import { JwtAuthGuard } from 'src/services/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/services/auth/guards/roles.guard';
import { UserModule } from 'src/Modules/user.module';   // adjust path to your UserModule

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-key',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],   // NEW
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}