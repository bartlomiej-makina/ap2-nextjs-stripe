/**
 * Agent-to-Agent (A2A) Protocol Implementation
 * Based on https://a2a-protocol.org/
 */

export interface TextPart {
  type: "text";
  text: string;
}

export interface DataPart {
  type: "data";
  data: Record<string, any>;
}

export type Part = TextPart | DataPart;

export interface A2AMessage {
  message_id: string;
  context_id?: string;
  task_id?: string;
  role: "agent" | "user";
  parts: Part[];
  timestamp: string;
}

export interface A2ATask {
  id: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  result?: any;
  error?: string;
}

/**
 * A2A Message Builder - Creates properly formatted A2A messages
 */
export class A2AMessageBuilder {
  private message: A2AMessage;

  constructor() {
    this.message = {
      message_id: this.generateId(),
      role: "agent",
      parts: [],
      timestamp: new Date().toISOString(),
    };
  }

  addText(text: string): this {
    this.message.parts.push({
      type: "text",
      text,
    });
    return this;
  }

  addData(key: string, data: any): this {
    const dataObj: Record<string, any> = {};
    dataObj[key] = data;
    
    this.message.parts.push({
      type: "data",
      data: dataObj,
    });
    return this;
  }

  setContextId(contextId: string): this {
    this.message.context_id = contextId;
    return this;
  }

  setTaskId(taskId: string): this {
    this.message.task_id = taskId;
    return this;
  }

  build(): A2AMessage {
    return this.message;
  }

  private generateId(): string {
    // DEMO: For production, use UUID v4 or a proper ID generation library like nanoid
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

/**
 * Extract data from A2A message parts
 */
export function extractDataFromMessage(message: A2AMessage, key: string): any {
  for (const part of message.parts) {
    if (part.type === "data" && part.data[key]) {
      return part.data[key];
    }
  }
  return null;
}

/**
 * Extract text from A2A message parts
 */
export function extractTextFromMessage(message: A2AMessage): string {
  const textParts = message.parts
    .filter((part): part is TextPart => part.type === "text")
    .map((part) => part.text);
  return textParts.join(" ");
}

