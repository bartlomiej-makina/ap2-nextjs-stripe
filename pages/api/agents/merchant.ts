import type { NextApiRequest, NextApiResponse } from "next";
import { A2AMessageBuilder, extractDataFromMessage } from "../../../lib/a2a-protocol";
import { signCartMandate } from "../../../lib/jwt-utils";
import { CartContents } from "../../../types/ap2";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { VACATION_PACKAGES, VacationPackage } from "../../../lib/vacation-catalog";

/**
 * Merchant Agent API
 * Handles product search and cart creation following AP2 protocol
 */

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

    const intentMandate = extractDataFromMessage(a2aMessage, "ap2.mandates.IntentMandate");

    // Find matching products based on intent using LLM
    const matchingProducts = await findMatchingProducts(
      intentMandate?.natural_language_description || ""
    );

    // Create Cart Mandates for each product
    const cartMandates = await Promise.all(
      matchingProducts.map(async (product) => {
        const cartContents: CartContents & { image_url?: string } = {
          id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          user_cart_confirmation_required: true,
          merchant_name: "Tropical Paradise Vacations",
          cart_expiry: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          image_url: product.image_url,
          payment_request: {
            method_data: [
              {
                supported_methods: "https://www.example.com/card",
                data: { supported_networks: ["visa", "mastercard", "amex"] },
              },
            ],
            details: {
              id: `payment-${Date.now()}`,
              display_items: [
                {
                  label: product.name,
                  amount: {
                    currency: product.currency,
                    value: product.price * 0.85,
                  },
                  refund_period: 30,
                },
                {
                  label: "Travel Insurance",
                  amount: {
                    currency: product.currency,
                    value: product.price * 0.05,
                  },
                },
                {
                  label: "Service Fee",
                  amount: {
                    currency: product.currency,
                    value: product.price * 0.10,
                  },
                },
              ],
              total: {
                label: "Total Amount",
                amount: {
                  currency: product.currency,
                  value: product.price,
                },
                refund_period: 30,
              },
            },
            options: {
              request_payer_email: true,
              request_payer_name: true,
              request_shipping: false,
            },
          },
        };

        // Merchant signs the cart (real JWT)
        const merchantAuthorization = await signCartMandate(cartContents);

        return {
          contents: cartContents,
          merchant_authorization: merchantAuthorization,
        };
      })
    );

    // Build A2A response message
    const responseMessage = new A2AMessageBuilder()
      .setContextId(a2aMessage.context_id)
      .addText(`Found ${cartMandates.length} vacation packages matching your request.`)
      .addData("cart_mandates", cartMandates)
      .build();

    return res.status(200).json({
      task: {
        id: `task-${Date.now()}`,
        status: "completed",
        result: responseMessage,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to process merchant request",
      details: error.message,
    });
  }
}

/**
 * Use LLM to intelligently select matching products based on user intent
 */
async function findMatchingProducts(userIntent: string): Promise<VacationPackage[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    return VACATION_PACKAGES.slice(0, 3);
  }

  const model = new ChatOpenAI({
    modelName: "moonshotai/kimi-k2-0905",
    temperature: 0.3,
    openAIApiKey: apiKey,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://ap2-vacation-demo.vercel.app",
        "X-Title": "AP2 Vacation Booking Demo",
      },
    },
  });

  const selectionPrompt = `Select vacation packages matching this user request: "${userIntent}"

Available packages:
${VACATION_PACKAGES.map(pkg => 
  `- ${pkg.id}: ${pkg.name} - $${pkg.price} USD (${pkg.region}, ${pkg.activities.join(", ")})`
).join('\n')}

Return a JSON object with an array of package IDs that match the user's criteria.
Match by region, activities, AND price/budget constraints. Return 1-3 packages that best fit.

Example responses:
{"package_ids": ["vac-001", "vac-002"]}
{"package_ids": ["vac-003"]}
{"package_ids": ["vac-001", "vac-002", "vac-005"]}`;

  try {
    const response = await model.invoke([
      new SystemMessage("You are a vacation package selector. Return valid JSON only."),
      new HumanMessage(selectionPrompt)
    ]);
    
    const content = response.content as string;
    
    let jsonStr = content.trim();
    if (jsonStr.includes('```')) {
      const match = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (match) jsonStr = match[1];
    }
    
    const result = JSON.parse(jsonStr);
    const selectedIds = result.package_ids || [];
    
    const selectedPackages: VacationPackage[] = selectedIds
      .map((id: string) => VACATION_PACKAGES.find((pkg: VacationPackage) => pkg.id === id))
      .filter(Boolean) as VacationPackage[];
    
    return selectedPackages.slice(0, 3);
  } catch (error) {
    return VACATION_PACKAGES.slice(0, 3);
  }
}

