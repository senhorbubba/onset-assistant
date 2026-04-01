import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByWhatsappPhone(phone: string): Promise<User | undefined>;
  setUserWhatsappPhone(userId: string, phone: string | null): Promise<void>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByWhatsappPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.whatsappPhone, phone));
    return user;
  }

  async setUserWhatsappPhone(userId: string, phone: string | null): Promise<void> {
    await db.update(users).set({ whatsappPhone: phone, updatedAt: new Date() }).where(eq(users.id, userId));
  }
}

export const authStorage = new AuthStorage();
