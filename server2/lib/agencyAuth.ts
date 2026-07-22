import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { agencyAccounts } from "@shared/schema";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    agencyId?: number;
  }
}

export async function hashAgencyPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyAgencyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export async function isAgencyAuthenticated(req: Request, res: Response, next: NextFunction): Promise<void> {
  const agencyId = req.session?.agencyId;
  if (!agencyId) {
    res.status(401).json({ error: "Agency authentication required" });
    return;
  }
  try {
    const [agency] = await db
      .select()
      .from(agencyAccounts)
      .where(eq(agencyAccounts.id, agencyId))
      .limit(1);
    if (!agency || !agency.active) {
      res.status(401).json({ error: "Agency authentication required" });
      return;
    }
    (req as any).agency = agency;
    next();
  } catch (err) {
    console.error("[agencyAuth] lookup failed:", err);
    res.status(401).json({ error: "Agency authentication required" });
  }
}
