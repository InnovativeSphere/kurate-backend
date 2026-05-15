// src/services/auth/auth.service.ts

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Response } from "express";
import { CreateUserDto } from "../../dto/user.dto";
import { UserService } from "../user/user.services";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  // ✅ Production sends "none" (cross‑origin OK), dev sends "lax"
  private readonly COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
    path: "/",
  };

  private generateAccessToken(userId: string, role: string): string {
    return this.jwtService.sign({ sub: userId, role }, { expiresIn: "24h" });
  }

  private generateRefreshToken(userId: string): string {
    return this.jwtService.sign({ sub: userId }, { expiresIn: "7d" });
  }

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    response.cookie("access_token", accessToken, {
      ...this.COOKIE_OPTIONS,
      maxAge: 24 * 60 * 60 * 1000,   // 24 hours
    });
    response.cookie("refresh_token", refreshToken, {
      ...this.COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearAuthCookies(response: Response) {
    response.cookie("access_token", "", { ...this.COOKIE_OPTIONS, maxAge: 0 });
    response.cookie("refresh_token", "", { ...this.COOKIE_OPTIONS, maxAge: 0 });
  }

  async register(createUserDto: CreateUserDto, response: Response) {
    const existing = await this.userService.findByEmail(createUserDto.email);
    if (existing) {
      throw new ConflictException("Email already in use");
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);
    const user = await this.userService.create({
      ...createUserDto,
      password_hash: hashedPassword,
      password: undefined,
    } as any);

    const accessToken = this.generateAccessToken(user.id, user.role);
    const refreshToken = this.generateRefreshToken(user.id);
    this.setAuthCookies(response, accessToken, refreshToken);

    return this.userService.buildUserProfile(user);
  }

  async login(email: string, password: string, response: Response) {
    const user = await this.userService.findByEmail(email, true);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.deleted_at) {
      throw new UnauthorizedException("Account is disabled");
    }

    const accessToken = this.generateAccessToken(user.id, user.role);
    const refreshToken = this.generateRefreshToken(user.id);
    this.setAuthCookies(response, accessToken, refreshToken);

    return this.userService.buildUserProfile(user);
  }

  async refreshTokens(refreshToken: string, response: Response) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userService.findOne(payload.sub);
      if (!user || user.deleted_at) {
        throw new UnauthorizedException();
      }

      const newAccessToken = this.generateAccessToken(user.id, user.role);
      const newRefreshToken = this.generateRefreshToken(user.id);
      this.setAuthCookies(response, newAccessToken, newRefreshToken);

      return { message: "Tokens refreshed successfully" };
    } catch (error) {
      this.clearAuthCookies(response);
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async logout(response: Response) {
    this.clearAuthCookies(response);
    return { message: "Logged out successfully" };
  }
}