import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface UserWithPassword extends UserProfile {
  password: string;
}

const profileSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<UserProfile | null> {
    return this.prisma.client.user.findUnique({
      where: { id },
      select: profileSelect,
    });
  }

  findByEmail(email: string): Promise<UserWithPassword | null> {
    return this.prisma.client.user.findUnique({
      where: { email },
      select: { ...profileSelect, password: true },
    });
  }

  create(data: {
    email: string;
    password: string;
    name: string;
  }): Promise<UserProfile> {
    return this.prisma.client.user.create({
      data,
      select: profileSelect,
    });
  }

  updateProfile(id: string, data: { name?: string }): Promise<UserProfile> {
    return this.prisma.client.user.update({
      where: { id },
      data,
      select: profileSelect,
    });
  }
}
