import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import bcrypt from "bcryptjs";
import { prismaMock } from "./vitest.setup";

// Set JWT_SECRET before importing authRouter
process.env.JWT_SECRET = "test-secret-key";

// Mocks must be declared before importing the module that uses them
vi.mock("../src/database", () => ({ prisma: prismaMock }));
vi.mock("bcryptjs");

import { authRouter } from "../src/auth.route";

const app = express();
app.use(express.json());
app.use(authRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/sign-up", () => {
  it("should create a new user and return token", async () => {
    (bcrypt.hash as any).mockResolvedValue("hashedPassword");

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValue({
      id: 1,
      email: "test@test.com",
      username: "testuser",
      password: "hashedPassword",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1,
      email: "test@test.com",
      username: "testuser",
      password: "hashedPassword",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app).post("/api/auth/sign-up").send({
      email: "test@test.com",
      username: "testuser",
      password: "password123",
    });

    expect(response.status).toBe(201);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.email).toBe("test@test.com");
  });

  it("should return 400 if email is missing", async () => {
    const response = await request(app).post("/api/auth/sign-up").send({
      username: "testuser",
      password: "password123",
    });

    expect(response.status).toBe(400);
  });

  it("should return 400 if username is missing", async () => {
    const response = await request(app).post("/api/auth/sign-up").send({
      email: "test@test.com",
      password: "password123",
    });

    expect(response.status).toBe(400);
  });

  it("should return 400 if password is missing", async () => {
    const response = await request(app).post("/api/auth/sign-up").send({
      email: "test@test.com",
      username: "testuser",
    });

    expect(response.status).toBe(400);
  });

  it("should return 409 if email already exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      email: "test@test.com",
      username: "testuser",
      password: "hashedPassword",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app).post("/api/auth/sign-up").send({
      email: "test@test.com",
      username: "newuser",
      password: "password123",
    });

    expect(response.status).toBe(409);
  });

  it("should return 500 when createdUser is null after create", async () => {
    (bcrypt.hash as any).mockResolvedValue("hashedPassword");

    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    prismaMock.user.create.mockResolvedValue({
      id: 1,
      email: "test@test.com",
      username: "testuser",
      password: "hashedPassword",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app).post("/api/auth/sign-up").send({
      email: "test@test.com",
      username: "testuser",
      password: "password123",
    });

    expect(response.status).toBe(500);
  });

  it("should return 500 if bcrypt hash fails", async () => {
    (bcrypt.hash as any).mockRejectedValue(new Error("Hash error"));

    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await request(app).post("/api/auth/sign-up").send({
      email: "test@test.com",
      username: "testuser",
      password: "password123",
    });

    expect(response.status).toBe(500);
  });

  it("should return 500 if database create fails", async () => {
    (bcrypt.hash as any).mockResolvedValue("hashedPassword");

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockRejectedValue(new Error("DB error"));

    const response = await request(app).post("/api/auth/sign-up").send({
      email: "test@test.com",
      username: "testuser",
      password: "password123",
    });

    expect(response.status).toBe(500);
  });
});

describe("POST /api/auth/sign-in", () => {
  it("should sign in user and return token", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      email: "test@test.com",
      username: "testuser",
      password: "hashedPassword",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    (bcrypt.compare as any).mockResolvedValue(true);

    const response = await request(app).post("/api/auth/sign-in").send({
      email: "test@test.com",
      password: "password123",
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.email).toBe("test@test.com");
  });

  it("should return 400 if email is missing", async () => {
    const response = await request(app).post("/api/auth/sign-in").send({
      password: "password123",
    });

    expect(response.status).toBe(400);
  });

  it("should return 400 if password is missing", async () => {
    const response = await request(app).post("/api/auth/sign-in").send({
      email: "test@test.com",
    });

    expect(response.status).toBe(400);
  });

  it("should return 401 if user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await request(app).post("/api/auth/sign-in").send({
      email: "nonexistent@test.com",
      password: "password123",
    });

    expect(response.status).toBe(401);
  });

  it("should return 401 if password is incorrect", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      email: "test@test.com",
      username: "testuser",
      password: "hashedPassword",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    (bcrypt.compare as any).mockResolvedValue(false);

    const response = await request(app).post("/api/auth/sign-in").send({
      email: "test@test.com",
      password: "wrongpassword",
    });

    expect(response.status).toBe(401);
  });

  it("should return 500 if bcrypt compare fails", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      email: "test@test.com",
      username: "testuser",
      password: "hashedPassword",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    (bcrypt.compare as any).mockRejectedValue(new Error("Compare error"));

    const response = await request(app).post("/api/auth/sign-in").send({
      email: "test@test.com",
      password: "password123",
    });

    expect(response.status).toBe(500);
  });

  it("should return 500 if database query fails", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("DB error"));

    const response = await request(app).post("/api/auth/sign-in").send({
      email: "test@test.com",
      password: "password123",
    });

    expect(response.status).toBe(500);
  });
});
