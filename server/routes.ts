import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { randomBytes } from "crypto";
import sgMail from "@sendgrid/mail";
import { z } from "zod";
import { Duffel } from "@duffel/api";
import * as bland from "./lib/bland";
import { getUncachableStripeClient, getStripePublishableKey } from "./lib/stripeClient";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

function getBaseUrl(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (host) return `${proto}://${host}`;
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return `http://localhost:${process.env.PORT || 5000}`;
}

async function sendVerificationEmail(email: string, token: string, baseUrl: string) {
  const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";

  try {
    await sgMail.send({
      to: email,
      from: { email: fromEmail, name: "Travnr" },
      subject: "Verify your Travnr email",
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #2d7abf; font-size: 28px; margin: 0;">Travnr</h1>
          </div>
          <h2 style="font-size: 22px; color: #1a1a2e; margin-bottom: 16px;">Verify your email</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Thanks for signing up for Travnr! Click the button below to verify your email address and get started.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${verifyUrl}" style="background-color: #2d7abf; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Verify My Email</a>
          </div>
          <p style="color: #999; font-size: 13px; line-height: 1.5;">
            If you didn't create a Travnr account, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("SendGrid error:", error);
  }
}

async function sendPasswordResetEmail(email: string, token: string, baseUrl: string) {
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";

  try {
    await sgMail.send({
      to: email,
      from: { email: fromEmail, name: "Travnr" },
      subject: "Reset your Travnr password",
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #2d7abf; font-size: 28px; margin: 0;">Travnr</h1>
          </div>
          <h2 style="font-size: 22px; color: #1a1a2e; margin-bottom: 16px;">Reset your password</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            We received a request to reset your password. Click the button below to choose a new password. This link will expire in 1 hour.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${resetUrl}" style="background-color: #2d7abf; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Reset My Password</a>
          </div>
          <p style="color: #999; font-size: 13px; line-height: 1.5;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("SendGrid password reset email error:", error);
  }
}

async function sendAccountCreationEmail(email: string, name: string, callbackRequestId: number, baseUrl: string) {
  const signUpUrl = `${baseUrl}/auth?email=${encodeURIComponent(email)}`;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";

  try {
    await sgMail.send({
      to: email,
      from: { email: fromEmail, name: "Travnr" },
      subject: "Your Travnr concierge call is complete — create your account",
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #2d7abf; font-size: 28px; margin: 0;">Travnr</h1>
          </div>
          <h2 style="font-size: 22px; color: #1a1a2e; margin-bottom: 16px;">Thanks for chatting with us${name ? `, ${name}` : ""}!</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
            Your concierge call has been completed. We're putting together a personalized travel proposal based on our conversation.
          </p>
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Create your free Travnr account to view your call results, travel proposals, and manage future bookings — all in one place.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${signUpUrl}" style="background-color: #2d7abf; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Create My Account</a>
          </div>
          <p style="color: #999; font-size: 13px; line-height: 1.5;">
            If you didn't request a concierge call from Travnr, you can safely ignore this email.
          </p>
        </div>
      `,
    });
    console.log(`Account creation email sent to ${email} for callback request ${callbackRequestId}`);
  } catch (error) {
    console.error("SendGrid account creation email error:", error);
  }
}

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  const registerSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const callRequestBodySchema = z.object({
    phone: z.string().optional().default(""),
    notes: z.string().optional().default(""),
  });

  const callbackBodySchema = z.object({
    name: z.string().optional().default(""),
    phone: z.string().min(1, "Phone is required"),
    email: z.string().email("Invalid email"),
  });

  // AUTH ROUTES
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { email, password, firstName, lastName } = parsed.data;
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      const verificationToken = randomBytes(32).toString("hex");
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        verificationToken,
      });
      await sendVerificationEmail(email, verificationToken, getBaseUrl(req));

      const callbackReqs = await storage.getCallbackRequestsByEmail(email);
      if (callbackReqs.length > 0) {
        const cb = callbackReqs[0];
        if (cb.phone) {
          await storage.upsertProfile(user.id, {
            name: `${firstName} ${lastName}`,
            phone: cb.phone,
          });
        }

        if (cb.status === "completed" && cb.transcript) {
          try {
            const callRequest = await storage.createCallRequest({
              userId: user.id,
              phone: cb.phone,
              destination: "",
              tripType: "flight",
            });
            await storage.updateCallRequest(callRequest.id, { status: "completed" });

            await storage.createBlandCall({
              callRequestId: callRequest.id,
              userId: user.id,
              phoneNumber: cb.phone,
              blandCallId: cb.blandCallId || undefined,
              status: "completed",
              transcript: cb.transcript,
              summary: cb.summary || undefined,
              recordingUrl: cb.recordingUrl || undefined,
            });

            generateProposalFromCall(callRequest.id, user.id, cb.summary || null, cb.transcript || null).catch((err: any) => {
              console.error("Proposal generation for callback user failed:", err);
            });
          } catch (err) {
            console.error("Failed to link callback call data to new user:", err);
          }
        }

        await storage.createNotification({
          userId: user.id,
          type: "welcome",
          title: "Welcome to Travnr!",
          body: "Your concierge call results have been linked to your account. Check your call history and proposals.",
          linkUrl: "/call-history",
        });
      }

      const { password: _, verificationToken: __, ...safeUser } = user;
      return res.json({ ...safeUser, needsVerification: true });
    } catch (error: any) {
      console.error("Register error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const { email, password } = parsed.data;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      if (!user.emailVerified) {
        return res.status(403).json({ message: "Please verify your email before logging in" });
      }
      req.session.userId = user.id;
      const { password: _, verificationToken: __, ...safeUser } = user;
      return res.json(safeUser);
    } catch (error: any) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/user", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const { password: _, verificationToken: __, ...safeUser } = user;
    return res.json(safeUser);
  });

  app.get("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;
      if (!token) return res.redirect("/auth?verifyError=missing");
      const user = await storage.getUserByVerificationToken(token);
      if (!user) return res.redirect("/auth?verifyError=invalid");
      await storage.updateUser(user.id, { emailVerified: true, verificationToken: null });
      return res.redirect("/auth?verified=true");
    } catch (error) {
      console.error("Email verification error:", error);
      return res.redirect("/auth?verifyError=server");
    }
  });

  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.emailVerified) return res.status(400).json({ message: "Email already verified" });
    const newToken = randomBytes(32).toString("hex");
    await storage.updateUser(user.id, { verificationToken: newToken });
    await sendVerificationEmail(email, newToken, getBaseUrl(req));
    return res.json({ message: "Verification email sent" });
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If an account with that email exists, we've sent a password reset link." });
      }
      const resetToken = randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });
      await sendPasswordResetEmail(email, resetToken, getBaseUrl(req));
      return res.json({ message: "If an account with that email exists, we've sent a password reset link." });
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ message: "Token and new password are required" });
      if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
      const user = await storage.getUserByResetToken(token);
      if (!user) return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
      if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });
      return res.json({ message: "Password has been reset successfully. You can now log in." });
    } catch (error) {
      console.error("Reset password error:", error);
      return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // PROFILE
  app.get("/api/profile", isAuthenticated, async (req: Request, res: Response) => {
    const profile = await storage.getProfile(req.session.userId!);
    if (!profile) return res.status(404).json({ message: "No profile found" });
    return res.json(profile);
  });

  app.post("/api/profile", isAuthenticated, async (req: Request, res: Response) => {
    const profile = await storage.upsertProfile(req.session.userId!, req.body);
    return res.json(profile);
  });

  // CALL REQUESTS
  app.get("/api/call-requests", isAuthenticated, async (req: Request, res: Response) => {
    const requests = await storage.getCallRequests(req.session.userId!);
    return res.json(requests);
  });

  app.post("/api/call-requests", isAuthenticated, async (req: Request, res: Response) => {
    const parsed = callRequestBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
    }
    let phone = parsed.data.phone || "";
    if (!phone) {
      const userProfile = await storage.getTravelerProfile(req.session.userId!);
      if (userProfile?.phone) {
        phone = userProfile.phone;
      }
    }
    phone = phone.replace(/\s+/g, "");
    if (phone && !phone.startsWith("+")) {
      phone = `+${phone}`;
    }
    const cr = await storage.createCallRequest({
      ...parsed.data,
      tripType: "flight",
      destination: "",
      phone,
      userId: req.session.userId!,
    });
    await storage.createNotification({
      userId: req.session.userId!,
      type: "call_request",
      title: "Call request submitted",
      body: "Your call request has been submitted.",
      linkUrl: "/call-history",
    });

    if (bland.isConfigured() && cr.phone) {
      const user = await storage.getUser(req.session.userId!);
      if (user) {
        try {
          const baseUrl = getBaseUrl(req);
          console.log(`Dispatching Bland AI call for user ${user.id}, phone: ${cr.phone}`);
          const task = bland.buildTravelConciergePrompt({
            userName: `${user.firstName} ${user.lastName}`,
            notes: cr.notes,
          });

          const blandCall = await storage.createBlandCall({
            callRequestId: cr.id,
            userId: user.id,
            phoneNumber: cr.phone,
            status: "queued",
          });

          const result = await bland.dispatchCall({
            phoneNumber: cr.phone,
            task,
            webhookUrl: `${baseUrl}/api/bland/webhook`,
            dynamicDataUrl: `${baseUrl}/api/bland/dynamic-data`,
            dynamicDataHeaders: { "x-bland-secret": process.env.BLAND_AI_API_KEY || "" },
            metadata: {
              callRequestId: cr.id,
              userId: user.id,
              blandCallDbId: blandCall.id,
            },
            record: true,
          });

          await storage.updateBlandCall(blandCall.id, {
            blandCallId: result.callId,
            status: "queued",
          });
          await storage.updateCallRequest(cr.id, { status: "scheduled" });
          console.log(`Bland AI call dispatched: ${result.callId} for call request ${cr.id}`);
        } catch (err: any) {
          console.error("Bland AI auto-dispatch error:", err.message || err);
        }
      }
    }

    return res.json(cr);
  });

  // PROPOSALS
  const createProposalSchema = z.object({
    title: z.string().min(1, "Title is required"),
    summary: z.string().optional().nullable(),
    callRequestId: z.number().optional().nullable(),
    items: z.array(z.object({
      type: z.enum(["flight", "hotel", "other"]),
      description: z.string().min(1),
      priceEstimate: z.union([z.string(), z.number()]).transform(v => String(v)),
      duffelOfferId: z.string().optional().nullable(),
      duffelOfferData: z.any().optional().nullable(),
    })).min(1, "At least one item is required"),
  });

  app.post("/api/proposals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const parsed = createProposalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid proposal data" });
      }
      const { title, summary, items, callRequestId } = parsed.data;

      let totalEstimate = 0;
      for (const item of items) {
        totalEstimate += parseFloat(item.priceEstimate) || 0;
      }

      const proposal = await storage.createProposal({
        userId: req.session.userId!,
        callRequestId: callRequestId || null,
        title,
        summary: summary || null,
        totalEstimate: totalEstimate.toFixed(2),
        status: "sent",
      });

      for (const item of items) {
        await storage.createProposalItem({
          proposalId: proposal.id,
          type: item.type,
          description: item.description,
          priceEstimate: parseFloat(item.priceEstimate).toFixed(2),
          duffelOfferId: item.duffelOfferId || null,
          duffelOfferData: item.duffelOfferData || null,
        });
      }

      await storage.createNotification({
        userId: req.session.userId!,
        type: "proposal_received",
        title: "New travel proposal",
        body: `Your proposal "${title}" is ready for review.`,
        linkUrl: `/proposals/${proposal.id}`,
      });

      const createdItems = await storage.getProposalItems(proposal.id);
      return res.json({ ...proposal, items: createdItems, payments: [] });
    } catch (err: any) {
      console.error("Create proposal error:", err);
      return res.status(500).json({ message: err.message || "Failed to create proposal" });
    }
  });

  app.get("/api/proposals", isAuthenticated, async (req: Request, res: Response) => {
    const proposals = await storage.getProposals(req.session.userId!);
    return res.json(proposals);
  });

  app.get("/api/proposals/:id", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const proposal = await storage.getProposal(id);
    if (!proposal || proposal.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    const items = await storage.getProposalItems(id);
    const proposalPayments = await storage.getPaymentsByProposal(id);
    return res.json({ ...proposal, items, payments: proposalPayments });
  });

  app.post("/api/proposals/:id/approve", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const proposal = await storage.getProposal(id);
    if (!proposal || proposal.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    if (proposal.status !== "sent") {
      return res.status(400).json({ message: "Proposal cannot be approved" });
    }
    const updated = await storage.updateProposal(id, { status: "approved" });
    await storage.createNotification({
      userId: req.session.userId!,
      type: "proposal_approved",
      title: "Proposal approved",
      body: `You approved "${proposal.title}".`,
      linkUrl: `/proposals/${id}`,
    });
    return res.json(updated);
  });

  app.post("/api/proposals/:id/pay", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const proposal = await storage.getProposal(id);
    if (!proposal || proposal.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    if (proposal.status !== "approved") {
      return res.status(400).json({ message: "Proposal must be approved before payment" });
    }
    const payment = await storage.createPayment({
      userId: req.session.userId!,
      proposalId: id,
      stripeCheckoutSessionId: `cs_demo_${Date.now()}`,
      stripePaymentIntentId: `pi_demo_${Date.now()}`,
      amount: proposal.totalEstimate,
      currency: "usd",
      status: "paid",
    });
    await storage.createNotification({
      userId: req.session.userId!,
      type: "payment_confirmed",
      title: "Payment confirmed",
      body: `Payment of $${Number(proposal.totalEstimate).toLocaleString()} for "${proposal.title}" was successful.`,
      linkUrl: `/proposals/${id}`,
    });
    return res.json(payment);
  });

  // NOTIFICATIONS
  app.get("/api/notifications", isAuthenticated, async (req: Request, res: Response) => {
    const notifs = await storage.getNotifications(req.session.userId!);
    return res.json(notifs);
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req: Request, res: Response) => {
    await storage.markAllNotificationsRead(req.session.userId!);
    return res.json({ message: "All marked as read" });
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const notif = await storage.getNotification(id);
    if (!notif || notif.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Notification not found" });
    }
    await storage.markNotificationRead(id);
    return res.json({ message: "Marked as read" });
  });

  // PAYMENTS
  app.get("/api/payments", isAuthenticated, async (req: Request, res: Response) => {
    const pymts = await storage.getPayments(req.session.userId!);
    return res.json(pymts);
  });

  // SAVED CARDS
  app.get("/api/saved-cards", isAuthenticated, async (req: Request, res: Response) => {
    const cards = await storage.getSavedCards(req.session.userId!);
    return res.json(cards);
  });

  app.post("/api/saved-cards", isAuthenticated, async (req: Request, res: Response) => {
    const { cardBrand, lastFour, expiryMonth, expiryYear, cardholderName, isDefault } = req.body;
    if (!lastFour || !expiryMonth || !expiryYear || !cardholderName) {
      return res.status(400).json({ message: "Card details are required" });
    }
    const card = await storage.createSavedCard({
      userId: req.session.userId!,
      cardBrand: cardBrand || "visa",
      lastFour,
      expiryMonth,
      expiryYear,
      cardholderName,
      isDefault: isDefault ?? true,
    });
    return res.json(card);
  });

  app.delete("/api/saved-cards/:id", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    await storage.deleteSavedCard(id, req.session.userId!);
    return res.json({ message: "Card removed" });
  });

  app.post("/api/saved-cards/:id/default", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    await storage.setDefaultCard(id, req.session.userId!);
    return res.json({ message: "Default card updated" });
  });

  // DUFFEL FLIGHT SEARCH & BOOKING
  const duffelToken = process.env.DUFFEL_API_TOKEN;
  const duffel = duffelToken
    ? new Duffel({ token: duffelToken })
    : null;
  const isTestMode = false;

  app.get("/api/duffel/config", isAuthenticated, async (_req: Request, res: Response) => {
    return res.json({ testMode: isTestMode });
  });

  app.get("/api/duffel/places", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Duffel is not configured" });
    try {
      const query = req.query.query as string;
      if (!query || query.length < 2) {
        return res.json({ places: [] });
      }
      const response = await duffel.suggestions.list({ query });
      const places = (response.data || []).map((place: any) => ({
        id: place.id,
        iataCode: place.iata_code,
        name: place.name,
        cityName: place.city_name || place.city?.name,
        countryName: place.country_name,
        type: place.type,
        icaoCode: place.icao_code,
        latitude: place.latitude,
        longitude: place.longitude,
      }));
      return res.json({ places });
    } catch (err: any) {
      console.error("Duffel places error:", err?.errors || err);
      return res.status(500).json({ message: "Failed to search airports" });
    }
  });

  app.post("/api/duffel/component-client-key", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffelToken) return res.status(503).json({ message: "Duffel is not configured" });
    try {
      const response = await fetch("https://api.duffel.com/identity/component_client_keys", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${duffelToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Duffel-Version": "v2",
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        console.error("Duffel client key error:", errBody);
        return res.status(response.status).json({ message: errBody?.errors?.[0]?.message || "Failed to create client key" });
      }
      const data = await response.json();
      return res.json({ clientKey: data.data.component_client_key });
    } catch (err: any) {
      console.error("Duffel client key error:", err);
      return res.status(500).json({ message: "Failed to create client key" });
    }
  });

  app.post("/api/duffel/book-direct", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Duffel is not configured" });
    try {
      const { offerId, passengers, cardId, threeDSecureSessionId, useBalance } = req.body;
      if (!offerId) return res.status(400).json({ message: "Offer ID is required" });
      if (!useBalance && !cardId) return res.status(400).json({ message: "Payment method is required (card or balance)" });

      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      const offer = await duffel.offers.get(offerId);
      const fullOffer = offer.data as any;

      const passengerMappings = (fullOffer.passengers || []).map((p: any, idx: number) => {
        const pax = passengers?.[idx] || passengers?.[0] || {};
        return {
          id: p.id,
          given_name: pax.givenName || user.firstName,
          family_name: pax.familyName || user.lastName,
          born_on: pax.bornOn || "1990-01-01",
          email: user.email,
          phone_number: pax.phone || "+10000000000",
          title: pax.title || "mr",
          gender: pax.gender || "m",
        };
      });

      let paymentObj: any;
      if (useBalance) {
        paymentObj = {
          type: "balance",
          amount: fullOffer.total_amount,
          currency: fullOffer.total_currency,
        };
      } else {
        paymentObj = {
          type: "card",
          amount: fullOffer.total_amount,
          currency: fullOffer.total_currency,
        };
        if (threeDSecureSessionId) {
          paymentObj.three_d_secure_session_id = threeDSecureSessionId;
        }
      }

      const orderPayload: any = {
        selected_offers: [offerId],
        passengers: passengerMappings,
        type: "instant",
        payments: [paymentObj],
      };
      if (cardId) {
        orderPayload.metadata = { card_id: cardId };
      }

      const order = await duffel.orders.create(orderPayload);
      const orderData = order.data as any;

      const payment = await storage.createPayment({
        userId: req.session.userId!,
        proposalId: null,
        duffelOrderId: orderData.id,
        duffelBookingRef: orderData.booking_reference,
        amount: orderData.total_amount || fullOffer.total_amount,
        currency: (orderData.total_currency || "usd").toLowerCase(),
        status: "paid",
      });

      await storage.createNotification({
        userId: req.session.userId!,
        type: "payment_confirmed",
        title: "Flight booked!",
        body: `Your flight has been booked. Booking reference: ${orderData.booking_reference}`,
        linkUrl: `/billing`,
      });

      return res.json({
        booking: {
          payment,
          bookingReference: orderData.booking_reference,
          orderId: orderData.id,
        },
      });
    } catch (err: any) {
      console.error("Duffel direct booking error:", err?.errors || err);
      return res.status(500).json({ message: err?.errors?.[0]?.message || "Booking failed" });
    }
  });

  app.post("/api/duffel/search", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Duffel is not configured" });
    try {
      const { origin, destination, departureDate, returnDate, passengers, cabinClass } = req.body;
      if (!origin || !destination || !departureDate) {
        return res.status(400).json({ message: "Origin, destination, and departure date are required" });
      }

      const slices: any[] = [{ origin, destination, departure_date: departureDate }];
      if (returnDate) {
        slices.push({ origin: destination, destination: origin, departure_date: returnDate });
      }

      const passengerList = passengers || [{ type: "adult" as const }];

      const offerRequest = await duffel.offerRequests.create({
        slices,
        passengers: passengerList,
        cabin_class: cabinClass || "economy",
        return_offers: true,
      });

      const offers = (offerRequest.data as any).offers || [];
      const simplified = offers.slice(0, 20).map((offer: any) => ({
        id: offer.id,
        totalAmount: offer.total_amount,
        totalCurrency: offer.total_currency,
        expiresAt: offer.expires_at,
        owner: offer.owner,
        slices: offer.slices?.map((slice: any) => ({
          id: slice.id,
          duration: slice.duration,
          origin: { iata: slice.origin?.iata_code, name: slice.origin?.name, city: slice.origin?.city_name },
          destination: { iata: slice.destination?.iata_code, name: slice.destination?.name, city: slice.destination?.city_name },
          segments: slice.segments?.map((seg: any) => ({
            id: seg.id,
            departingAt: seg.departing_at,
            arrivingAt: seg.arriving_at,
            origin: { iata: seg.origin?.iata_code, name: seg.origin?.name },
            destination: { iata: seg.destination?.iata_code, name: seg.destination?.name },
            carrier: {
              name: seg.marketing_carrier?.name,
              iata: seg.marketing_carrier?.iata_code,
              logoUrl: seg.marketing_carrier?.logo_symbol_url || seg.marketing_carrier?.logo_lockup_url,
            },
            flightNumber: seg.marketing_carrier_flight_number,
            aircraft: seg.aircraft?.name,
            cabinClass: seg.passengers?.[0]?.cabin_class_marketing_name || seg.passengers?.[0]?.cabin_class,
            baggages: seg.passengers?.[0]?.baggages,
          })),
        })),
        passengers: offer.passengers,
        passengerIdentityDocumentsRequired: offer.passenger_identity_documents_required ?? false,
      }));

      return res.json({ offers: simplified });
    } catch (err: any) {
      console.error("Duffel search error:", err?.errors || err);
      return res.status(500).json({ message: err?.errors?.[0]?.message || "Flight search failed" });
    }
  });

  app.get("/api/duffel/offers/:offerId", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Duffel is not configured" });
    try {
      const offer = await duffel.offers.get(req.params.offerId);
      return res.json(offer.data);
    } catch (err: any) {
      console.error("Duffel offer fetch error:", err?.errors || err);
      return res.status(500).json({ message: err?.errors?.[0]?.message || "Failed to fetch offer" });
    }
  });

  app.post("/api/duffel/search-for-passengers", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Duffel is not configured" });
    try {
      const { origin, destination, departureDate, returnDate, cabinClass, passengerCount } = req.body;
      if (!origin || !destination || !departureDate || !passengerCount) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const count = Math.max(1, Math.min(9, parseInt(passengerCount)));
      const slices: any[] = [{ origin, destination, departure_date: departureDate }];
      if (returnDate) slices.push({ origin: destination, destination: origin, departure_date: returnDate });
      const passengerList = Array.from({ length: count }, () => ({ type: "adult" as const }));
      const offerRequest = await duffel.offerRequests.create({
        slices,
        passengers: passengerList,
        cabin_class: cabinClass || "economy",
        return_offers: true,
      });
      const offers = ((offerRequest.data as any).offers || []).sort(
        (a: any, b: any) => parseFloat(a.total_amount) - parseFloat(b.total_amount)
      );
      if (offers.length === 0) {
        return res.status(404).json({ message: "No flights available for that passenger count" });
      }
      const best = offers[0];
      const simplified = {
        id: best.id,
        totalAmount: best.total_amount,
        totalCurrency: best.total_currency,
        expiresAt: best.expires_at,
        owner: best.owner,
        slices: best.slices?.map((slice: any) => ({
          id: slice.id,
          duration: slice.duration,
          origin: { iata: slice.origin?.iata_code, name: slice.origin?.name, city: slice.origin?.city_name },
          destination: { iata: slice.destination?.iata_code, name: slice.destination?.name, city: slice.destination?.city_name },
          segments: slice.segments?.map((seg: any) => ({
            id: seg.id,
            departingAt: seg.departing_at,
            arrivingAt: seg.arriving_at,
            origin: { iata: seg.origin?.iata_code, name: seg.origin?.name },
            destination: { iata: seg.destination?.iata_code, name: seg.destination?.name },
            carrier: {
              name: seg.marketing_carrier?.name,
              iata: seg.marketing_carrier?.iata_code,
              logoUrl: seg.marketing_carrier?.logo_symbol_url || seg.marketing_carrier?.logo_lockup_url,
            },
            flightNumber: seg.marketing_carrier_flight_number,
            aircraft: seg.aircraft?.name,
            cabinClass: seg.passengers?.[0]?.cabin_class_marketing_name || seg.passengers?.[0]?.cabin_class,
            baggages: seg.passengers?.[0]?.baggages,
          })),
        })),
        passengers: best.passengers,
      };
      return res.json({ offer: simplified });
    } catch (err: any) {
      console.error("Duffel search-for-passengers error:", err?.errors || err);
      return res.status(500).json({ message: err?.errors?.[0]?.message || "Flight search failed" });
    }
  });

  app.post("/api/proposals/:id/book-duffel", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Duffel is not configured" });
    const proposalId = parseInt(req.params.id);
    const proposal = await storage.getProposal(proposalId);
    if (!proposal || proposal.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    if (proposal.status !== "approved") {
      return res.status(400).json({ message: "Proposal must be approved before booking" });
    }

    try {
      const items = await storage.getProposalItems(proposalId);
      const flightItems = items.filter((i) => i.duffelOfferId && i.duffelOfferData);

      if (flightItems.length === 0) {
        return res.status(400).json({ message: "No Duffel flight offers attached to this proposal" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { passengers, cardId, itemId } = req.body;

      if (!cardId) {
        return res.status(400).json({ message: "Card payment is required. Please provide card details." });
      }

      if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
        return res.status(400).json({ message: "Passenger details are required" });
      }

      const selectedItem = itemId
        ? flightItems.find(i => i.id === itemId)
        : flightItems[0];

      if (!selectedItem) {
        return res.status(400).json({ message: "Selected flight offer not found" });
      }

      const offerData = selectedItem.duffelOfferData as any;
      const expectedPassengerCount = offerData.passengers?.length || 1;

      if (passengers.length !== expectedPassengerCount) {
        return res.status(400).json({
          message: `Expected ${expectedPassengerCount} passenger(s) but received ${passengers.length}`,
        });
      }

      const offerPassengerIds = offerData.passengers?.map((p: any) => p.id) || [];
      const passengerMappings = passengers.map((p: any, idx: number) => ({
        id: offerPassengerIds[idx] || undefined,
        given_name: p.givenName,
        family_name: p.familyName,
        born_on: p.bornOn,
        email: user.email,
        phone_number: p.phone,
        title: p.title,
        gender: p.gender,
      }));

      const amount = offerData.totalAmount || selectedItem.priceEstimate;
      const currency = offerData.totalCurrency || "USD";

      const order = await duffel.orders.create({
        selected_offers: [selectedItem.duffelOfferId!],
        passengers: passengerMappings,
        type: "instant",
        payments: [{
          type: "card" as any,
          card_id: cardId,
          amount: String(amount),
          currency,
        }],
      });

      const orderData = order.data as any;
      const payment = await storage.createPayment({
        userId: req.session.userId!,
        proposalId,
        duffelOrderId: orderData.id,
        duffelBookingRef: orderData.booking_reference,
        amount: orderData.total_amount || selectedItem.priceEstimate,
        currency: (orderData.total_currency || "usd").toLowerCase(),
        status: "paid",
      });

      const result = {
        payment,
        bookingReference: orderData.booking_reference,
        orderId: orderData.id,
      };

      await storage.updateProposal(proposalId, { status: "approved" });

      await storage.createNotification({
        userId: req.session.userId!,
        type: "payment_confirmed",
        title: "Flight booked!",
        body: `Your flight for "${proposal.title}" has been booked. Reference: ${result.bookingReference}`,
        linkUrl: `/proposals/${proposalId}`,
      });

      return res.json({ bookings: [result] });
    } catch (err: any) {
      console.error("Duffel booking error:", err?.errors || err);
      return res.status(500).json({ message: err?.errors?.[0]?.message || "Booking failed" });
    }
  });

  // ==================== BLAND AI INTEGRATION ====================

  app.get("/api/bland/config", isAuthenticated, async (_req: Request, res: Response) => {
    return res.json({ configured: bland.isConfigured() });
  });

  app.get("/api/bland/calls", isAuthenticated, async (req: Request, res: Response) => {
    const calls = await storage.getBlandCalls(req.session.userId!);
    return res.json(calls);
  });

  app.get("/api/bland/calls/:callRequestId", isAuthenticated, async (req: Request, res: Response) => {
    const callRequestId = parseInt(req.params.callRequestId);
    if (isNaN(callRequestId)) return res.status(400).json({ message: "Invalid call request ID" });
    const callRequest = await storage.getCallRequest(callRequestId);
    if (!callRequest || callRequest.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Call request not found" });
    }
    const calls = await storage.getBlandCallsByCallRequest(callRequestId);
    return res.json(calls);
  });

  app.post("/api/bland/dispatch", isAuthenticated, async (req: Request, res: Response) => {
    if (!bland.isConfigured()) return res.status(503).json({ message: "Bland AI is not configured" });
    try {
      const { callRequestId } = req.body;
      if (!callRequestId) return res.status(400).json({ message: "Call request ID is required" });

      const callRequest = await storage.getCallRequest(callRequestId);
      if (!callRequest) return res.status(404).json({ message: "Call request not found" });
      if (callRequest.userId !== req.session.userId!) return res.status(403).json({ message: "Unauthorized" });
      if (!callRequest.phone) return res.status(400).json({ message: "No phone number on call request" });

      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      const baseUrl = getBaseUrl(req);
      const task = bland.buildTravelConciergePrompt({
        userName: `${user.firstName} ${user.lastName}`,
        notes: callRequest.notes,
      });

      const blandCall = await storage.createBlandCall({
        callRequestId: callRequest.id,
        userId: user.id,
        phoneNumber: callRequest.phone,
        status: "queued",
      });

      const result = await bland.dispatchCall({
        phoneNumber: callRequest.phone,
        task,
        webhookUrl: `${baseUrl}/api/bland/webhook`,
        dynamicDataUrl: `${baseUrl}/api/bland/dynamic-data`,
        dynamicDataHeaders: { "x-bland-secret": process.env.BLAND_AI_API_KEY || "" },
        metadata: {
          callRequestId: callRequest.id,
          userId: user.id,
          blandCallDbId: blandCall.id,
        },
        record: true,
      });

      await storage.updateBlandCall(blandCall.id, {
        blandCallId: result.callId,
        status: "queued",
      });

      await storage.updateCallRequest(callRequest.id, { status: "scheduled" });

      return res.json({
        blandCallId: result.callId,
        dbCallId: blandCall.id,
        status: result.status,
      });
    } catch (err: any) {
      console.error("Bland AI dispatch error:", err);
      return res.status(500).json({ message: err.message || "Failed to dispatch call" });
    }
  });

  app.post("/api/call-requests/:id/generate-proposal", isAuthenticated, async (req: Request, res: Response) => {
    const callRequestId = parseInt(req.params.id);
    const callRequest = await storage.getCallRequest(callRequestId);
    if (!callRequest || callRequest.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Call request not found" });
    }
    if (callRequest.status !== "completed") {
      return res.status(400).json({ message: "Call must be completed before generating a proposal" });
    }
    const existingProposals = await storage.getProposalsByCallRequest(callRequestId);
    if (existingProposals.length > 0) {
      return res.status(400).json({ message: "A proposal already exists for this call" });
    }

    const blandCalls = await storage.getBlandCallsByCallRequest(callRequestId);
    const completedCall = blandCalls?.find(c => c.status === "completed");
    const callSummary = completedCall?.summary || null;

    try {
      await generateProposalFromCall(callRequestId, req.session.userId!, callSummary);
      return res.json({ message: "Proposal generated successfully" });
    } catch (err: any) {
      console.error("Manual proposal generation error:", err);
      return res.status(500).json({ message: err.message || "Failed to generate proposal" });
    }
  });

  function parseTravelDetailsFromTranscript(transcript: string | null, summary: string | null): {
    origin: string | null;
    destination: string | null;
    departureDate: string | null;
    returnDate: string | null;
    passengers: number;
    cabinClass: string;
    budget: number | null;
  } {
    const originalText = [summary, transcript].filter(Boolean).join("\n");
    const text = originalText.toLowerCase();
    if (!text) return { origin: null, destination: null, departureDate: null, returnDate: null, passengers: 1, cabinClass: "economy", budget: null };

    let origin: string | null = null;
    let destination: string | null = null;

    // Step 1: try "from X to Y" patterns — allow apostrophes, hyphens, digits in place names
    const fromToPatterns = [
      /(?:from|departing|leaving|flying from|traveling from|depart(?:ing)? from)\s+([\w\s''\-]+?)\s+(?:to|going to|heading to|flying to|traveling to)\s+([\w\s''\-]+?)(?:\.|,|$|\s+on\b|\s+in\b|\s+around\b|\s+for\b)/i,
      /(?:fly|travel|go|trip|flight)\s+(?:from\s+)?([\w\s''\-]+?)\s+to\s+([\w\s''\-]+?)(?:\.|,|$|\s+on\b|\s+in\b)/i,
    ];
    for (const pat of fromToPatterns) {
      const match = text.match(pat);
      if (match) {
        const rawOrigin = match[1].trim();
        const rawDest = match[2].trim();
        // Reject if capture is just digits or a weekday/month (false positive from date phrases like "from February 27th to March 9th")
        const MONTHS_RE = /^(?:january|february|march|april|may|june|july|august|september|october|november|december)/i;
        if (!MONTHS_RE.test(rawOrigin) && !MONTHS_RE.test(rawDest) && rawOrigin.length > 1 && rawDest.length > 1) {
          origin = rawOrigin;
          destination = rawDest;
          break;
        }
      }
    }

    // Step 2: dedicated destination / origin phrase patterns
    if (!destination) {
      const destPatterns = [
        /(?:going to|heading to|traveling to|fly(?:ing)? to|destination(?:\s*:|\s+is)?|trip to|visit(?:ing)?|book(?:ing)?\s+(?:a\s+)?(?:flight\s+)?to)\s+([\w][\w\s''\-]{1,30}?)(?:\.|,|$|\s+on\b|\s+in\b|\s+around\b|\s+for\b|\s+from\b)/i,
      ];
      for (const pat of destPatterns) {
        const match = text.match(pat);
        if (match) {
          destination = match[1].trim();
          break;
        }
      }
    }

    // Step 3: scan the ORIGINAL (properly cased) text for "to [ProperNoun]" — handles "to London", "to Paris" etc.
    if (!destination) {
      const SKIP_MONTHS = new Set(["January","February","March","April","May","June","July","August","September","October","November","December"]);
      const SKIP_WORDS = new Set(["The","A","An","Travnr","AI","It","He","She","We","You","They","This","That"]);
      const toCityRe = /\bto\s+([A-Z][a-zA-Z]+(?:[\s\-][A-Z][a-zA-Z]+)*)/g;
      let m: RegExpExecArray | null;
      while ((m = toCityRe.exec(originalText)) !== null) {
        const candidate = m[1].trim();
        const firstWord = candidate.split(/[\s\-]/)[0];
        if (!SKIP_MONTHS.has(firstWord) && !SKIP_WORDS.has(firstWord) && candidate.length > 2 && candidate.length < 40) {
          destination = candidate.toLowerCase();
          break;
        }
      }
    }

    if (!origin) {
      const originPatterns = [
        /(?:from|departing|leaving|out of|origin(?:\s*:|\s+is)?)\s+([\w][\w\s''\-]{1,30}?)(?:\.|,|$|\s+to\b|\s+on\b)/i,
      ];
      for (const pat of originPatterns) {
        const match = text.match(pat);
        if (match) {
          const rawOrigin = match[1].trim();
          const MONTHS_RE = /^(?:january|february|march|april|may|june|july|august|september|october|november|december)/i;
          if (!MONTHS_RE.test(rawOrigin)) {
            origin = rawOrigin;
            break;
          }
        }
      }
    }

    // Step 4: scan original text for "from [ProperNoun]" to fill origin
    if (!origin) {
      const SKIP_MONTHS = new Set(["January","February","March","April","May","June","July","August","September","October","November","December"]);
      const SKIP_WORDS = new Set(["The","A","An","Travnr","AI","It","He","She","We","You","They","This","That"]);
      const fromCityRe = /\bfrom\s+([A-Z][a-zA-Z]+(?:[\s\-][A-Z][a-zA-Z]+)*)/g;
      let m: RegExpExecArray | null;
      while ((m = fromCityRe.exec(originalText)) !== null) {
        const candidate = m[1].trim();
        const firstWord = candidate.split(/[\s\-]/)[0];
        if (!SKIP_MONTHS.has(firstWord) && !SKIP_WORDS.has(firstWord) && candidate.length > 2 && candidate.length < 40) {
          origin = candidate.toLowerCase();
          break;
        }
      }
    }

    // Step 5: IATA code extraction (last resort — only fill slots still empty)
    const iataPattern = /\b([A-Z]{3})\b/g;
    const COMMON_WORDS = new Set(["THE","AND","FOR","ARE","NOT","YOU","ALL","CAN","HER","WAS","ONE","OUR","OUT","HAS","HIS","HOW","ITS","MAY","NEW","NOW","OLD","SEE","WAY","WHO","DID","GET","HIM","LET","SAY","SHE","TOO","USE","HAS","JAN","FEB","MAR","APR","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]);
    const iataCodes: string[] = [];
    let iataMatch: RegExpExecArray | null;
    while ((iataMatch = iataPattern.exec(originalText)) !== null) {
      const code = iataMatch[1];
      if (!COMMON_WORDS.has(code)) iataCodes.push(code);
    }
    if (iataCodes.length >= 2) {
      if (!origin) origin = iataCodes[0];
      if (!destination) destination = iataCodes[1];
    } else if (iataCodes.length === 1) {
      // One IATA code: treat it as origin if we already have a destination, else destination
      if (destination && !origin) origin = iataCodes[0];
      else if (!destination && !origin) destination = iataCodes[0];
    }

    let departureDate: string | null = null;
    let returnDate: string | null = null;

    const datePattern = /(\d{4}-\d{2}-\d{2})/g;
    const dates: string[] = [];
    let dateMatch;
    while ((dateMatch = datePattern.exec(text)) !== null) {
      dates.push(dateMatch[1]);
    }
    if (dates.length >= 1) departureDate = dates[0];
    if (dates.length >= 2) returnDate = dates[1];

    if (!departureDate) {
      const monthDayPatterns = [
        /(?:on|departing|leaving|departure|depart|leave)(?:\s*(?:on|:))?\s*(?:the\s+)?(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)/i,
        /(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)\s*(?:to|through|until|[-–])\s*(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)/i,
        /(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)(?:\s*,?\s*\d{4})?)/i,
      ];
      for (const pat of monthDayPatterns) {
        const mdMatch = text.match(pat);
        if (mdMatch) {
          const cleanDate = (s: string) => s.replace(/(st|nd|rd|th)/gi, "").replace(/\bof\b/gi, "").trim();
          const thisYear = new Date().getFullYear();
          const parsed = new Date(cleanDate(mdMatch[1]));
          if (!isNaN(parsed.getTime())) {
            if (parsed.getFullYear() < thisYear) parsed.setFullYear(thisYear);
            departureDate = parsed.toISOString().split("T")[0];
          }
          if (mdMatch[2] && !returnDate) {
            const parsed2 = new Date(cleanDate(mdMatch[2]));
            if (!isNaN(parsed2.getTime())) {
              if (parsed2.getFullYear() < thisYear) parsed2.setFullYear(thisYear);
              returnDate = parsed2.toISOString().split("T")[0];
            }
          }
          if (departureDate) break;
        }
      }
    }

    if (!returnDate && departureDate) {
      const returnPatterns = [
        /(?:return(?:ing)?|com(?:e|ing)\s+back|back)\s*(?:on|:)?\s*(?:the\s+)?(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)/i,
        /(?:return(?:ing)?|com(?:e|ing)\s+back|back)\s*(?:on|:)?\s*(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)(?:\s*,?\s*\d{4})?)/i,
        /(?:for|stay(?:ing)?)\s+(\d+)\s*(?:days?|nights?|weeks?)/i,
      ];
      for (const pat of returnPatterns) {
        const rMatch = text.match(pat);
        if (rMatch) {
          if (/\d+\s*(?:days?|nights?|weeks?)/.test(rMatch[0])) {
            const num = parseInt(rMatch[1]);
            const mult = /weeks?/i.test(rMatch[0]) ? 7 : 1;
            const depDate = new Date(departureDate);
            depDate.setDate(depDate.getDate() + num * mult);
            returnDate = depDate.toISOString().split("T")[0];
          } else {
            const cleanDate = (s: string) => s.replace(/(st|nd|rd|th)/gi, "").replace(/\bof\b/gi, "").trim();
            const parsed = new Date(cleanDate(rMatch[1]));
            if (!isNaN(parsed.getTime())) {
              if (parsed.getFullYear() < new Date().getFullYear()) parsed.setFullYear(new Date().getFullYear());
              returnDate = parsed.toISOString().split("T")[0];
            }
          }
          if (returnDate) break;
        }
      }
    }

    let passengers = 1;
    const paxPatterns = [
      /(\d+)\s*(?:passengers?|travelers?|travellers?|people|adults?|persons?)/i,
      /(?:passengers?|travelers?|travellers?|people|adults?|persons?)(?:\s*:\s*|\s+)(\d+)/i,
    ];
    for (const pat of paxPatterns) {
      const match = text.match(pat);
      if (match) {
        const n = parseInt(match[1]);
        if (n >= 1 && n <= 20) passengers = n;
        break;
      }
    }

    let cabinClass = "economy";
    if (/\b(?:first\s*class|first-class)\b/i.test(text)) cabinClass = "first";
    else if (/\bbusiness\s*class\b/i.test(text) || /\bbusiness\b/i.test(text)) cabinClass = "business";
    else if (/\bpremium\s*economy\b/i.test(text) || /\bpremium\b/i.test(text)) cabinClass = "premium_economy";

    let budget: number | null = null;
    const budgetPatterns = [
      /\$\s*([\d,]+(?:\.\d{2})?)/,
      /(\d[\d,]+)\s*(?:dollars|usd)/i,
      /budget(?:\s*(?:is|of|around|about|:))?\s*\$?\s*([\d,]+)/i,
    ];
    for (const pat of budgetPatterns) {
      const match = text.match(pat);
      if (match) {
        budget = parseFloat(match[1].replace(/,/g, ""));
        break;
      }
    }

    return { origin, destination, departureDate, returnDate, passengers, cabinClass, budget };
  }

  async function generateProposalFromCall(callRequestId: number, userId: string, callSummary: string | null, callTranscript?: string | null) {
    const callRequest = await storage.getCallRequest(callRequestId);
    if (!callRequest) {
      console.log(`generateProposalFromCall: call request ${callRequestId} not found`);
      return;
    }

    if (callRequest.userId !== userId) {
      console.warn(`generateProposalFromCall: user mismatch callRequest.userId=${callRequest.userId} vs userId=${userId}`);
      return;
    }

    const existingProposals = await storage.getProposalsByCallRequest(callRequestId);
    if (existingProposals.length > 0) {
      const fallbackIds: number[] = [];
      for (const ep of existingProposals) {
        const items = await storage.getProposalItems(ep.id);
        const isFallback = items.length === 0 || items.every(i => !i.duffelOfferId && (parseFloat(i.amount ?? "0") === 0));
        if (isFallback) fallbackIds.push(ep.id);
      }
      if (fallbackIds.length < existingProposals.length) {
        console.log(`Real proposal already exists for call request ${callRequestId}, skipping`);
        return;
      }
      console.log(`Replacing ${fallbackIds.length} fallback proposal(s) for call request ${callRequestId}`);
      for (const id of fallbackIds) {
        await storage.deleteProposalAndItems(id);
      }
    }

    let transcript = callTranscript ?? null;
    let summary = callSummary;
    if (transcript === null || summary === null) {
      const blandCalls = await storage.getBlandCallsByCallRequest(callRequestId);
      const completedCall = blandCalls?.find(c => c.status === "completed");
      if (transcript === null) transcript = completedCall?.transcript || null;
      if (summary === null) summary = completedCall?.summary || null;
    }

    if (!transcript && !summary) {
      console.log(`generateProposalFromCall: no transcript or summary available yet for call request ${callRequestId}, skipping`);
      return;
    }

    const details = parseTravelDetailsFromTranscript(transcript, summary);
    console.log(`Parsed travel details from transcript for call ${callRequestId}:`, JSON.stringify(details));

    if (!details.destination) {
      console.log(`generateProposalFromCall: no destination found in transcript for call request ${callRequestId}`);
      await createFallbackProposal(callRequestId, userId, summary);
      return;
    }

    if (!duffel) {
      await createFallbackProposal(callRequestId, userId, summary);
      return;
    }

    try {
      const placesResponse = await duffel.suggestions.list({ query: details.destination });
      const places = placesResponse.data || [];
      const destAirport = places.find((p: any) => p.type === "airport") || places[0];
      if (!destAirport?.iata_code) {
        console.log(`No airport found for destination: ${details.destination}`);
        await createFallbackProposal(callRequestId, userId, summary);
        return;
      }
      const destCode = destAirport.iata_code;
      const destName = destAirport.city_name || destAirport.name || details.destination;

      let originCode = "JFK";
      const profile = await storage.getProfile(userId);

      if (details.origin) {
        try {
          const originPlaces = await duffel.suggestions.list({ query: details.origin });
          const originAirport = (originPlaces.data || []).find((p: any) => p.type === "airport") || (originPlaces.data || [])[0];
          if (originAirport?.iata_code) originCode = originAirport.iata_code;
        } catch (e) {
          console.log(`Could not resolve origin "${details.origin}", using fallback`);
        }
      }

      if (originCode === "JFK" && !details.origin) {
        if (profile?.homeAirport) {
          originCode = profile.homeAirport;
        } else if (profile?.nationality) {
          const nationalityToHub: Record<string, string> = {
            "US": "JFK", "GB": "LHR", "CA": "YYZ", "AU": "SYD", "DE": "FRA",
            "FR": "CDG", "JP": "NRT", "KR": "ICN", "SG": "SIN", "AE": "DXB",
            "IN": "DEL", "BR": "GRU", "MX": "MEX", "IT": "FCO", "ES": "MAD",
          };
          originCode = nationalityToHub[profile.nationality] || "JFK";
        }
      }

      if (originCode === destCode) {
        originCode = originCode === "JFK" ? "LAX" : "JFK";
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let departureDate = details.departureDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
      let returnDate = details.returnDate || null;

      if (new Date(departureDate) <= today) {
        departureDate = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
        if (returnDate) {
          const duration = details.departureDate && details.returnDate
            ? Math.ceil((new Date(details.returnDate).getTime() - new Date(details.departureDate).getTime()) / 86400000)
            : 7;
          returnDate = new Date(Date.now() + (14 + duration) * 86400000).toISOString().split("T")[0];
        }
      }

      const passengers: Array<{ type: "adult" }> = [];
      for (let i = 0; i < details.passengers; i++) {
        passengers.push({ type: "adult" as const });
      }

      const slices: any[] = [{ origin: originCode, destination: destCode, departure_date: departureDate }];
      if (returnDate) {
        slices.push({ origin: destCode, destination: originCode, departure_date: returnDate });
      }

      console.log(`Searching Duffel for call ${callRequestId}: ${originCode} -> ${destCode}, depart=${departureDate}, return=${returnDate}, cabin=${details.cabinClass}, pax=${details.passengers}`);

      const offerRequest = await duffel.offerRequests.create({
        slices,
        passengers,
        cabin_class: details.cabinClass as any,
        return_offers: true,
        max_connections: 1,
      });

      const allOffers = (offerRequest.data as any).offers || [];
      if (allOffers.length === 0) {
        await createFallbackProposal(callRequestId, userId, summary);
        return;
      }

      allOffers.sort((a: any, b: any) => parseFloat(a.total_amount) - parseFloat(b.total_amount));

      const diverseOffers: any[] = [];
      const seenAirlines = new Set<string>();
      for (const offer of allOffers) {
        const airline = offer.owner?.iata_code || offer.owner?.name || "unknown";
        if (!seenAirlines.has(airline)) {
          diverseOffers.push(offer);
          seenAirlines.add(airline);
          if (diverseOffers.length >= 2) break;
        }
      }

      if (diverseOffers.length < 2) {
        for (const offer of allOffers) {
          if (!diverseOffers.includes(offer)) {
            diverseOffers.push(offer);
            if (diverseOffers.length >= 2) break;
          }
        }
      }

      if (details.budget) {
        diverseOffers.sort((a: any, b: any) => {
          const diffA = Math.abs(parseFloat(a.total_amount) - details.budget!);
          const diffB = Math.abs(parseFloat(b.total_amount) - details.budget!);
          return diffA - diffB;
        });
      }

      const topOffers = diverseOffers.slice(0, 2);
      const bestOffer = topOffers[0];

      const simplifyOffer = (offer: any) => ({
        id: offer.id,
        totalAmount: offer.total_amount,
        totalCurrency: offer.total_currency,
        expiresAt: offer.expires_at,
        owner: offer.owner,
        slices: offer.slices?.map((slice: any) => ({
          id: slice.id,
          duration: slice.duration,
          origin: { iata: slice.origin?.iata_code, name: slice.origin?.name, city: slice.origin?.city_name },
          destination: { iata: slice.destination?.iata_code, name: slice.destination?.name, city: slice.destination?.city_name },
          segments: slice.segments?.map((seg: any) => ({
            id: seg.id,
            departingAt: seg.departing_at,
            arrivingAt: seg.arriving_at,
            origin: { iata: seg.origin?.iata_code, name: seg.origin?.name },
            destination: { iata: seg.destination?.iata_code, name: seg.destination?.name },
            carrier: {
              name: seg.marketing_carrier?.name,
              iata: seg.marketing_carrier?.iata_code,
              logoUrl: seg.marketing_carrier?.logo_symbol_url || seg.marketing_carrier?.logo_lockup_url,
            },
            flightNumber: seg.marketing_carrier_flight_number,
            aircraft: seg.aircraft?.name,
            cabinClass: seg.passengers?.[0]?.cabin_class_marketing_name || seg.passengers?.[0]?.cabin_class,
            baggages: seg.passengers?.[0]?.baggages,
          })),
        })),
        passengers: offer.passengers,
      });

      const simplified = simplifyOffer(bestOffer);
      const routeSummary = simplified.slices?.map((s: any) =>
        `${s.origin?.city || s.origin?.iata} to ${s.destination?.city || s.destination?.iata}`
      ).join(", ") || destName;

      const cabinLabel = details.cabinClass === "premium_economy" ? "Premium Economy" : details.cabinClass.charAt(0).toUpperCase() + details.cabinClass.slice(1);

      const proposal = await storage.createProposal({
        userId,
        callRequestId,
        title: `Trip to ${destName}`,
        summary: summary || `Based on your concierge call, we found ${cabinLabel} class flights for your trip. ${routeSummary}.`,
        totalEstimate: bestOffer.total_amount,
        status: "sent",
      });

      await storage.createProposalItem({
        proposalId: proposal.id,
        type: "flight",
        description: `${cabinLabel} Flight: ${routeSummary}`,
        priceEstimate: bestOffer.total_amount,
        duffelOfferId: bestOffer.id,
        duffelOfferData: simplified,
      });

      for (let i = 1; i < topOffers.length; i++) {
        const altSimplified = simplifyOffer(topOffers[i]);
        const altRoute = altSimplified.slices?.map((s: any) =>
          `${s.origin?.city || s.origin?.iata} to ${s.destination?.city || s.destination?.iata}`
        ).join(", ") || destName;
        const altCabin = altSimplified.slices?.[0]?.segments?.[0]?.cabinClass || cabinLabel;

        await storage.createProposalItem({
          proposalId: proposal.id,
          type: "flight",
          description: `Alternative ${altCabin} Flight: ${altRoute} (${topOffers[i].owner?.name || "Airline"})`,
          priceEstimate: topOffers[i].total_amount,
          duffelOfferId: topOffers[i].id,
          duffelOfferData: altSimplified,
        });
      }

      await storage.createNotification({
        userId,
        type: "proposal_received",
        title: "New travel proposal ready",
        body: `Based on your concierge call, we've prepared a flight proposal for your trip to ${destName}.`,
        linkUrl: `/proposals/${proposal.id}`,
      });

      console.log(`Auto-generated proposal ${proposal.id} with ${topOffers.length} offers from call request ${callRequestId}`);
    } catch (err: any) {
      console.error("Duffel search for auto-proposal failed:", JSON.stringify(err?.errors || err?.message || err, null, 2));
      await createFallbackProposal(callRequestId, userId, summary);
    }
  }

  async function createFallbackProposal(callRequestId: number, userId: string, callSummary: string | null) {
    const proposal = await storage.createProposal({
      userId,
      callRequestId,
      title: "Travel Concierge Proposal",
      summary: callSummary || "Please provide your travel details so we can search for the best flights.",
      totalEstimate: "0.00",
      status: "sent",
    });

    await storage.createProposalItem({
      proposalId: proposal.id,
      type: "other",
      description: "Travel planning - details pending from concierge call",
      priceEstimate: "0.00",
      duffelOfferId: null,
      duffelOfferData: null,
    });

    await storage.createNotification({
      userId,
      type: "proposal_received",
      title: "Travel proposal in progress",
      body: "We're working on your travel proposal. You'll receive flight options soon.",
      linkUrl: `/proposals/${proposal.id}`,
    });

    console.log(`Created fallback proposal ${proposal.id} for call request ${callRequestId}`);
  }

  app.post("/api/bland/webhook", async (req: Request, res: Response) => {
    try {
      const webhookSecret = req.headers["x-bland-secret"] as string;
      const blandApiKey = process.env.BLAND_AI_API_KEY;
      if (blandApiKey && webhookSecret && webhookSecret !== blandApiKey) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const payload = req.body;
      const blandCallId = payload.call_id;

      if (!blandCallId) {
        console.warn("Bland webhook received without call_id");
        return res.json({ received: true });
      }

      console.log(`Bland webhook received: event=${payload.event || "unknown"}, call_id=${blandCallId}`);

      let blandCall = await storage.getBlandCallByBlandId(blandCallId);

      if (!blandCall && payload.metadata?.blandCallDbId) {
        const dbId = parseInt(payload.metadata.blandCallDbId);
        if (!isNaN(dbId)) {
          await storage.updateBlandCall(dbId, { blandCallId });
          blandCall = await storage.getBlandCallByBlandId(blandCallId);
        }
      }

      if (!blandCall && payload.metadata?.callbackEmail) {
        if (payload.status === "completed" || payload.event === "call.ended") {
          const baseUrl = getBaseUrl(req);
          sendAccountCreationEmail(
            payload.metadata.callbackEmail,
            payload.metadata.callbackName || "",
            payload.metadata.callbackRequestId,
            baseUrl
          ).catch((err: any) => {
            console.error("Account creation email error:", err);
          });

          if (payload.metadata.callbackRequestId) {
            try {
              await storage.updateCallbackRequest(payload.metadata.callbackRequestId, {
                transcript: payload.concatenated_transcript || null,
                summary: payload.summary || null,
                recordingUrl: payload.recording_url || null,
                blandCallId: blandCallId,
                status: "completed",
              });
            } catch (err) {
              console.error("Failed to update callback request with call data:", err);
            }
          }

          console.log(`Callback call completed for ${payload.metadata.callbackEmail}, signup email sent`);
        }
        return res.json({ received: true });
      }

      if (!blandCall) {
        console.warn(`No matching bland_call found for bland_call_id=${blandCallId}`);
        return res.json({ received: true });
      }

      const updateData: any = {};

      if (payload.status === "completed" || payload.event === "call.ended") {
        updateData.status = "completed";
        updateData.duration = payload.call_length ? parseInt(payload.call_length) : null;
        updateData.transcript = payload.concatenated_transcript || null;
        updateData.transcriptJson = payload.transcript || null;
        updateData.recordingUrl = payload.recording_url || null;
        updateData.summary = payload.summary || null;
        updateData.variables = payload.variables || null;
        updateData.endedAt = new Date();

        if (blandCall.callRequestId) {
          await storage.updateCallRequest(blandCall.callRequestId, { status: "completed" });
        }

        await storage.createNotification({
          userId: blandCall.userId,
          type: "call_completed",
          title: "Concierge call completed",
          body: `Your concierge call has been completed${updateData.duration ? ` (${Math.ceil(updateData.duration / 60)} min)` : ""}.`,
          linkUrl: "/call-history",
        });

      }

      if (payload.status === "in_progress" || payload.event === "call.started") {
        updateData.status = "in_progress";
        updateData.startedAt = new Date();
      } else if (payload.status === "failed" || payload.status === "error") {
        updateData.status = "failed";
        updateData.errorMessage = payload.error_message || "Call failed";
        updateData.endedAt = new Date();

        if (blandCall.callRequestId) {
          await storage.updateCallRequest(blandCall.callRequestId, { status: "requested" });
        }

        await storage.createNotification({
          userId: blandCall.userId,
          type: "call_failed",
          title: "Concierge call failed",
          body: `Your concierge call could not be completed. ${payload.error_message || "Please try again."}`,
          linkUrl: "/call-history",
        });
      } else if (payload.status === "no-answer") {
        updateData.status = "no_answer";
        updateData.endedAt = new Date();

        await storage.createNotification({
          userId: blandCall.userId,
          type: "call_no_answer",
          title: "Concierge call - no answer",
          body: "We were unable to reach you. Please request a new call when you're available.",
          linkUrl: "/call-history",
        });
      }

      if (Object.keys(updateData).length > 0) {
        await storage.updateBlandCall(blandCall.id, updateData);
      }

      if (
        blandCall.callRequestId &&
        duffel &&
        updateData.status === "completed" &&
        (updateData.transcript || updateData.summary)
      ) {
        generateProposalFromCall(
          blandCall.callRequestId,
          blandCall.userId,
          updateData.summary || null,
          updateData.transcript || null
        ).catch((err) => {
          console.error("Auto-proposal generation error:", err);
        });
      }

      return res.json({ received: true });
    } catch (err: any) {
      console.error("Bland webhook processing error:", err);
      return res.json({ received: true });
    }
  });

  app.post("/api/bland/dynamic-data", async (req: Request, res: Response) => {
    try {
      const secret = req.headers["x-bland-secret"] as string;
      if (!secret || secret !== process.env.BLAND_AI_API_KEY) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { phone_number, call_id } = req.body;

      let userId: string | null = null;

      if (call_id) {
        const blandCall = await storage.getBlandCallByBlandId(call_id);
        if (blandCall) userId = blandCall.userId;
      }

      let travelerInfo = "No traveler profile found.";
      let bookingInfo = "No recent bookings.";
      let proposalInfo = "No active proposals.";

      if (userId) {
        const profile = await storage.getProfile(userId);
        if (profile) {
          travelerInfo = [
            profile.name ? `Name: ${profile.name}` : null,
            profile.homeAirport ? `Home airport: ${profile.homeAirport}` : null,
            profile.seatPreference ? `Seat preference: ${profile.seatPreference}` : null,
            profile.dietaryNotes ? `Dietary needs: ${profile.dietaryNotes}` : null,
            profile.budgetRange ? `Budget: ${profile.budgetRange}` : null,
            profile.loyaltyPrograms ? `Loyalty programs: ${profile.loyaltyPrograms}` : null,
          ].filter(Boolean).join(". ") || "Profile exists but minimal details.";
        }

        const payments = await storage.getPayments(userId);
        const recentBookings = payments
          .filter(p => p.duffelBookingRef)
          .slice(0, 3)
          .map(p => `Booking ${p.duffelBookingRef} - ${p.currency?.toUpperCase()} ${p.amount} (${p.status})`)
          .join("; ");
        if (recentBookings) bookingInfo = recentBookings;

        const proposals = await storage.getProposals(userId);
        const activeProposals = proposals
          .filter(p => p.status === "sent" || p.status === "approved")
          .slice(0, 3)
          .map(p => `"${p.title}" - $${p.totalEstimate} (${p.status})`)
          .join("; ");
        if (activeProposals) proposalInfo = activeProposals;
      }

      return res.json({
        traveler_info: travelerInfo,
        booking_info: bookingInfo,
        proposal_info: proposalInfo,
      });
    } catch (err: any) {
      console.error("Bland dynamic data error:", err);
      return res.json({
        traveler_info: "Error loading profile.",
        booking_info: "Error loading bookings.",
        proposal_info: "Error loading proposals.",
      });
    }
  });

  app.post("/api/bland/stop/:callId", isAuthenticated, async (req: Request, res: Response) => {
    if (!bland.isConfigured()) return res.status(503).json({ message: "Bland AI is not configured" });
    try {
      const blandCallId = req.params.callId;
      const blandCall = await storage.getBlandCallByBlandId(blandCallId);
      if (!blandCall || blandCall.userId !== req.session.userId!) {
        return res.status(404).json({ message: "Call not found" });
      }
      await bland.stopCall(blandCallId);
      await storage.updateBlandCall(blandCall.id, { status: "completed", endedAt: new Date() });
      return res.json({ stopped: true });
    } catch (err: any) {
      console.error("Bland stop call error:", err);
      return res.status(500).json({ message: err.message || "Failed to stop call" });
    }
  });

  // CALLBACK REQUEST (public)
  app.post("/api/callback-request", async (req: Request, res: Response) => {
    const parsed = callbackBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Phone and email are required" });
    }
    const cb = await storage.createCallbackRequest(parsed.data);

    if (bland.isConfigured() && cb.phone) {
      try {
        const baseUrl = getBaseUrl(req);
        const task = bland.buildTravelConciergePrompt({
          userName: cb.name || "there",
          destination: "your ideal destination",
          tripType: "both",
          notes: "This is a new visitor requesting a callback from the website. Learn about their travel needs and preferences.",
        });

        const result = await bland.dispatchCall({
          phoneNumber: cb.phone,
          task,
          webhookUrl: `${baseUrl}/api/bland/webhook`,
          metadata: {
            callbackRequestId: cb.id,
            callbackEmail: cb.email,
            callbackName: cb.name,
            source: "landing_page",
          },
          record: true,
        });
        console.log(`Bland AI callback call dispatched: ${result.callId} for callback request ${cb.id}`);
      } catch (err: any) {
        console.error("Bland AI callback dispatch error:", err);
      }
    }

    return res.json(cb);
  });

  // WEBHOOK ENDPOINTS
  app.post("/api/webhooks/call-status", async (req: Request, res: Response) => {
    const { callRequestId, status } = req.body;
    if (!callRequestId || !status) return res.status(400).json({ message: "Missing data" });
    const cr = await storage.getCallRequest(callRequestId);
    if (!cr) return res.status(404).json({ message: "Call request not found" });
    await storage.updateCallRequest(callRequestId, { status });
    await storage.createNotification({
      userId: cr.userId, type: "call_status", title: `Call ${status}`,
      body: cr.destination ? `Your call request for ${cr.destination} has been ${status}.` : `Your call request has been ${status}.`,
      linkUrl: "/call-history",
    });
    return res.json({ message: "Updated" });
  });

  app.post("/api/webhooks/proposal-created", async (req: Request, res: Response) => {
    const { userId, callRequestId, title, summary, totalEstimate, items } = req.body;
    if (!userId || !title) return res.status(400).json({ message: "Missing data" });
    const proposal = await storage.createProposal({
      userId, callRequestId, title, summary, totalEstimate, status: "sent",
    });
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await storage.createProposalItem({
          proposalId: proposal.id,
          type: item.type,
          description: item.description,
          priceEstimate: item.priceEstimate,
          duffelOfferId: item.duffelOfferId || null,
          duffelOfferData: item.duffelOfferData || null,
        });
      }
    }
    await storage.createNotification({
      userId, type: "new_proposal", title: "New proposal received",
      body: `Your "${title}" proposal is ready for review.`,
      linkUrl: `/proposals/${proposal.id}`,
    });
    return res.json(proposal);
  });

  app.post("/api/webhooks/stripe", async (req: Request, res: Response) => {
    const { paymentId, status } = req.body;
    if (!paymentId || !status) return res.status(400).json({ message: "Missing data" });
    await storage.updatePayment(paymentId, { status });
    return res.json({ message: "Updated" });
  });

  app.get("/api/stripe/config", async (_req: Request, res: Response) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (err: any) {
      res.json({ publishableKey: null });
    }
  });

  app.post("/api/stripe/create-payment-intent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { proposalId, itemId, amount: amountOverride, currency: currencyOverride } = req.body;
      if (!proposalId || !itemId) {
        return res.status(400).json({ message: "proposalId and itemId are required" });
      }

      const proposal = await storage.getProposal(proposalId);
      if (!proposal || proposal.userId !== req.session.userId!) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      const items = await storage.getProposalItems(proposalId);
      const selectedItem = items.find(i => i.id === itemId);
      if (!selectedItem) {
        return res.status(400).json({ message: "Item not found" });
      }

      const offerData = selectedItem.duffelOfferData as any;
      const serverAmount = amountOverride ? parseFloat(String(amountOverride)) : parseFloat(offerData?.totalAmount || selectedItem.priceEstimate);
      const serverCurrency = currencyOverride ? String(currencyOverride).toLowerCase() : (offerData?.totalCurrency || "USD").toLowerCase();

      if (!serverAmount || serverAmount <= 0) {
        return res.status(400).json({ message: "Invalid item amount" });
      }

      const stripe = await getUncachableStripeClient();
      const amountInCents = Math.round(serverAmount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: serverCurrency,
        metadata: {
          userId: req.session.userId!,
          proposalId: String(proposalId),
          itemId: String(itemId),
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (err: any) {
      console.error("Stripe PaymentIntent error:", err);
      res.status(500).json({ message: err.message || "Failed to create payment" });
    }
  });

  app.post("/api/stripe/confirm-booking", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Duffel is not configured" });

    try {
      const { paymentIntentId, proposalId, itemId, passengers, overrideOfferId, overrideOfferData } = req.body;
      if (!paymentIntentId || !proposalId || !itemId || !passengers) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ message: "Payment not yet confirmed" });
      }

      if (paymentIntent.metadata?.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Payment does not belong to this user" });
      }

      const proposal = await storage.getProposal(proposalId);
      if (!proposal || proposal.userId !== req.session.userId!) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      const items = await storage.getProposalItems(proposalId);
      const selectedItem = items.find(i => i.id === itemId);
      if (!selectedItem || !selectedItem.duffelOfferId) {
        return res.status(400).json({ message: "Selected flight not found" });
      }

      const offerData = overrideOfferData || (selectedItem.duffelOfferData as any);
      const offerId = overrideOfferId || selectedItem.duffelOfferId;

      const expectedAmount = parseFloat(offerData?.totalAmount || selectedItem.priceEstimate);
      const expectedCents = Math.round(expectedAmount * 100);
      if (paymentIntent.amount < expectedCents) {
        return res.status(400).json({ message: "Payment amount insufficient" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      const offerPassengerIds = offerData?.passengers?.map((p: any) => p.id) || [];
      const passengerMappings = passengers.map((p: any, idx: number) => ({
        id: offerPassengerIds[idx] || undefined,
        given_name: p.givenName,
        family_name: p.familyName,
        born_on: p.bornOn,
        email: user.email,
        phone_number: p.phone,
        title: p.title,
        gender: p.gender,
      }));

      const amount = offerData?.totalAmount || selectedItem.priceEstimate;
      const currency = offerData?.totalCurrency || "USD";

      const order = await duffel.orders.create({
        selected_offers: [offerId],
        passengers: passengerMappings,
        type: "instant",
        payments: [{
          type: "balance" as any,
          amount: String(amount),
          currency,
        }],
      });

      const orderData = order.data as any;
      const payment = await storage.createPayment({
        userId: req.session.userId!,
        proposalId,
        stripePaymentIntentId: paymentIntentId,
        duffelOrderId: orderData.id,
        duffelBookingRef: orderData.booking_reference,
        amount: orderData.total_amount || selectedItem.priceEstimate,
        currency: (orderData.total_currency || "usd").toLowerCase(),
        status: "paid",
      });

      await storage.updateProposal(proposalId, { status: "approved" });

      await storage.createNotification({
        userId: req.session.userId!,
        type: "payment_confirmed",
        title: "Flight booked via Apple Pay!",
        body: `Your flight for "${proposal.title}" has been booked. Reference: ${orderData.booking_reference}`,
        linkUrl: `/proposals/${proposalId}`,
      });

      res.json({
        bookings: [{
          payment,
          bookingReference: orderData.booking_reference,
          orderId: orderData.id,
        }],
      });
    } catch (err: any) {
      console.error("Stripe confirm-booking error:", err?.errors || err);
      res.status(500).json({ message: err?.errors?.[0]?.message || err.message || "Booking failed" });
    }
  });

  return httpServer;
}
