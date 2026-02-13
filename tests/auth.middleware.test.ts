import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../src/auth.middleware";

vi.mock("jsonwebtoken");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authenticateToken middleware", () => {
  it("should return 401 if token is missing", () => {
    const req = {
      headers: {},
    } as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token manquant" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if authorization header is malformed", () => {
    const req = {
      headers: {
        authorization: "InvalidFormat",
      },
    } as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token manquant" });
  });

  it("should decode token and set req.user when token is valid", () => {
    const token = "valid-token";
    const decoded = {
      userId: 1,
      email: "test@test.com",
    };

    (jwt.verify as any).mockReturnValue(decoded);

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    authenticateToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
    expect(req.user).toEqual({
      userId: 1,
      email: "test@test.com",
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should return 401 if token is invalid", () => {
    const token = "invalid-token";

    (jwt.verify as any).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Token invalide ou expiré",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if token is expired", () => {
    const token = "expired-token";

    (jwt.verify as any).mockImplementation(() => {
      throw new jwt.TokenExpiredError("Token expired", new Date());
    });

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Token invalide ou expiré",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should handle Bearer token correctly", () => {
    const token = "valid-bearer-token";
    const decoded = {
      userId: 42,
      email: "user@example.com",
    };

    (jwt.verify as any).mockReturnValue(decoded);

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    authenticateToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
    expect(req.user).toEqual({
      userId: 42,
      email: "user@example.com",
    });
    expect(next).toHaveBeenCalled();
  });
});
