import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

try {
  if (process.env.FIREBASE_PROJECT_ID) {
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log("Firebase Admin initialized successfully.");
  } else {
    initializeApp();
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  const getOAuth2Client = (token: string) => {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });
    return oauth2Client;
  };

  app.get("/api/auth/token", async (req, res) => {
    const token = req.headers["x-ai-studio-access-token"] as string;
    if (!token) {
      return res.status(401).json({ error: "Missing AI Studio access token", requireAuth: true });
    }
    try {
      const oauth2Client = getOAuth2Client(token);
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      
      const uid = userInfo.data.id;
      if (!uid) {
        return res.status(400).json({ error: "Failed to get user ID" });
      }

      const customToken = await getAuth().createCustomToken(uid, {
        email: userInfo.data.email,
        name: userInfo.data.name,
        picture: userInfo.data.picture,
      });

      res.json({ customToken, user: userInfo.data });
    } catch (error) {
      console.error("Auth Token Error:", error);
      res.status(500).json({ error: "Failed to generate token" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
