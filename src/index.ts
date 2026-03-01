import { createServer } from "http";
import { env } from "./env";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { Server } from "socket.io";
import { authRouter } from "./auth.route";
import { cardsRouter } from "./cards.route";
import { decksRouter } from "./decks.route";
import { swaggerDocument } from "./docs/index";
import { authenticateSocket } from "./socket.middleware";

// Create Express app
export const app = express();

// Create HTTP server (nécessaire pour Socket.io)
const httpServer = createServer(app);

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: true, // Autorise toutes les origines
    credentials: true,
  },
});

// Middlewares Express
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes Express
app.use(authRouter);
app.use(cardsRouter);
app.use(decksRouter);

// Serve static files (client HTML Socket.io)
app.use(express.static("public"));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "TCG Backend Server is running" });
});

// ============================================================
// Socket.io — Middleware d'authentification JWT
// ============================================================
io.use(authenticateSocket);

// ============================================================
// Socket.io — Gestion des connexions
// ============================================================
io.on("connection", (socket) => {
  console.log(
    `✅ Client connecté: ${socket.id} (userId: ${socket.user?.userId})`,
  );

  // Envoyer un message de bienvenue au client connecté
  socket.emit("welcome", `Bienvenue ${socket.user?.email} !`);

  // Notifier les autres clients de la nouvelle connexion
  socket.broadcast.emit("user-joined", `Un nouvel utilisateur s'est connecté`);

  // Écouter les messages du chat
  socket.on("message", (username: string, message: string) => {
    console.log(`${username}: ${message}`);
    // Renvoyer le message à tous les clients (y compris l'émetteur)
    io.emit("message", { username, message });
  });

  // Déconnexion
  socket.on("disconnect", () => {
    console.log(
      `❌ Client déconnecté: ${socket.id} (userId: ${socket.user?.userId})`,
    );
  });
});

// ============================================================
// Démarrage du serveur
// ============================================================
if (require.main === module) {
  try {
    httpServer.listen(env.PORT, () => {
      console.log(`\n🚀 Server is running on http://localhost:${env.PORT}`);
      console.log(
        `📚 Swagger UI available at http://localhost:${env.PORT}/api-docs`,
      );
      console.log(
        `🧪 Socket.io Test Client available at http://localhost:${env.PORT}`,
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}
