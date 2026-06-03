"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, ConnectBanner } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { initials } from "@/lib/format";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTION_CHIPS = [
  "Summarise my hot leads",
  "What's my pipeline value?",
  "Draft a follow-up message",
  "This month bookings?",
  "How's the team doing?",
];

function parseMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
}

function AssistantBubble({ content }: { content: string }) {
  return (
    <div
      className="text-[14px] leading-relaxed text-txt"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
}

export function AiChatClient({
  userName,
}: {
  userName: string;
  tenantId: string; // available for future use; API resolves tenant from session
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Namaste ${userName.split(" ")[0]}! 🙏 Main aapka AI business assistant hoon. Aaj main aapki kya help kar sakta hoon? Hot leads check karein, pipeline value dekhein, ya koi message draft karein — bas batao!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"builtin" | "ai" | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const newMessages: Message[] = [
        ...messages,
        { role: "user", content: trimmed },
      ];
      setMessages(newMessages);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: newMessages }),
        });

        const data = await res.json();
        const reply: string = data.reply ?? "Kuch samajh nahi aaya, dobara try karo!";
        const responseMode: "builtin" | "ai" = data.mode ?? "builtin";

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: reply },
        ]);
        setMode(responseMode);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Ek second — kuch technical issue tha. Dobara try karo please! 🙏",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-88px)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative flex-shrink-0">
          {/* Spinning conic-gradient orb */}
          <div className="w-12 h-12 rounded-full glow-orb animate-spin-slow" />
          <div className="absolute inset-1 rounded-full bg-bg flex items-center justify-center">
            <Icon name="Bot" size={18} className="text-gold-bright" />
          </div>
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold leading-tight">
            Personal AI Assistant
          </h2>
          <p className="text-txt-dim text-sm mt-0.5">
            Live data · Hinglish · Always available
          </p>
        </div>
        {mode === "builtin" && (
          <span className="ml-auto tag bg-gold-soft text-gold-bright text-[11px]">
            Built-in intelligence
          </span>
        )}
        {mode === "ai" && (
          <span className="ml-auto tag bg-[rgba(62,199,141,.14)] text-green text-[11px]">
            Claude-powered
          </span>
        )}
      </div>

      {/* Optional upgrade hint — shown only when in builtin mode */}
      {mode === "builtin" && (
        <ConnectBanner
          name="Anthropic (Claude)"
          enables="Connect for richer, more conversational AI answers."
        />
      )}

      {/* Chat area */}
      <Card className="flex-1 flex flex-col overflow-hidden p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              {msg.role === "assistant" ? (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold-soft flex items-center justify-center">
                  <Icon name="Bot" size={14} className="text-gold-bright" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple flex items-center justify-center text-[11px] font-bold text-[#1a1205]">
                  {initials(userName)}
                </div>
              )}

              {/* Bubble */}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gold text-[#1a1205] font-medium rounded-tr-sm"
                    : "bg-panel-2 border border-line text-txt rounded-tl-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  <AssistantBubble content={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3 flex-row">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold-soft flex items-center justify-center">
                <Icon name="Bot" size={14} className="text-gold-bright" />
              </div>
              <div className="bg-panel-2 border border-line rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-txt-faint animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-txt-faint animate-pulse [animation-delay:0.3s]" />
                <span className="w-2 h-2 rounded-full bg-txt-faint animate-pulse [animation-delay:0.6s]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips — show only if no user messages yet */}
        {messages.length <= 1 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                className="btn btn-ghost text-xs py-1.5 px-3 border-line hover:border-gold hover:text-gold-bright transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-line p-4">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              className="input flex-1 resize-none min-h-[42px] max-h-[120px] py-2.5"
              placeholder="Koi bhi sawaal poochho… (Enter to send, Shift+Enter for new line)"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="btn btn-primary h-[42px] px-4 flex-shrink-0 disabled:opacity-40"
            >
              <Icon name="Send" size={16} />
            </button>
          </div>
          <p className="text-[11px] text-txt-faint mt-2 text-center">
            AI responses are based on your live CRM data · Powered by Real Estate OS
          </p>
        </div>
      </Card>
    </div>
  );
}
