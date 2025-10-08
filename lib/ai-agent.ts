import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { VACATION_PACKAGES } from "./vacation-catalog";

export class VacationBookingAgent {
  private model: ChatOpenAI;
  private conversationHistory: Array<SystemMessage | HumanMessage | AIMessage> = [];

  constructor(existingHistory?: Array<SystemMessage | HumanMessage | AIMessage>) {
    // Initialize OpenRouter with LangChain
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY is not set. " +
        "Please add it to your .env.local file. " +
        "Get your API key from https://openrouter.ai/keys"
      );
    }

    this.model = new ChatOpenAI({
      modelName: "moonshotai/kimi-k2-0905", // Free model on OpenRouter
      temperature: 0.7,
      openAIApiKey: apiKey, // LangChain uses this parameter name even for OpenRouter
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://ap2-vacation-demo.vercel.app",
          "X-Title": "AP2 Vacation Booking Demo",
        },
      },
    });

    // Restore existing history or initialize with system prompt
    if (existingHistory && existingHistory.length > 0) {
      this.conversationHistory = existingHistory;
    } else {
      // System prompt defining the agent's role
      this.conversationHistory.push(
        new SystemMessage(`You are an AI vacation booking assistant using the Agent Payments Protocol (AP2).

Your role:
- Help users find their perfect vacation through conversation
- Ask clarifying questions about their preferences (budget, destination type, activities, dates)
- Describe our available packages in a helpful, conversational way
- Guide them through the AP2 payment flow

IMPORTANT: You can ONLY recommend destinations that exist in our catalog. Do NOT suggest or mention destinations we don't offer.

Available packages:
${VACATION_PACKAGES.map(pkg => 
  `- ${pkg.name}: ${pkg.destination} (${pkg.region}, ${pkg.activities.join(", ")}) - $${pkg.price}`
).join('\n')}

When users ask about a region or activities, ONLY describe matching destinations from our catalog.
The Merchant Agent will select and present 1-3 matching packages based on the conversation.

Be friendly, helpful, and concise. Always prioritize user control and transparency.`)
      );
    }
  }

  async chat(userMessage: string): Promise<{
    response: string;
    action?: "create_intent_mandate";
    data?: any;
  }> {
    // Add user message to history
    this.conversationHistory.push(new HumanMessage(userMessage));

    // Get AI response
    const response = await this.model.invoke(this.conversationHistory);
    const aiMessage = response.content as string;

    // Add AI response to history
    this.conversationHistory.push(new AIMessage(aiMessage));

    // Parse response for actions
    let action: "create_intent_mandate" | undefined = undefined;
    let data: any = undefined;

    // Check if AI wants to create intent mandate
    if (aiMessage.includes("CREATE_INTENT_MANDATE")) {
      action = "create_intent_mandate";
      data = this.extractIntentFromConversation();
    }

    // Clean up the response (remove action markers)
    const cleanResponse = aiMessage
      .replace(/CREATE_INTENT_MANDATE/g, "")
      .trim();

    return {
      response: cleanResponse,
      action: action as "create_intent_mandate" | undefined,
      data,
    };
  }

  private extractIntentFromConversation(): any {
    // Simple extraction - in production, use more sophisticated NLP
    const recentMessages = this.conversationHistory.slice(-5);
    const conversationText = recentMessages
      .map((m) => (m instanceof HumanMessage ? m.content : ""))
      .join(" ");

    return {
      natural_language_description: conversationText,
      user_cart_confirmation_required: true,
      requires_refundability: true,
      intent_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  reset() {
    this.conversationHistory = this.conversationHistory.slice(0, 1); // Keep system message
  }

  // Serialize history for passing between requests
  serializeHistory(): any[] {
    return this.conversationHistory.map(msg => ({
      type: msg._getType(),
      content: msg.content
    }));
  }

  // Deserialize history from serialized format
  static deserializeHistory(serialized: any[]): Array<SystemMessage | HumanMessage | AIMessage> {
    return serialized.map(msg => {
      switch (msg.type) {
        case 'system': return new SystemMessage(msg.content);
        case 'human': return new HumanMessage(msg.content);
        case 'ai': return new AIMessage(msg.content);
        default: throw new Error(`Unknown message type: ${msg.type}`);
      }
    });
  }
}

