import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import type { Express } from "express";
import dotenv from "dotenv";

dotenv.config();

export function setupGoogleAuth(app: Express) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Find or create user
          let user = await storage.getUserByEmail(profile.emails?.[0]?.value || "");
          if (!user) {
            user = await storage.createUser({
              email: profile.emails?.[0]?.value || "",
              password: "", // No password for Google users
              firstName: profile.name?.givenName || "",
              lastName: profile.name?.familyName || "",
              profileImageUrl: profile.photos?.[0]?.value || "",
            });
          }
          return done(null, user);
        } catch (err) {
          return done(err, undefined);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err, undefined);
    }
  });

  // Google OAuth login route
  app.get(
    "/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  // Google OAuth callback route
  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/login",
      session: true,
    }),
    async (req, res) => {
      // On success, set JWT cookie (stateless, same as password login)
      if (req.user && req.user.id) {
        // Dynamically import generateToken to avoid circular deps
        const { generateToken } = await import("./auth");
        const token = generateToken(req.user.id);
        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      }
      // Redirect to dashboard (root) after successful login
      res.redirect(process.env.FRONTEND_URL || "/");
    }
  );
}
