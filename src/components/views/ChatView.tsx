import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Boxes, Sparkles, Plus, MessageSquare, Trash2 } from "lucide-react";
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

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
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

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export function ChatView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data: connections } = useConnections();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load recent conversations
  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from("chat_conversations")
      .select("id, title, updated_at")
      .eq("org_id", ORG_ID)
      .order("updated_at", { ascending: false })
      .limit(10);
    if (data) setConversations(data);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (convoId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, content, type, confirmation_data, created_at")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(
        data.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          type: m.type || "text",
          confirmationData: m.confirmation_data || undefined,
        }))
      );
    }
  }, []);

  const selectConversation = useCallback(
    async (convoId: string) => {
      setActiveConvoId(convoId);
      await loadMessages(convoId);
    },
    [loadMessages]
  );

  const startNewChat = () => {
    setActiveConvoId(null);
    setMessages([]);
    setInput("");
  };

  const deleteConversation = async (convoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("chat_conversations").delete().eq("id", convoId);
    if (activeConvoId === convoId) startNewChat();
    loadConversations();
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Generate a title from the first user message
  const generateTitle = (text: string) => {
    const trimmed = text.trim();
    return trimmed.length > 50 ? trimmed.slice(0, 47) + "..." : trimmed;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text.trim(), type: "text" };
    const loadingMsg: Message = { id: "loading", role: "assistant", content: "", type: "text" };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Create conversation if new
      let convoId = activeConvoId;
      if (!convoId) {
        const { data: newConvo } = await supabase
          .from("chat_conversations")
          .insert({ org_id: ORG_ID, title: generateTitle(text) })
          .select("id")
          .single();
        if (newConvo) {
          convoId = newConvo.id;
          setActiveConvoId(convoId);
        }
      }

      // Save user message
      if (convoId) {
        await supabase.from("chat_messages").insert({
          conversation_id: convoId,
          role: "user",
          content: text.trim(),
          type: "text",
        });
      }

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

      // Save assistant message
      if (convoId) {
        await supabase.from("chat_messages").insert({
          conversation_id: convoId,
          role: "assistant",
          content: assistantMsg.content,
          type: assistantMsg.type || "text",
          confirmation_data: assistantMsg.confirmationData || null,
        });
        // Update conversation timestamp
        await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convoId);
      }

      loadConversations();
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
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, type: "text" as const } : m))
    );

    try {
      const { data, error } = await supabase.functions.invoke("cartoncloud-create-order", {
        body: msg.confirmationData.payload,
      });
      if (error) throw error;

      const successMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `✅ Order placed successfully! ${data?.orderNumber ? `Reference: ${data.orderNumber}` : ""}`,
        type: "text",
      };
      setMessages((prev) => [...prev, successMsg]);

      if (activeConvoId) {
        await supabase.from("chat_messages").insert({
          conversation_id: activeConvoId,
          role: "assistant",
          content: successMsg.content,
          type: "text",
        });
      }
    } catch (err: any) {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `❌ Failed to place order: ${err.message || "Unknown error"}`,
        type: "text",
      };
      setMessages((prev) => [...prev, errMsg]);
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
    <div className="flex-1 flex overflow-hidden">
      {/* ── Sidebar ── */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-200 bg-muted/50 border-r border-border flex-shrink-0 overflow-hidden`}
      >
        <div className="w-64 h-full flex flex-col">
          <div className="p-3">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(206,95%,36%)] text-white text-sm font-medium hover:bg-[hsl(206,95%,32%)] transition-colors"
            >
              <Plus size={16} />
              New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent</p>
            {conversations.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground text-center">No conversations yet</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`w-full group flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors mb-0.5 ${
                    activeConvoId === c.id
                      ? "bg-[hsl(206,95%,36%)]/10 text-[hsl(206,95%,36%)]"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <MessageSquare size={14} className="shrink-0 opacity-50" />
                  <span className="truncate flex-1">{c.title}</span>
                  <Trash2
                    size={14}
                    className="shrink-0 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
                    onClick={(e) => deleteConversation(c.id, e)}
                  />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {/* Toggle sidebar button */}
        <div className="px-4 py-2 flex items-center gap-2 border-b border-border">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
          >
            <MessageSquare size={16} />
          </button>
          <span className="text-sm text-muted-foreground">
            {activeConvoId
              ? conversations.find((c) => c.id === activeConvoId)?.title || "Chat"
              : "New Chat"}
          </span>
        </div>

        {!hasMessages ? (
          /* ── Empty state ── */
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-[700px] flex flex-col items-center gap-6">
              <div className="w-16 h-16 bg-[hsl(206,95%,36%)]/10 rounded-2xl flex items-center justify-center">
                <Boxes size={32} className="text-[hsl(206,95%,36%)]" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Bibendum AI Assistant</h1>
              <p className="text-muted-foreground text-sm text-center max-w-md">
                Ask about stock levels, orders, or place new orders using natural language.
              </p>

              <div className="w-full mt-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage(input);
                  }}
                  className="flex items-end gap-2"
                >
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      const ta = e.target;
                      ta.style.height = "auto";
                      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(input);
                        if (textareaRef.current) textareaRef.current.style.height = "auto";
                      }
                    }}
                    placeholder="Ask about stock, orders, or place a new order..."
                    disabled={isLoading}
                    rows={1}
                    className="flex-1 bg-muted text-foreground placeholder:text-muted-foreground rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(206,95%,36%)]/30 border border-border disabled:opacity-50 resize-none overflow-y-auto"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="w-10 h-10 rounded-full bg-[hsl(206,95%,36%)] flex items-center justify-center text-white hover:bg-[hsl(206,95%,32%)] transition-colors disabled:opacity-50 shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="px-3 py-1.5 bg-[hsl(206,95%,36%)]/10 hover:bg-[hsl(206,95%,36%)]/20 text-[hsl(206,95%,36%)] text-xs rounded-full transition-colors"
                  >
                    <Sparkles size={12} className="inline mr-1.5 -mt-0.5 text-[hsl(206,95%,36%)]" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── Active conversation ── */
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="max-w-[700px] mx-auto w-full px-4 py-6 flex flex-col min-h-full">
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

            <div className="border-t border-border bg-muted/50">
              <div className="max-w-[700px] mx-auto w-full px-4 py-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage(input);
                  }}
                  className="flex items-end gap-2"
                >
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      const ta = e.target;
                      ta.style.height = "auto";
                      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(input);
                        if (textareaRef.current) textareaRef.current.style.height = "auto";
                      }
                    }}
                    placeholder="Ask about stock, orders, or place a new order..."
                    disabled={isLoading}
                    rows={1}
                    className="flex-1 bg-muted text-foreground placeholder:text-muted-foreground rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(206,95%,36%)]/30 border border-border disabled:opacity-50 resize-none overflow-y-auto"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="w-10 h-10 rounded-full bg-[hsl(206,95%,36%)] flex items-center justify-center text-white hover:bg-[hsl(206,95%,32%)] transition-colors disabled:opacity-50 shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
