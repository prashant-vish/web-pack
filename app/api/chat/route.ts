import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/app/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Define types for messages
interface Message {
  role: "user" | "system" | "assistant" | "model";
  content: string;
}

interface RequestBody {
  messages: Message[];
}

interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// System prompt optimized for HTML & CSS generation
const systemPrompt = `
You are an expert HTML and CSS developer specializing in creating landing pages.

Your task is to generate clean, responsive HTML & CSS code based on user descriptions.

Guidelines:
1. Always generate a complete HTML page with embedded CSS
2. Focus on creating attractive, modern designs
3. Use semantic HTML elements
4. Ensure the page is responsive and mobile-friendly
5. Include comments to explain key sections
6. All CSS should be embedded in a <style> tag within the <head>
7. Do not use external libraries or frameworks
8. Make sure the page is visually appealing
9. Use best practices for HTML and CSS
10. Optimize for fast loading

For landing pages, include:
- A clear headline
- An appealing hero section
- Call-to-action buttons
- Clean sections with proper spacing
- A simple footer

Your responses should be only the HTML code, enclosed in \`\`\`html and \`\`\` tags.
`;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { messages }: RequestBody = await req.json();

    // Get the user's message (last message in the array)
    const userMessage = messages[messages.length - 1].content;

    // Create a Gemini model instance
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Convert previous messages to Gemini format
    const historyMessages: GeminiMessage[] = [
      {
        role: "user",
        parts: [
          { text: "I need you to follow these instructions: " + systemPrompt },
        ],
      },
      {
        role: "model",
        parts: [
          {
            text: "I understand and will follow your instructions to create HTML and CSS landing pages.",
          },
        ],
      },
      // Add previous messages to history if needed
      ...messages.slice(0, -1).map(
        (msg: Message) =>
          ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
          } as GeminiMessage)
      ),
    ];

    // Prepare the chat
    const chat = model.startChat({
      history: historyMessages,
    });

    // Store the chat in the database first
    const chatId = await saveChatToDB(session.user.id, messages);

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send the message and get the streaming response
          const streamingResponse = await chat.sendMessageStream(userMessage);

          // Process each chunk as it comes in
          for await (const chunk of streamingResponse.stream) {
            const text = chunk.text();

            // Encode the text as bytes and send it to the client
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify({ text }) + "\n")
            );
          }

          // Signal that we're done sending data
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    // Return the streaming response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { message: "An error occurred during chat" },
      { status: 500 }
    );
  }
}

async function saveChatToDB(userId: string, messages: Message[]) {
  try {
    const chat = await prisma.chat.create({
      data: {
        userId,
        messages: {
          create: messages.map((message) => ({
            content: message.content,
            role: message.role,
          })),
        },
      },
    });
    return chat.id;
  } catch (error) {
    console.error("Error saving chat to database:", error);
    throw error;
  }
}
