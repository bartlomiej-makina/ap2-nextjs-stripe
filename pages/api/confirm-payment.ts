import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "STRIPE_SECRET_KEY is not set. " +
    "Please add it to your .env.local file. " +
    "Get your key from https://dashboard.stripe.com/test/apikeys"
  );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: "Payment intent ID is required" });
    }

    // Retrieve the payment intent to check its status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      return res.status(200).json({
        success: true,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      });
    } else {
      return res.status(200).json({
        success: false,
        status: paymentIntent.status,
        error: "Payment not yet completed",
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to confirm payment",
      details: error.message,
    });
  }
}

