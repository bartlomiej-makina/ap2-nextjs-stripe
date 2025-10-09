import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Badge,
  Card,
  Grid,
  Image,
  Collapsible,
} from "@chakra-ui/react";
import { FiSend, FiPackage, FiCreditCard, FiCheckCircle, FiChevronDown, FiChevronUp, FiServer } from "react-icons/fi";
import { CartMandate } from "../types/ap2";
import StripeCheckout from "../components/StripeCheckout";

type MessageRole = "user" | "assistant" | "system";

interface Message {
  role: MessageRole;
  content: string;
  packages?: CartMandate[];
  showPayment?: boolean;
  showRetry?: boolean;
  agent?: string;
}

interface A2ALog {
  from: string;
  to: string;
  action: string;
  timestamp: string;
  data?: any;
}

export default function VacationBookingA2A() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CartMandate | null>(null);
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [contextId, setContextId] = useState("");
  const [a2aLogs, setA2aLogs] = useState<A2ALog[]>([]);
  const [showA2ALogs, setShowA2ALogs] = useState(true);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: "👋 Welcome to the AP2 A2A Demo! I'm your Shopping Agent. Behind the scenes, I'll communicate with:\n\n• 🏨 Merchant Agent (finds vacation packages)\n• 💳 Credentials Provider (manages your payment methods)\n• 🔐 All using A2A Protocol with real JWT signatures\n\nWhat kind of vacation are you looking for?",
        agent: "Shopping Agent",
      },
    ]);
  }, []);

  const addMessage = React.useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const addA2ALog = React.useCallback((log: A2ALog) => {
    setA2aLogs((prev) => [...prev, log]);
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage = inputValue;
    setInputValue("");

    addMessage({
      role: "user",
      content: userMessage,
    });

    // Check if user wants to retry payment
    if (
      (userMessage.toLowerCase().includes("retry") || 
       userMessage.toLowerCase().includes("try again") ||
       userMessage.toLowerCase().includes("again")) &&
      paymentFailed &&
      selectedPackage &&
      !paymentComplete
    ) {
      setPaymentFailed(false);
      
      // Hide retry button from previous messages
      setMessages((prev) => {
        return prev.map((msg) => {
          if (msg.showRetry) {
            return { ...msg, showRetry: false };
          }
          return msg;
        });
      });
      
      addMessage({
        role: "assistant",
        content: "🔄 Retrying payment... Creating a new payment mandate.",
        agent: "Shopping Agent",
      });
      
      handleConfirmPayment();
      return;
    }

    // Check if user is confirming payment
    if (
      (userMessage.toLowerCase().includes("yes") || userMessage.toLowerCase().includes("proceed")) &&
      selectedPackage &&
      !showStripeCheckout &&
      !paymentComplete
    ) {
      // Let the useEffect handle payment confirmation
      return;
    }

    setIsProcessing(true);

    try {
      // Log: User → Shopping Agent
      addA2ALog({
        from: "User",
        to: "Shopping Agent",
        action: "Request vacation search",
        timestamp: new Date().toISOString(),
        data: { message: userMessage },
      });

      // Call Shopping Agent with A2A protocol
      const response = await fetch("/api/shopping-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          action: "search_vacations",
          contextId,
          conversationHistory, // Pass conversation history
        }),
      });

      const data = await response.json();
      
      // Update conversation history from response
      if (data.conversationHistory) {
        setConversationHistory(data.conversationHistory);
      }

      if (data.error) {
        addMessage({
          role: "assistant",
          content: `Sorry, there was an error: ${data.error}`,
        });
        setIsProcessing(false);
        return;
      }

      // Log: Shopping Agent → Merchant Agent
      addA2ALog({
        from: "Shopping Agent",
        to: "Merchant Agent",
        action: "Find packages (A2A Message)",
        timestamp: new Date().toISOString(),
        data: { intent_mandate: data.intent_mandate },
      });

      // Log: Merchant Agent → Shopping Agent
      addA2ALog({
        from: "Merchant Agent",
        to: "Shopping Agent",
        action: `Return ${data.cart_mandates?.length || 0} Cart Mandates (signed with JWT)`,
        timestamp: new Date().toISOString(),
        data: { cart_count: data.cart_mandates?.length },
      });

      setContextId(data.context_id);

      addMessage({
        role: "assistant",
        content: data.response || "Here are the vacation packages I found:",
        packages: data.cart_mandates,
        agent: "Shopping Agent",
      });
    } catch (error) {
      addMessage({
        role: "assistant",
        content: "I apologize, but I'm having trouble processing your request.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectPackage = async (cartMandate: CartMandate) => {
    setSelectedPackage(cartMandate);

    addMessage({
      role: "assistant",
      content: `Great choice! You've selected: **${cartMandate.contents.payment_request.details.display_items[0].label}**\n\nNow let me get your available payment methods...`,
      agent: "Shopping Agent",
    });

    setIsProcessing(true);

    try {
      // Log: Shopping Agent → Credentials Provider
      addA2ALog({
        from: "Shopping Agent",
        to: "Credentials Provider",
        action: "Request payment methods (A2A Message)",
        timestamp: new Date().toISOString(),
      });

      // Get payment methods via A2A
      const response = await fetch("/api/shopping-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_payment_methods",
          contextId,
        }),
      });

      const data = await response.json();

      // Log: Credentials Provider → Shopping Agent
      addA2ALog({
        from: "Credentials Provider",
        to: "Shopping Agent",
        action: `Return ${data.payment_methods?.length || 0} payment methods`,
        timestamp: new Date().toISOString(),
        data: { payment_method_count: data.payment_methods?.length },
      });

      // Show payment methods in the message
      const methodsList = data.payment_methods
        .map((m: any) => `• ${m.alias} (${m.brand || m.type})`)
        .join("\n");

      addMessage({
        role: "assistant",
        content: `Your available payment methods:\n\n${methodsList}\n\nWould you like to proceed with payment? (Type "yes" to continue)`,
        agent: "Shopping Agent",
      });
    } catch (error) {
      addMessage({
        role: "assistant",
        content: "Error retrieving payment methods. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPayment = React.useCallback(async () => {
    if (!selectedPackage) return;

    setIsProcessing(true);

    try {
      // Log: Shopping Agent creates Payment Mandate
      addA2ALog({
        from: "Shopping Agent",
        to: "User Device",
        action: "Request signature for Payment Mandate",
        timestamp: new Date().toISOString(),
      });

      // Create signed Payment Mandate
      const response = await fetch("/api/shopping-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_payment_mandate",
          contextId,
          data: {
            cartMandate: selectedPackage,
            paymentMethod: { id: "pm-001", alias: "Primary Visa", type: "card" },
          },
        }),
      });

      const data = await response.json();

      // Log: User Device signs mandate
      addA2ALog({
        from: "User Device",
        to: "Shopping Agent",
        action: "Return signed Payment Mandate (JWT)",
        timestamp: new Date().toISOString(),
        data: { signed: true },
      });

      addMessage({
        role: "system",
        content: `✅ Payment Mandate signed successfully!\n\nMandate ID: ${data.payment_mandate.payment_mandate_contents.payment_mandate_id}\n\nProceeding to Stripe payment...`,
      });

      setShowStripeCheckout(true);
    } catch (error) {
      addMessage({
        role: "assistant",
        content: "Error creating payment mandate. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedPackage, contextId, addMessage, addA2ALog]);

  const handlePaymentSuccess = () => {
    setPaymentComplete(true);
    setShowStripeCheckout(false);

    // Log: Payment complete
    addA2ALog({
      from: "Stripe",
      to: "Shopping Agent",
      action: "Payment confirmed",
      timestamp: new Date().toISOString(),
      data: { status: "succeeded" },
    });

    if (selectedPackage) {
      addMessage({
        role: "assistant",
        content: `🎉 **Payment Successful!**\n\nYour vacation is booked!\n\n**Booking Confirmation**\n📦 ${selectedPackage.contents.payment_request.details.display_items[0].label}\n💰 Total: $${selectedPackage.contents.payment_request.details.total.amount.value.toLocaleString()} ${selectedPackage.contents.payment_request.details.total.amount.currency}\n🆔 Booking ID: ${selectedPackage.contents.id}\n\nA confirmation email has been sent. Have an amazing trip! 🏖️✨`,
        agent: "Shopping Agent",
      });
    }
  };

  const handlePaymentError = (error: string) => {
    setShowStripeCheckout(false);
    setPaymentFailed(true);
    
    // Log payment failure
    addA2ALog({
      from: "Stripe",
      to: "Shopping Agent",
      action: "Payment failed",
      timestamp: new Date().toISOString(),
      data: { error },
    });

    addMessage({
      role: "assistant",
      content: `❌ Payment failed: ${error}\n\n💡 Don't worry! You can try again. Type "retry" or click the retry button below to attempt payment again.`,
      agent: "Shopping Agent",
      showRetry: true,
    });
  };

  const handleRetryPayment = () => {
    setPaymentFailed(false);
    
    // Hide retry button from the last message
    setMessages((prev) => {
      const updated = [...prev];
      const lastMessage = updated[updated.length - 1];
      if (lastMessage && lastMessage.showRetry) {
        updated[updated.length - 1] = { ...lastMessage, showRetry: false };
      }
      return updated;
    });
    
    addMessage({
      role: "assistant",
      content: "🔄 Retrying payment... Creating a new payment mandate.",
      agent: "Shopping Agent",
    });
    
    handleConfirmPayment();
  };

  // Auto-detect payment confirmation
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (
        lastMessage.role === "user" &&
        (lastMessage.content.toLowerCase().includes("yes") ||
          lastMessage.content.toLowerCase().includes("proceed")) &&
        selectedPackage &&
        !showStripeCheckout &&
        !paymentComplete
      ) {
        handleConfirmPayment();
      }
    }
  }, [messages, selectedPackage, showStripeCheckout, paymentComplete, handleConfirmPayment]);

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.xl">
        <VStack gap={6} align="stretch">
          {/* Header */}
          <Card.Root>
            <Card.Body>
              <VStack align="start" gap={2}>
                <HStack>
                  <Heading size="2xl">AP2 with A2A Protocol</Heading>
                </HStack>
                <Text color="gray.600" fontSize="lg">
                  Watch agents communicate using A2A messages with real JWT signatures
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>

          <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6}>
            {/* Chat Area */}
            <Card.Root>
              <Card.Header>
                <Heading size="lg">💬 Conversation</Heading>
              </Card.Header>
              <Card.Body>
                <VStack align="stretch" gap={4} h="600px" overflowY="auto" pr={2}>
                  {messages.map((message, index) => (
                    <MessageBubble
                      key={index}
                      message={message}
                      onSelectPackage={handleSelectPackage}
                      onRetryPayment={handleRetryPayment}
                    />
                  ))}
                  {isProcessing && (
                    <Box alignSelf="start">
                      <Badge colorPalette="blue">Processing...</Badge>
                    </Box>
                  )}
                  <div ref={messagesEndRef} />
                </VStack>
              </Card.Body>
              <Card.Footer>
                <HStack w="full">
                  <Input
                    placeholder="Describe your dream vacation..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    disabled={isProcessing || showStripeCheckout}
                    size="lg"
                  />
                  <Button
                    colorPalette="blue"
                    onClick={handleSendMessage}
                    disabled={isProcessing || showStripeCheckout}
                    size="lg"
                  >
                    <Box as={FiSend} />
                  </Button>
                </HStack>
              </Card.Footer>
            </Card.Root>

            {/* Side Panel */}
            <VStack align="stretch" gap={4}>
              {/* A2A Communication Log */}
              <Card.Root borderColor="purple.300" borderWidth={2}>
                <Card.Header bg="purple.50" cursor="pointer" onClick={() => setShowA2ALogs(!showA2ALogs)}>
                  <HStack justify="space-between">
                    <HStack>
                      <Box as={FiServer} />
                      <Heading size="md">A2A Message Log</Heading>
                    </HStack>
                    <Box as={showA2ALogs ? FiChevronUp : FiChevronDown} />
                  </HStack>
                </Card.Header>
                <Collapsible.Root open={showA2ALogs}>
                  <Collapsible.Content>
                    <Card.Body>
                      <VStack align="stretch" gap={2} maxH="300px" overflowY="auto">
                        {a2aLogs.map((log, idx) => (
                          <Box key={idx} p={2} bg="purple.50" borderRadius="md" fontSize="xs">
                            <HStack justify="space-between" mb={1}>
                              <Badge colorPalette="purple" size="xs">
                                {log.from} → {log.to}
                              </Badge>
                              <Text color="gray.600">{new Date(log.timestamp).toLocaleTimeString()}</Text>
                            </HStack>
                            <Text fontWeight="bold">{log.action}</Text>
                          </Box>
                        ))}
                        {a2aLogs.length === 0 && (
                          <Text fontSize="sm" color="gray.500" textAlign="center">
                            No messages yet. Start chatting to see A2A protocol in action!
                          </Text>
                        )}
                      </VStack>
                    </Card.Body>
                  </Collapsible.Content>
                </Collapsible.Root>
              </Card.Root>

              {/* Stripe Checkout */}
              {showStripeCheckout && selectedPackage && (
                <Card.Root borderColor="green.500" borderWidth={2}>
                  <Card.Header bg="green.50">
                    <Heading size="md">Secure Payment</Heading>
                  </Card.Header>
                  <Card.Body>
                    <VStack gap={4}>
                      <Text fontWeight="bold">
                        Total: ${selectedPackage.contents.payment_request.details.total.amount.value.toLocaleString()}{" "}
                        {selectedPackage.contents.payment_request.details.total.amount.currency}
                      </Text>
                      <StripeCheckout
                        amount={selectedPackage.contents.payment_request.details.total.amount.value}
                        currency={selectedPackage.contents.payment_request.details.total.amount.currency}
                        packageName={selectedPackage.contents.payment_request.details.display_items[0].label}
                        cartId={selectedPackage.contents.id}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                      />
                    </VStack>
                  </Card.Body>
                </Card.Root>
              )}

              {/* Status */}
              <Card.Root>
                <Card.Header>
                  <Heading size="md">Status</Heading>
                </Card.Header>
                <Card.Body>
                  <VStack align="start" gap={3}>
                    <HStack>
                      <Box as={FiPackage} fontSize="lg" color={selectedPackage ? "green.500" : "gray.400"} />
                      <Text fontSize="sm">{selectedPackage ? "Package Selected ✓" : "Browsing packages"}</Text>
                    </HStack>
                    <HStack>
                      <Box as={FiCreditCard} fontSize="lg" color={paymentComplete ? "green.500" : showStripeCheckout ? "blue.500" : "gray.400"} />
                      <Text fontSize="sm">
                        {paymentComplete
                          ? "Payment Complete ✓"
                          : showStripeCheckout
                          ? "Processing payment..."
                          : "Awaiting payment"}
                      </Text>
                    </HStack>
                    <HStack>
                      <Box as={FiCheckCircle} fontSize="lg" color={paymentComplete ? "green.500" : "gray.400"} />
                      <Text fontSize="sm">{paymentComplete ? "Booking Confirmed! 🎉" : "Not confirmed"}</Text>
                    </HStack>
                  </VStack>
                </Card.Body>
              </Card.Root>
            </VStack>
          </Grid>
        </VStack>
      </Container>
    </Box>
  );
}

function MessageBubble({
  message,
  onSelectPackage,
  onRetryPayment,
}: {
  message: Message;
  onSelectPackage: (cart: CartMandate) => void;
  onRetryPayment: () => void;
}) {
  return (
    <Box alignSelf={message.role === "user" ? "end" : "start"} maxW={{ base: "100%", md: "80%" }}>
      {message.role !== "user" && (
        <Badge colorPalette={message.role === "system" ? "orange" : "blue"} mb={2}>
          {message.agent || (message.role === "system" ? "System" : "AI Assistant")}
        </Badge>
      )}
      <Card.Root bg={message.role === "user" ? "blue.50" : "white"} borderWidth={message.role === "user" ? 0 : 1}>
        <Card.Body>
          <Text whiteSpace="pre-wrap">{message.content}</Text>

          {message.showRetry && (
            <Button
              colorPalette="red"
              size="md"
              mt={4}
              onClick={onRetryPayment}
            >
              🔄 Retry Payment
            </Button>
          )}

          {message.packages && message.packages.length > 0 && (
            <VStack mt={4} gap={4} align="stretch">
              {message.packages.map((cart, idx) => {
                const item = cart.contents.payment_request.details.display_items[0];
                const total = cart.contents.payment_request.details.total;

                return (
                  <Card.Root key={idx} borderColor="purple.200" borderWidth={2}>
                    <Card.Body>
                      <Grid templateColumns="100px 1fr" gap={3}>
                        <Image
                          src={(cart.contents as any).image_url || `https://picsum.photos/seed/${cart.contents.id}/300/200`}
                          alt={item.label}
                          borderRadius="md"
                          objectFit="cover"
                          width="100px"
                          height="80px"
                        />
                        <VStack align="start" gap={1}>
                          <Heading size="sm">{item.label}</Heading>
                          <Text fontSize="lg" fontWeight="bold" color="purple.600">
                            ${total.amount.value.toLocaleString()} {total.amount.currency}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            Refundable within {item.refund_period} days
                          </Text>
                          <Button colorPalette="purple" size="xs" mt={1} onClick={() => onSelectPackage(cart)}>
                            Select This Package
                          </Button>
                        </VStack>
                      </Grid>
                    </Card.Body>
                  </Card.Root>
                );
              })}
            </VStack>
          )}
        </Card.Body>
      </Card.Root>
    </Box>
  );
}

