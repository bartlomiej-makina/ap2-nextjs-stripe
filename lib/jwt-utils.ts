/**
 * JWT Utilities for AP2 Mandate Signatures
 * Uses HS256 for demo (in production would use RS256 with RSA keys)
 */

import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";
import type { CartMandateJWTPayload, PaymentMandateJWTPayload } from "../types/ap2";

// Ensure JWT_SECRET is set (in production, use RSA private/public key pair)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is required. " +
    "Generate one with: openssl rand -base64 32"
  );
}
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

/**
 * Sign a Cart Mandate (Merchant signature)
 */
export async function signCartMandate(cartContents: any): Promise<string> {
  const cartHash = hashObject(cartContents);

  const jwt = await new SignJWT({
    iss: "tropical-paradise-vacations", // Merchant identifier
    sub: "merchant-agent-001",
    aud: "payment-processor",
    cart_id: cartContents.id,
    cart_hash: cartHash,
  })
    .setProtectedHeader({ alg: "HS256", kid: "merchant-key-2024" })
    .setIssuedAt()
    .setExpirationTime("15m") // Cart signature expires in 15 minutes
    .setJti(`jwt-${cartContents.id}`)
    .sign(SECRET_KEY);

  return jwt;
}

/**
 * Sign a Payment Mandate (User signature - simulated)
 */
export async function signPaymentMandate(paymentMandateContents: any): Promise<string> {
  const mandateHash = hashObject(paymentMandateContents);

  // Simulates user signing with their device credential
  const jwt = await new SignJWT({
    iss: "did:example:user123", // User's decentralized identifier
    sub: "user-credential",
    aud: "merchant",
    payment_mandate_id: paymentMandateContents.payment_mandate_id,
    mandate_hash: mandateHash,
    transaction_data: [mandateHash], // In real AP2, includes cart hash too
  })
    .setProtectedHeader({ alg: "HS256", kid: "user-key-2024" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .setJti(`user-sig-${paymentMandateContents.payment_mandate_id}`)
    .sign(SECRET_KEY);

  return jwt;
}

/**
 * Verify a JWT signature (for demo purposes)
 */
export async function verifyJWT(token: string): Promise<CartMandateJWTPayload | PaymentMandateJWTPayload> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as CartMandateJWTPayload | PaymentMandateJWTPayload;
  } catch (error) {
    throw new Error(`JWT verification failed: ${error}`);
  }
}

/**
 * Create a secure hash of an object
 */
export function hashObject(obj: any): string {
  const canonicalJson = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash("sha256").update(canonicalJson).digest("hex");
}

/**
 * Decode JWT without verification (for inspection)
 */
export function decodeJWT(token: string): { header: any; payload: any } {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  return {
    header: JSON.parse(Buffer.from(parts[0], "base64url").toString()),
    payload: JSON.parse(Buffer.from(parts[1], "base64url").toString()),
  };
}

