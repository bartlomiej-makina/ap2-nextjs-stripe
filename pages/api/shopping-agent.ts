import type { NextApiRequest, NextApiResponse } from "next";
import { A2AMessageBuilder } from "../../lib/a2a-protocol";
import { signPaymentMandate } from "../../lib/jwt-utils";
import { VacationBookingAgent } from "../../lib/ai-agent";

/**
 * Shopping Agent API with A2A Protocol
 * Orchestrates the vacation booking flow using agent-to-agent communication
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Set OpenRouter API key
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: "OPENROUTER_API_KEY not configured. Please set up your .env.local file.",
        details: "Get your API key from https://openrouter.ai/keys"
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = process.env.OPENROUTER_API_KEY;
    }

    const { message, action, contextId, data, conversationHistory } = req.body;

    if (!message && !action) {
      return res.status(400).json({ error: "Message or action is required" });
    }

    const context_id = contextId || `ctx-${Date.now()}`;

    // Handle different actions
    if (action === "search_vacations") {
      // Create agent with existing history or new
      const history = conversationHistory 
        ? VacationBookingAgent.deserializeHistory(conversationHistory)
        : undefined;
      const agent = new VacationBookingAgent(history);
      
      // Get AI response to understand intent
      const aiResult = await agent.chat(message);

      // Extract full conversation context from agent history
      const agentHistory = agent.getConversationHistory();
      const conversationContext = agentHistory
        .filter((msg: any) => msg._getType() === "human")
        .map((msg: any) => msg.content)
        .join(" | ");

      // Create Intent Mandate with full conversation context
      const intentMandate = {
        user_cart_confirmation_required: true,
        natural_language_description: conversationContext || message,
        requires_refundability: true,
        intent_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      // Send A2A message to Merchant Agent
      const merchantMessage = new A2AMessageBuilder()
        .setContextId(context_id)
        .addText("Find vacation packages matching user's intent")
        .addData("ap2.mandates.IntentMandate", intentMandate)
        .addData("shopping_agent_id", "trusted_shopping_agent")
        .build();

      // Call Merchant Agent API
      const merchantResponse = await fetch(`${getBaseUrl(req)}/api/agents/merchant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merchantMessage),
      });

      const merchantResult = await merchantResponse.json();
      const merchantA2AResponse = merchantResult.task.result;

      // Extract cart mandates from merchant response
      const cartMandates = merchantA2AResponse.parts.find(
        (p: any) => p.type === "data" && p.data.cart_mandates
      )?.data.cart_mandates || [];

      return res.status(200).json({
        response: aiResult.response,
        intent_mandate: intentMandate,
        cart_mandates: cartMandates,
        context_id,
        conversationHistory: agent.serializeHistory(), // Send back updated history
      });
    } else if (action === "get_payment_methods") {
      // Send A2A message to Credentials Provider
      const cpMessage = new A2AMessageBuilder()
        .setContextId(context_id)
        .addText("Get available payment methods for user")
        .addData("action", "get_payment_methods")
        .addData("shopping_agent_id", "trusted_shopping_agent")
        .build();

      const cpResponse = await fetch(`${getBaseUrl(req)}/api/agents/credentials-provider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cpMessage),
      });

      const cpResult = await cpResponse.json();
      const cpA2AResponse = cpResult.task.result;

      // Extract payment methods
      const paymentMethods = cpA2AResponse.parts.find(
        (p: any) => p.type === "data" && p.data.payment_methods
      )?.data.payment_methods || [];

      return res.status(200).json({
        payment_methods: paymentMethods,
        context_id,
      });
    } else if (action === "create_payment_mandate") {
      // Create and sign Payment Mandate
      const { cartMandate, paymentMethod } = data;

      if (!cartMandate || !paymentMethod) {
        return res.status(400).json({ error: "Cart mandate and payment method required" });
      }

      const paymentMandateContents = {
        payment_mandate_id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        payment_details_id: cartMandate.contents.payment_request.details.id,
        payment_details_total: cartMandate.contents.payment_request.details.total,
        payment_response: {
          request_id: cartMandate.contents.payment_request.details.id,
          method_name: paymentMethod.type,
          details: {
            payment_method_id: paymentMethod.id,
          },
          // DEMO: In production, collect actual user information
          payer_email: "user@example.com",
          payer_name: "Demo User",
        },
        merchant_agent: cartMandate.contents.merchant_name,
        timestamp: new Date().toISOString(),
      };

      // Sign the payment mandate (simulates user signing on device)
      const userAuthorization = await signPaymentMandate(paymentMandateContents);

      const paymentMandate = {
        payment_mandate_contents: paymentMandateContents,
        user_authorization: userAuthorization,
      };

      return res.status(200).json({
        payment_mandate: paymentMandate,
        context_id,
      });
    } else {
      // Default: Just get AI response
      const history = conversationHistory 
        ? VacationBookingAgent.deserializeHistory(conversationHistory)
        : undefined;
      const agent = new VacationBookingAgent(history);
      const result = await agent.chat(message);

      return res.status(200).json({
        response: result.response,
        context_id,
        conversationHistory: agent.serializeHistory(), // Send back updated history
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to process request",
      details: error.message,
    });
  }
}

function getBaseUrl(req: NextApiRequest): string {
  const protocol = req.headers.host?.includes("localhost") ? "http" : "https";
  return `${protocol}://${req.headers.host}`;
}

