"use client";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Message } from "../types/chat";
import { Message as MessageComponent } from "@/components/message";
import { useChat } from "ai/react";

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<string>("");
  const [htmlCode, setHtmlCode] = useState<string>("");

  // Use effect for navigation
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      onResponse: (response) => {
        // This will be called when we receive a response
        const reader = response.body?.getReader();
        if (!reader) return;
        // Process the response to extract HTML code
        processResponse(reader);
      },
    });

  const processResponse = async (
    reader: ReadableStreamDefaultReader<Uint8Array>
  ) => {
    const decoder = new TextDecoder();
    let done = false;
    let accumulatedResponse = "";
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        accumulatedResponse += chunk;
        // Try to extract HTML code from the response
        const htmlMatch = accumulatedResponse.match(/```html([\s\S]*?)```/);
        if (htmlMatch && htmlMatch[1]) {
          setHtmlCode(htmlMatch[1].trim());
          setPreview(htmlMatch[1].trim());
        }
      }
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  // Return early if not authenticated (the useEffect will handle redirect)
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex h-screen">
      {/* Chat section */}
      <div className="flex flex-col w-1/2 p-4 border-r">
        <h1 className="text-2xl font-bold mb-4">HTML & CSS Generator</h1>
        <div className="flex-grow overflow-auto mb-4 space-y-4">
          {messages.map((message, index) => (
            <MessageComponent key={index} message={message as Message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Describe the HTML & CSS you want to generate..."
            disabled={isLoading}
            className="flex-grow"
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate"}
          </Button>
        </form>
      </div>
      {/* Preview section */}
      <div className="w-1/2 p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Preview</h2>
        <div className="flex-grow overflow-auto">
          {preview ? (
            <div className="space-y-4">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <iframe
                    srcDoc={preview}
                    className="w-full h-64 border-0"
                    title="HTML Preview"
                  />
                </CardContent>
              </Card>
              <Separator />
              <div>
                <h3 className="text-lg font-medium mb-2">Generated Code</h3>
                <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                  <code>{htmlCode}</code>
                </pre>
              </div>
              <Button
                onClick={() => {
                  const blob = new Blob([htmlCode], { type: "text/html" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "generated-page.html";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                Download HTML
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Your preview will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
