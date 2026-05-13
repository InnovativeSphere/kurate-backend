import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersController } from 'src/controllers/user.controller';
import { UserService } from 'src/services/user/user.services';


@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-key',
      // This JwtModule is needed for JwtAuthGuard when used in UserController
    }),
  ],
  controllers: [UsersController],
  providers: [UserService],
  exports: [UserService], // so AuthModule can access it
})
export class UserModule {}