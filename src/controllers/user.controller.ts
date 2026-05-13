import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { UserService } from "src/services/user/user.services";
import { JwtAuthGuard } from "src/services/auth/guards/jwt-auth.guard";
import { UpdateUserDto } from "src/dto/user.dto";
import { RolesGuard } from "src/services/auth/guards/roles.guard";
import { Roles } from "src/services/auth/decorators/roles.decorator";
import {
  CurrentUser,
  JwtUserPayload,
} from "src/services/auth/decorators/current-user.decorator";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly userService: UserService) {}

  // ── PROFILE ──
  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get current user profile" })
  async getProfile(@CurrentUser() user: JwtUserPayload) {
    return this.userService.findMe(user.id);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update current user profile" })
  async updateProfile(
    @CurrentUser() user: JwtUserPayload,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(user.id, updateUserDto);
  }

  @Delete("me")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Disable own account (soft delete)" })
  async deleteProfile(@CurrentUser() user: JwtUserPayload) {
    return this.userService.remove(user.id);
  }

  // ── ADMIN ──
  @Get("stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get user statistics (admin only)" })
  async getUserStats() {
    return this.userService.getUserStats();
  }

  // ✅ Only one @Get() decorator for listing users
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "List all users (admin only)" })
  async findAll(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("includeDeleted") includeDeleted?: string,
  ) {
    return this.userService.findAll(page, limit, includeDeleted === "true");
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get any user by ID (admin only)" })
  async findOne(@Param("id") id: string) {
    return this.userService.findOne(id);
  }

  @Patch(":id/role")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Change user role (admin only)" })
  async updateRole(
    @CurrentUser() user: JwtUserPayload,
    @Param("id") targetUserId: string,
    @Body("role") newRole: UserRole,
  ) {
    return this.userService.updateRole(user.id, targetUserId, newRole);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Soft delete a user (admin) – can be restored" })
  async disableUser(@Param("id") targetUserId: string) {
    return this.userService.remove(targetUserId); // soft delete
  }

  @Delete(":id/permanent")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Permanently delete a user (admin) – irreversible" })
  async hardDeleteUser(@Param("id") targetUserId: string) {
    return this.userService.adminRemove(targetUserId); // hard delete
  }

  @Post(":id/restore")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Restore a soft-deleted user (admin only)" })
  async adminRestore(@Param("id") targetUserId: string) {
    return this.userService.adminRestore(targetUserId);
  }

  @Get("debug/me")
  @UseGuards(JwtAuthGuard)
  async debugMe(@CurrentUser() user: any) {
    return user;
  }
}
