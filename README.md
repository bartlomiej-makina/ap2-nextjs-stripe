# AP2 with A2A Protocol - Complete Implementation

> **Full demonstration of Agent Payments Protocol (AP2) with full Agent-to-Agent (A2A) communication**

This project showcases a **complete, working implementation** of Google's Agent Payments Protocol (AP2) with real A2A message exchange, cryptographic JWT signatures, AI agents, and actual payment processing. Experience the future of agentic commerce!

## What is AP2?

**Agent Payments Protocol (AP2)** is an open protocol for the emerging Agent Economy, designed to enable secure, reliable, and interoperable agent commerce. It uses **Verifiable Digital Credentials (VDCs)** to engineer trust in AI-driven transactions.

### Key Concepts Demonstrated:

- **Intent Mandate**: Captures user's purchase intent with explicit consent
- **Cart Mandate**: Merchant-signed guarantee of items and pricing
- **Payment Mandate**: Cryptographically signed payment authorization
- **Agent-to-Agent Communication**: Shopping Agent, Merchant Agent, and Credentials Provider collaboration

## What Makes This Special

This is a implementation features:

### **Real A2A Protocol**
- Actual agent-to-agent message exchange between Shopping Agent, Merchant Agent, and Credentials Provider
- Visual A2A message log showing all inter-agent communication
- Proper A2A message structure with TextPart and DataPart

### **Real Cryptographic Security**
- JWT signatures on Cart Mandates (merchant authorization)
- JWT signatures on Payment Mandates (user authorization)
- SHA-256 hashing for mandate integrity
- Complete audit trail with non-repudiable proof

### **Real AI Agent**
- LangChain-powered Shopping Agent using Moonshot AI Kimi K2 (via OpenRouter)
- Natural language understanding of vacation preferences
- Intelligent package matching and recommendations

### **Real Payment Processing**
- Stripe integration in test mode
- W3C Payment Request API compliance
- Full payment flow from intent to confirmation

### **Beautiful, Transparent UI**
- Watch agents communicate in real-time
- See the exact data structures (mandates) being exchanged
- Visual step-by-step transaction flow
- Modern, responsive design with Chakra UI v3

## Quick Start

### Prerequisites

- Node.js 20 or later
- npm or yarn
- OpenRouter API key (get free at [openrouter.ai/keys](https://openrouter.ai/keys))
- Stripe test account (sign up at [stripe.com](https://stripe.com))

### Installation

1. **Install dependencies:**

```bash
npm install
# or
yarn install
```

2. **Set up environment variables:**

Copy the example environment file and fill in your API keys:

```bash
# Copy the template (or rename env.example to .env.local)
cp env.example .env.local
```

Then edit `.env.local` with your actual API keys:

```bash
# OpenRouter API Key (get from https://openrouter.ai/keys)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Stripe Keys (get from https://dashboard.stripe.com/test/apikeys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_here_min_32_chars
```

3. **Get your API keys:**

- **OpenRouter**: Visit [openrouter.ai/keys](https://openrouter.ai/keys), sign up, and create an API key
- **Stripe**: Visit [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) and copy your test keys

### Development

Start the development server:

```bash
npm run dev
# or
yarn dev
```

## How to Use the Demo

### Complete A2A Protocol Experience

1. **Chat with AI Shopping Agent**: Type your vacation preferences naturally
   - Example: "I want a tropical beach vacation with spa treatments"
   - Example: "Looking for an adventure trip in Central America"
   - Example: "Find me a luxury overwater villa experience"

2. **Watch A2A Messages**: See the Shopping Agent communicate with the Merchant Agent
   - Intent Mandate is created from your request
   - A2A message sent to Merchant Agent with Intent Mandate
   - Merchant Agent responds with signed Cart Mandates (JWT)

3. **View Signed Cart Mandates**: Browse vacation packages with cryptographic signatures
   - Each package is a Cart Mandate signed by the Merchant
   - Click "View Signature" to see the actual JWT

4. **Select Your Package**: Choose your preferred vacation

5. **Payment Method Selection**: 
   - Shopping Agent requests payment methods from Credentials Provider via A2A
   - See your available payment methods (from your "wallet")

6. **Payment Mandate Creation**: 
   - User device signs Payment Mandate with JWT
   - Watch the complete mandate chain: Intent → Cart → Payment

7. **Stripe Payment**: Complete real payment using Stripe test cards
   - **Success**: `4242 4242 4242 4242`
   - **Declined**: `4000 0000 0000 0002`
   - Use any future expiry date and any CVC

8. **A2A Message Log**: Watch the complete agent communication flow in the sidebar
   - Every agent interaction is logged
   - Full transparency and auditability

9. **Confirmation**: Receive your booking confirmation with all mandate details!

## Learn More About AP2

- [Official AP2 Documentation](https://ap2-protocol.org/)
- [AP2 GitHub Repository](https://github.com/google-agentic-commerce/AP2)
- [Google Cloud Blog Post](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol)

## Tech Stack

### Core Protocols
- **AP2 Protocol** - Agent Payments Protocol (Intent, Cart, Payment Mandates)
- **A2A Protocol** - Agent-to-Agent communication with message parts
- **JWT (jose)** - Cryptographic signatures for mandates
- **W3C Payment Request API** - Standard payment flow

### AI & Payments
- **LangChain** - AI agent framework
- **OpenRouter** - LLM API gateway (Moonshot AI Kimi model)
- **Stripe** - Payment processing
- **SHA-256** - Cryptographic hashing for integrity

### Frontend
- **Next.js 15** - React framework with Pages Router
- **Chakra UI v3** - Beautiful, accessible component library
- **TypeScript** - Type-safe development
- **React 19** - Latest React features

## Architecture Overview

### Three Agent Architecture (Separate API Endpoints)

1. **Shopping Agent** (`/api/shopping-agent`)
   - Orchestrates the entire transaction
   - Communicates with user via chat
   - Sends A2A messages to other agents
   - Creates Intent Mandates and Payment Mandates

2. **Merchant Agent** (`/api/agents/merchant`)
   - Receives A2A messages from Shopping Agent
   - Searches product catalog
   - Creates Cart Mandates
   - Signs Cart Mandates with JWT (merchant authorization)

3. **Credentials Provider Agent** (`/api/agents/credentials-provider`)
   - Manages user's payment credentials
   - Provides available payment methods via A2A
   - Validates Payment Mandates

### AP2 Mandates (Verifiable Digital Credentials)

- **`IntentMandate`** - User's purchase intent with expiry
- **`CartMandate`** - Merchant-signed cart with JWT authorization
- **`PaymentMandate`** - User-signed payment with JWT authorization

## Security & Trust

This demo showcases AP2's trust mechanisms:

- Cryptographic signatures on all mandates
- Non-repudiable proof of user intent
- Transparent audit trail of all transactions
- Role-based architecture for privacy

## Production Readiness

This is a **demo implementation**. For production, upgrade JWT from HS256 to RS256 with proper RSA key pairs.

## License

This project is MIT licensed. The AP2 reference implementation is Apache 2.0 licensed.

## Acknowledgments

- Built on [Google's Agent Payments Protocol (AP2)](https://github.com/google-agentic-commerce/AP2)
- Images provided by [Unsplash](https://unsplash.com)
