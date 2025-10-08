// AP2 (Agent Payments Protocol) Type Definitions
// Based on https://github.com/google-agentic-commerce/AP2

// JWT Payload Types for AP2 Mandates
export interface CartMandateJWTPayload {
  iss: string; // Merchant identifier
  sub: string; // Subject (merchant agent)
  aud: string; // Audience (payment processor)
  cart_id: string;
  cart_hash: string;
  iat?: number; // Issued at
  exp?: number; // Expiration
  jti?: string; // JWT ID
}

export interface PaymentMandateJWTPayload {
  iss: string; // User's decentralized identifier
  sub: string; // Subject (user credential)
  aud: string; // Audience (merchant)
  payment_mandate_id: string;
  mandate_hash: string;
  transaction_data: string[];
  iat?: number; // Issued at
  exp?: number; // Expiration
  jti?: string; // JWT ID
}

// W3C Payment Request API Types
export interface PaymentCurrencyAmount {
  currency: string; // ISO 4217 currency code (e.g., "USD")
  value: number;
}

export interface PaymentItem {
  label: string;
  amount: PaymentCurrencyAmount;
  pending?: boolean;
  refund_period?: number; // in days
}

export interface PaymentShippingOption {
  id: string;
  label: string;
  amount: PaymentCurrencyAmount;
  selected?: boolean;
}

export interface PaymentMethodData {
  supported_methods: string;
  data?: Record<string, any>;
}

export interface ContactAddress {
  country?: string;
  addressLine?: string[];
  region?: string;
  city?: string;
  dependentLocality?: string;
  postalCode?: string;
  sortingCode?: string;
  organization?: string;
  recipient?: string;
  phone?: string;
}

export interface PaymentOptions {
  request_payer_name?: boolean;
  request_payer_email?: boolean;
  request_payer_phone?: boolean;
  request_shipping?: boolean;
  shipping_type?: "shipping" | "delivery" | "pickup";
}

export interface PaymentDetailsInit {
  id: string;
  display_items: PaymentItem[];
  shipping_options?: PaymentShippingOption[];
  total: PaymentItem;
}

export interface PaymentRequest {
  method_data: PaymentMethodData[];
  details: PaymentDetailsInit;
  options?: PaymentOptions;
  shipping_address?: ContactAddress;
}

export interface PaymentResponse {
  request_id: string;
  method_name: string;
  details?: Record<string, any>;
  shipping_address?: ContactAddress;
  shipping_option?: PaymentShippingOption;
  payer_name?: string;
  payer_email?: string;
  payer_phone?: string;
}

// AP2 Mandate Types

/**
 * IntentMandate represents the user's purchase intent
 * Used in both human-present and human-not-present flows
 */
export interface IntentMandate {
  user_cart_confirmation_required: boolean;
  natural_language_description: string;
  merchants?: string[];
  skus?: string[];
  requires_refundability?: boolean;
  intent_expiry: string; // ISO 8601 format
}

/**
 * CartContents contains the detailed contents of a cart
 * This object is signed by the merchant to create a CartMandate
 */
export interface CartContents {
  id: string;
  user_cart_confirmation_required: boolean;
  payment_request: PaymentRequest;
  cart_expiry: string; // ISO 8601 format
  merchant_name: string;
}

/**
 * CartMandate is a cart whose contents have been digitally signed by the merchant
 * Serves as a guarantee of items and price for a limited time
 */
export interface CartMandate {
  contents: CartContents;
  merchant_authorization?: string; // JWT signature
}

/**
 * PaymentMandateContents contains the data for a PaymentMandate
 */
export interface PaymentMandateContents {
  payment_mandate_id: string;
  payment_details_id: string;
  payment_details_total: PaymentItem;
  payment_response: PaymentResponse;
  merchant_agent: string;
  timestamp: string; // ISO 8601 format
}

/**
 * PaymentMandate contains the user's instructions & authorization for payment
 * Provides visibility into the agentic transaction to the payments ecosystem
 */
export interface PaymentMandate {
  payment_mandate_contents: PaymentMandateContents;
  user_authorization?: string; // Verifiable credential
}

// Agent Types

export interface PaymentMethod {
  id: string;
  alias: string;
  type: "card" | "bank" | "wallet";
  last4?: string;
  brand?: string;
}

export interface VacationPackage {
  id: string;
  name: string;
  destination: string;
  region: "Asia" | "Europe" | "Africa" | "North America" | "Central America" | "South America" | "Australia/Oceania";
  activities: string[];
  description: string;
  price: number;
  currency: string;
  duration_days?: number;
  includes?: string[];
  image_url?: string;
  available_dates?: string[];
}

// Agent Communication Types

export type AgentRole = "shopping_agent" | "merchant_agent" | "credentials_provider";

export interface AgentMessage {
  role: AgentRole;
  type: "text" | "intent_mandate" | "cart_mandate" | "payment_mandate" | "payment_method";
  content: string;
  data?: IntentMandate | CartMandate | CartMandate[] | PaymentMandate | PaymentMethod | PaymentMethod[];
  timestamp: string;
}

export interface TransactionState {
  step: "intent" | "browsing" | "cart_selected" | "payment_method" | "confirm" | "processing" | "complete";
  intent_mandate?: IntentMandate;
  available_carts?: CartMandate[];
  selected_cart?: CartMandate;
  available_payment_methods?: PaymentMethod[];
  selected_payment_method?: PaymentMethod;
  payment_mandate?: PaymentMandate;
  shipping_address?: ContactAddress;
}

