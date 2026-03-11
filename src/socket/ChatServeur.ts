import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";

// Types simplifiés pour les événements
interface ClientToServerEvents {
  user: (username: string) => void;
  message: (username: string, message: string) => void;
}

interface ServerToClientEvents {
  welcome: (message: string) => void;
  "user-joined": (message: string) => void;
  message: (data: { username: string; message: string }) => void;
}

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export class ChatServer {
  private io: TypedServer;

  constructor(httpServer: HTTPServer) {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(
      httpServer,
      {
        cors: { origin: "*" },
      },
    );
    this.initializeSocket();
  }

  private initializeSocket() {
    this.io.on("connection", (socket) => {
      console.log("Nouvelle connexion:", socket.id);

      // Envoyer un événement uniquement à ce client
      socket.emit("welcome", "Bienvenue sur le serveur!");

      socket.on("user", (username) => this.handleUser(socket, username));
      socket.on("message", (username, message) =>
        this.handleMessage(socket, username, message),
      );
    });
  }

  private handleUser(socket: TypedSocket, username: string) {
    console.log("Utilisateur connecté:", username);
    socket.broadcast.emit(
      "user-joined",
      "Un nouvel utilisateur s'est connecté",
    );
  }

  private handleMessage(
    _socket: TypedSocket,
    username: string,
    message: string,
  ) {
    console.log(`${username}: ${message}`);
    // Renvoyer le message à tous les clients (y compris l'émetteur)
    this.io.emit("message", { username, message });
  }
}
