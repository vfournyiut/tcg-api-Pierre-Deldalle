import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./env";

// Étendre le type Socket pour ajouter les infos utilisateur
declare module "socket.io" {
  interface Socket {
    user?: {
      userId: number;
      email: string;
    };
  }
}

/**
 * Middleware d'authentification Socket.IO basé sur JSON Web Token (JWT).
 *
 * Analyse le token JWT envoyé dans `socket.handshake.auth.token`
 * lors de la connexion WebSocket.
 *
 * Si le token est valide :
 * - Les informations utilisateur (userId et email) sont injectées dans `socket.user`
 * - La connexion est acceptée via `next()`
 *
 * Si le token est absent, invalide ou expiré :
 * - La connexion est refusée via `next(new Error(...))`
 *
 * @param {Socket} socket - L'objet socket de la connexion entrante.
 * @param {Function} next - Fonction de continuation vers le middleware suivant.
 */
export const authenticateSocket = (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  // 1. Récupérer le token depuis le handshake
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Token manquant"));
  }

  try {
    // 2. Vérifier et décoder le token
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: number;
      email: string;
    };

    // 3. Injecter les infos utilisateur dans le socket
    socket.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    // 4. Accepter la connexion
    return next();
  } catch (error) {
    return next(new Error("Token invalide ou expiré"));
  }
};
