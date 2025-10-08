import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Box, Button, VStack, Text, Spinner, Code } from "@chakra-ui/react";

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

interface CheckoutFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

function CheckoutForm({ onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Payment failed");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess();
      }
    } catch (err: any) {
      onError(err.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch">
        <PaymentElement />
        <Button
          type="submit"
          colorPalette="green"
          size="lg"
          disabled={!stripe || isProcessing}
          w="full"
        >
          {isProcessing ? <Spinner size="sm" /> : "Confirm Payment"}
        </Button>
      </VStack>
    </form>
  );
}

interface StripeCheckoutProps {
  amount: number;
  currency: string;
  packageName: string;
  cartId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export default function StripeCheckout({
  amount,
  currency,
  packageName,
  cartId,
  onSuccess,
  onError,
}: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Check if Stripe is configured
  if (!STRIPE_KEY) {
    return (
      <Box p={6} bg="red.50" borderRadius="md" borderWidth={1} borderColor="red.200">
        <VStack align="start" gap={3}>
          <Text fontWeight="bold" color="red.800">⚠️ Stripe Not Configured</Text>
          <Text fontSize="sm">Please set up your environment variables:</Text>
          <Code display="block" p={3} fontSize="xs" whiteSpace="pre" overflowX="auto">
{`Create a file named .env.local in the root directory:

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here`}
          </Code>
          <Text fontSize="sm" color="red.700">
            Get your keys from: <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'underline'}}>Stripe Dashboard</a>
          </Text>
          <Text fontSize="xs" color="gray.600">After adding the file, restart the dev server (npm run dev)</Text>
        </VStack>
      </Box>
    );
  }

  useEffect(() => {
    // Create payment intent when component mounts
    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency, packageName, cartId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          onError("Failed to initialize payment");
        }
        setLoading(false);
      })
      .catch((err) => {
        onError(err.message);
        setLoading(false);
      });
  }, [amount, currency, packageName, cartId, onError]);

  if (loading || !clientSecret) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" />
        <Text mt={4}>Initializing secure payment...</Text>
      </Box>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: "stripe" as const,
    },
  };

  if (!stripePromise) {
    return (
      <Box p={4} bg="red.50" borderRadius="md">
        <Text color="red.800">Failed to initialize Stripe</Text>
      </Box>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}

