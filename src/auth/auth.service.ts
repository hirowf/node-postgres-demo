import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { LoginPayload, RegisterPayload } from "./auth.validation";
import { AuthRepository } from "./auth.repository";
import { env } from "config/env";
import { BadRequestError } from "errors/bad-request.error";
import { CookieOptions } from "express";
import { User } from "users/users.model";

export class AuthService {
  private authRepository = new AuthRepository();

  public async registerUser(payload: RegisterPayload) {
    // Check if email already exists
    const foundUser = await this.authRepository.findUserByEmail(payload.email);
    if (foundUser) {
      throw new BadRequestError("User with that email already exists");
    }

    const user = await this.authRepository.createUser({
      ...payload,
      password: await bcrypt.hash(payload.password, 10) // Hash password
    });
    if (!user) {
      throw new BadRequestError("Failed to create user");
    }

    return this.removePassword(user);
  }

  public async login(payload: LoginPayload) {
    const user = await this.authRepository.findUserByEmail(payload.email);
    if (!user) {
      throw new BadRequestError("Invalid email or password");
    }

    const isPasswordCorrect = await bcrypt.compare(payload.password, user.password);
    if (!isPasswordCorrect) {
      throw new BadRequestError("Invalid email or password");
    }

    return this.removePassword(user);
  }

  public async isLoggedIn(userId?: number) {
    if (!userId) return null;
    return this.authRepository.findUserById(userId);
  }

  public createToken(userId: number) {
    return jwt.sign({ _id: userId }, env.JWT_SECRET, { expiresIn: 60 * 60 });
  }

  public createCookieOptions(): CookieOptions {
    return {
      maxAge: 5 * 60 * 60 * 1000, // 5 hours
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    };
  }

  private removePassword(user: User) {
    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
