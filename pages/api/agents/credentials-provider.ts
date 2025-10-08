import type { NextApiRequest, NextApiResponse } from "next";
import { A2AMessageBuilder, extractDataFromMessage, extractTextFromMessage } from "../../../lib/a2a-protocol";
import { PaymentMethod } from "../../../types/ap2";

/**
 * Credentials Provider Agent API
 * Manages user's payment credentials and facilitates payment
 */

// Mock user wallet
const USER_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "pm-001",
    alias: "Primary Visa",
    type: "card",
    last4: "4242",
    brand: "Visa",
  },
  {
    id: "pm-002",
    alias: "Mastercard Rewards",
    type: "card",
    last4: "5555",
    brand: "Mastercard",
  },
  {
    id: "pm-003",
    alias: "Digital Wallet",
    type: "wallet",
  },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const a2aMessage = req.body;

    // DEMO ONLY: In production, implement proper agent authentication with verifiable credentials
    const shoppingAgentId = extractDataFromMessage(a2aMessage, "shopping_agent_id");
    if (shoppingAgentId !== "trusted_shopping_agent") {
      return res.status(401).json({ error: "Unauthorized shopping agent" });
    }

    const text = extractTextFromMessage(a2aMessage);
    const action = extractDataFromMessage(a2aMessage, "action");

    let responseMessage;

    if (action === "get_payment_methods" || text.toLowerCase().includes("payment method")) {
      // Return available payment methods
      responseMessage = new A2AMessageBuilder()
        .setContextId(a2aMessage.context_id)
        .addText(`Here are your available payment methods from your wallet.`)
        .addData("payment_methods", USER_PAYMENT_METHODS)
        .build();
    } else if (action === "initiate_payment") {
      // Handle payment initiation
      const paymentMandate = extractDataFromMessage(a2aMessage, "ap2.mandates.PaymentMandate");
      
      if (!paymentMandate) {
        throw new Error("Payment mandate required for payment initiation");
      }

      // In a real implementation, this would:
      // 1. Verify the payment mandate signature
      // 2. Extract payment details
      // 3. Communicate with payment processor
      // 4. Return payment status

      responseMessage = new A2AMessageBuilder()
        .setContextId(a2aMessage.context_id)
        .addText("Payment mandate received and verified.")
        .addData("payment_status", "ready")
        .build();
    } else {
      responseMessage = new A2AMessageBuilder()
        .setContextId(a2aMessage.context_id)
        .addText("Unknown action requested.")
        .build();
    }

    return res.status(200).json({
      task: {
        id: `task-${Date.now()}`,
        status: "completed",
        result: responseMessage,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to process credentials provider request",
      details: error.message,
    });
  }
}

