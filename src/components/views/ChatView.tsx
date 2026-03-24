import { useState, useRef, useEffect } from "react";
import { Send, Boxes, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConnections } from "@/hooks/useConnections";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "text" | "confirmation";
  confirmationData?: ConfirmationPayload;
}

interface ConfirmationPayload {
  action: "create_order";
  summary: string;
  payload: Record<string, unknown>;
  connectionId: string;
}

const suggestions = [
  "Show me all stock on hand",
  "What orders are due today?",
  "Show me low stock items",
  "Place an order for a product to an address",
];

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { data: connections } = useConnections();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text.trim(), type: "text" };
    const loadingMsg: Message = { id: "loading", role: "assistant", content: "", type: "text" };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.id !== "loading")
        .map((m) => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke("cartoncloud-ai-chat", {
        body: {
          message: text.trim(),
          history,
          connections: connections ?? [],
        },
      });

      if (error) throw error;

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply || "Sorry, I didn't get a response.",
        type: data.requiresConfirmation ? "confirmation" : "text",
        confirmationData: data.confirmationPayload
          ? {
              action: "create_order",
              summary: data.confirmationPayload.summary,
              payload: data.confirmationPayload.order,
              connectionId: data.confirmationPayload.connectionId,
            }
          : undefined,
      };

      setMessages((prev) => prev.filter((m) => m.id !== "loading").concat(assistantMsg));
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== "loading")
          .concat({
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Sorry, something went wrong: ${err.message || "Unknown error"}`,
            type: "text",
          })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (msg: Message) => {
    if (!msg.confirmationData) return;
    setIsLoading(true);

    // Remove confirmation buttons by converting to plain text
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, type: "text" as const } : m))
    );

    try {
      const { data, error } = await supabase.functions.invoke("cartoncloud-create-order", {
        body: msg.confirmationData.payload,
      });
      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `✅ Order placed successfully! ${data?.orderNumber ? `Reference: ${data.orderNumber}` : ""}`,
          type: "text",
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `❌ Failed to place order: ${err.message || "Unknown error"}`,
          type: "text",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = (msg: Message) => {
    setMessages((prev) =>
      prev
        .map((m) => (m.id === msg.id ? { ...m, type: "text" as const } : m))
        .concat({
          id: crypto.randomUUID(),
          role: "assistant",
          content: "No problem, order cancelled.",
          type: "text",
        })
    );
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Scrollable thread area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-[700px] mx-auto w-full px-4 py-6 flex flex-col min-h-full">
          {!hasMessages && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-8">
              <div className="w-16 h-16 bg-[hsl(206,95%,36%)]/10 rounded-2xl flex items-center justify-center">
                <Boxes size={32} className="text-[hsl(206,95%,36%)]" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Bibendum AI Assistant</h1>
              <p className="text-muted-foreground text-sm text-center max-w-md">
                Ask about stock levels, orders, or place new orders using natural language.
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="flex flex-col gap-3 mt-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[hsl(206,95%,36%)] text-white rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.id === "loading" ? (
                    <LoadingDots />
                  ) : msg.role === "assistant" ? (
                    <>
                      <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {msg.type === "confirmation" && msg.confirmationData && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                          <button
                            onClick={() => handleConfirm(msg)}
                            disabled={isLoading}
                            className="px-4 py-1.5 bg-[hsl(206,95%,36%)] text-white rounded-lg text-sm font-medium hover:bg-[hsl(206,95%,32%)] transition-colors disabled:opacity-50"
                          >
                            Yes, place order
                          </button>
                          <button
                            onClick={() => handleCancel(msg)}
                            disabled={isLoading}
                            className="px-4 py-1.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-muted/50">
        <div className="max-w-[700px] mx-auto w-full px-4 py-4">
          {/* Suggestion chips */}
          {!hasMessages && (
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-full transition-colors"
                >
                  <Sparkles size={12} className="inline mr-1.5 -mt-0.5" />
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about stock, orders, or place a new order..."
              disabled={isLoading}
              className="flex-1 bg-white/10 text-white placeholder:text-white/40 rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[hsl(206,95%,36%)] hover:bg-white/90 transition-colors disabled:opacity-50 shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
