'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useTheme } from '@/lib/theme-context';
import { apiClient, AiChatMessage } from '@/lib/api-client';

interface AiChatPanelProps {
  backendToken: string;
  googleAccessToken: string;
  googleRefreshToken: string;
  onBookingsChanged: () => void;
}

const SUGGESTIONS = [
  { label: 'Upcoming bookings',    text: 'What are my upcoming bookings?' },
  { label: 'Book tomorrow at 2pm', text: 'Book a meeting tomorrow at 2pm for 1 hour' },
  { label: 'Check Monday',         text: 'Am I free next Monday afternoon?' },
  { label: 'Cancel next booking',  text: 'Cancel my next booking' },
];

const StarIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2L14.85 8.57L22 9.27L16.82 13.97L18.36 21L12 17.27L5.64 21L7.18 13.97L2 9.27L9.15 8.57L12 2Z"
      fill="currentColor"
    />
  </svg>
);

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9" />
  </svg>
);

export function AiChatPanel({
  backendToken,
  googleAccessToken,
  googleRefreshToken,
  onBookingsChanged,
}: AiChatPanelProps) {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: AiChatMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.aiChat(backendToken, {
        messages: nextMessages,
        googleAccessToken,
        googleRefreshToken,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply }]);
      if (response.bookingsChanged) onBookingsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // ── Palette ───────────────────────────────────────────────────────────────
  const d = isDark;
  const bg          = d ? '#080810'               : '#f5f5ff';
  const surface     = d ? '#0e0e1c'               : '#ffffff';
  const borderCol   = d ? 'rgba(255,255,255,0.07)': 'rgba(99,91,255,0.1)';
  const txt         = d ? '#ddddf5'               : '#1a1a3e';
  const muted       = d ? 'rgba(221,221,245,0.38)': 'rgba(26,26,62,0.42)';
  const aiBg        = d ? 'rgba(255,255,255,0.04)': '#ffffff';
  const aiBorder    = d ? 'rgba(255,255,255,0.09)': 'rgba(99,91,255,0.12)';
  const inputBg     = d ? 'rgba(255,255,255,0.05)': 'rgba(99,91,255,0.04)';
  const inputBorder = d ? 'rgba(255,255,255,0.1)' : 'rgba(99,91,255,0.18)';
  const suggBg      = d ? 'rgba(255,255,255,0.03)': 'rgba(99,91,255,0.05)';
  const suggBorder  = d ? 'rgba(255,255,255,0.08)': 'rgba(99,91,255,0.14)';
  const suggTxt     = d ? 'rgba(221,221,245,0.65)': '#4f46e5';
  const errBg       = d ? 'rgba(239,68,68,0.1)'   : 'rgba(239,68,68,0.06)';
  const errBorder   = d ? 'rgba(239,68,68,0.3)'   : 'rgba(239,68,68,0.18)';
  const errTxt      = d ? '#fca5a5'                : '#dc2626';

  const canSend = input.trim().length > 0 && !loading;

  return (
    <>
      <style>{`
        @keyframes ai-slideLeft {
          from { opacity: 0; transform: translateX(-14px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0)     scale(1);    }
        }
        @keyframes ai-slideRight {
          from { opacity: 0; transform: translateX(14px)  scale(0.96); }
          to   { opacity: 1; transform: translateX(0)     scale(1);    }
        }
        @keyframes ai-fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes ai-float {
          0%,100% { transform: translateY(0);   }
          50%      { transform: translateY(-7px);}
        }
        @keyframes ai-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(99,91,255,0.35), 0 0 22px rgba(99,91,255,0.18); }
          50%      { box-shadow: 0 0 0 7px rgba(99,91,255,0), 0 0 32px rgba(99,91,255,0.38); }
        }
        @keyframes ai-glow-fast {
          0%,100% { box-shadow: 0 0 0 0 rgba(99,91,255,0.5),  0 0 14px rgba(99,91,255,0.3);  }
          50%      { box-shadow: 0 0 0 5px rgba(99,91,255,0),  0 0 26px rgba(99,91,255,0.55); }
        }
        @keyframes ai-wave {
          0%,100% { transform: scaleY(0.35); }
          50%      { transform: scaleY(1);   }
        }
        @keyframes ai-grad {
          0%,100% { background-position: 0%   50%; }
          50%      { background-position: 100% 50%; }
        }
        .ai-msg-left  { animation: ai-slideLeft  .28s cubic-bezier(.34,1.5,.64,1) forwards; }
        .ai-msg-right { animation: ai-slideRight .28s cubic-bezier(.34,1.5,.64,1) forwards; }
        .ai-fade-up   { animation: ai-fadeUp    .38s ease forwards; }
        .ai-float     { animation: ai-float     4.2s ease-in-out infinite; }
        .ai-orb-idle  { animation: ai-glow      3s ease-in-out infinite; }
        .ai-orb-busy  { animation: ai-glow-fast .75s ease-in-out infinite; }
        .ai-wave-bar  {
          display: inline-block;
          width: 3px; height: 18px;
          border-radius: 2px;
          background: linear-gradient(to top, #4f46e5, #a855f7);
          transform-origin: center;
          animation: ai-wave .8s ease-in-out infinite;
        }
        .ai-grad-txt {
          background: linear-gradient(120deg, #6366f1, #a855f7, #6366f1);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: ai-grad 5s ease infinite;
        }
        .ai-sugg-btn {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          transition: all .18s ease;
          background: ${suggBg};
          border: 1px solid ${suggBorder};
        }
        .ai-sugg-btn:hover {
          background: ${d ? 'rgba(99,91,255,0.12)' : 'rgba(99,91,255,0.08)'};
          border-color: rgba(99,91,255,0.45);
          transform: translateY(-1px);
        }
        .ai-sugg-arrow { transition: transform .18s ease; font-size: 16px; color: rgba(99,91,255,0.5); }
        .ai-sugg-btn:hover .ai-sugg-arrow { transform: translateX(4px); }
        .ai-send-btn:not(:disabled):hover {
          transform: scale(1.06);
          box-shadow: 0 0 22px rgba(99,91,255,0.55) !important;
        }
        .ai-send-btn { transition: transform .15s ease, box-shadow .15s ease !important; }
        .ai-input:focus {
          border-color: rgba(99,91,255,0.55) !important;
          box-shadow: 0 0 0 3px rgba(99,91,255,0.13) !important;
        }
        .ai-input { transition: border-color .2s ease, box-shadow .2s ease; }
        .ai-clear:hover {
          color: ${txt} !important;
          border-color: ${d ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)'} !important;
          background: ${d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} !important;
        }
        /* Scrollbar */
        .ai-scroll::-webkit-scrollbar { width: 4px; }
        .ai-scroll::-webkit-scrollbar-track { background: transparent; }
        .ai-scroll::-webkit-scrollbar-thumb {
          background: ${d ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
          border-radius: 4px;
        }
      `}</style>

      {/* ── Shell ── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        background: surface,
        border: `1px solid ${borderCol}`,
        borderRadius: '20px',
        overflow: 'hidden',
        height: 'calc(100vh - 200px)',
        minHeight: '540px',
        boxShadow: d
          ? '0 0 0 1px rgba(99,91,255,0.1), 0 24px 64px rgba(0,0,0,0.65)'
          : '0 0 0 1px rgba(99,91,255,0.08), 0 24px 64px rgba(99,91,255,0.07)',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${borderCol}`,
          background: d ? 'rgba(255,255,255,0.015)' : 'rgba(99,91,255,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Avatar orb */}
            <div
              className={loading ? 'ai-orb-busy' : 'ai-orb-idle'}
              style={{
                width: 38, height: 38,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, position: 'relative', overflow: 'hidden',
                color: 'white',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 55%)',
              }} />
              <StarIcon size={16} />
            </div>

            <div>
              <p className="ai-grad-txt" style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                AI Booking Assistant
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: loading ? '#f59e0b' : '#10b981',
                  boxShadow: loading
                    ? '0 0 6px rgba(245,158,11,0.7)'
                    : '0 0 6px rgba(16,185,129,0.7)',
                  transition: 'background .3s, box-shadow .3s',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: '11px', color: muted }}>
                  {loading ? 'Thinking…' : 'Claude Haiku 4.5'}
                </span>
              </div>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              className="ai-clear"
              onClick={() => { setMessages([]); setError(null); }}
              style={{
                padding: '5px 11px',
                fontSize: '12px',
                color: muted,
                background: 'transparent',
                border: `1px solid ${borderCol}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all .15s ease',
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* ── Messages ── */}
        <div
          className="ai-scroll"
          style={{
            flex: 1, overflowY: 'auto',
            padding: '20px',
            background: bg,
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}
        >

          {/* Empty state */}
          {messages.length === 0 && !loading && (
            <div className="ai-fade-up" style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              flex: 1, gap: '28px', paddingBottom: '16px',
            }}>
              {/* Floating orb */}
              <div className="ai-float" style={{ textAlign: 'center' }}>
                <div style={{
                  width: 72, height: 72,
                  borderRadius: '22px',
                  background: 'linear-gradient(135deg, #4338ca, #6d28d9, #9333ea)',
                  margin: '0 auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 48px rgba(99,91,255,0.35), inset 0 1px 0 rgba(255,255,255,0.22)',
                  position: 'relative', overflow: 'hidden',
                  color: 'white',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 52%)',
                  }} />
                  <StarIcon size={30} />
                </div>
                <p style={{ fontSize: '20px', fontWeight: 800, color: txt, marginTop: '18px', letterSpacing: '-0.03em' }}>
                  How can I help?
                </p>
                <p style={{ fontSize: '13px', color: muted, marginTop: '5px' }}>
                  Book, check, list, or cancel meetings
                </p>
              </div>

              {/* Suggestion grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                width: '100%',
                maxWidth: '420px',
              }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    className="ai-sugg-btn"
                    onClick={() => sendMessage(s.text)}
                  >
                    <span style={{ fontSize: '12px', color: suggTxt, fontWeight: 500, lineHeight: 1.3 }}>
                      {s.label}
                    </span>
                    <span className="ai-sugg-arrow">›</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bubbles */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={msg.role === 'user' ? 'ai-msg-right' : 'ai-msg-left'}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                gap: '8px',
              }}
            >
              {/* AI avatar */}
              {msg.role === 'assistant' && (
                <div style={{
                  width: 28, height: 28, borderRadius: '9px',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginBottom: 2,
                  boxShadow: '0 2px 10px rgba(99,91,255,0.35)',
                  color: 'white',
                }}>
                  <StarIcon size={13} />
                </div>
              )}

              <div style={{
                maxWidth: '74%',
                padding: '10px 14px',
                fontSize: '14px',
                lineHeight: 1.58,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                borderRadius: msg.role === 'user'
                  ? '18px 18px 4px 18px'
                  : '18px 18px 18px 4px',
                ...(msg.role === 'user' ? {
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: '#fff',
                  boxShadow: '0 3px 14px rgba(99,91,255,0.38)',
                } : {
                  background: aiBg,
                  color: txt,
                  border: `1px solid ${aiBorder}`,
                  boxShadow: d ? 'none' : '0 1px 6px rgba(0,0,0,0.04)',
                }),
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {loading && (
            <div className="ai-msg-left" style={{
              display: 'flex', alignItems: 'flex-end', gap: '8px',
            }}>
              <div className="ai-orb-busy" style={{
                width: 28, height: 28, borderRadius: '9px',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginBottom: 2, color: 'white',
              }}>
                <StarIcon size={13} />
              </div>
              <div style={{
                padding: '12px 16px',
                background: aiBg,
                border: `1px solid ${aiBorder}`,
                borderRadius: '18px 18px 18px 4px',
                display: 'flex', gap: '5px', alignItems: 'center',
              }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="ai-wave-bar"
                    style={{ animationDelay: `${i * 0.16}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="ai-fade-up" style={{
              padding: '10px 14px',
              background: errBg,
              border: `1px solid ${errBorder}`,
              borderRadius: '12px',
              fontSize: '13px',
              color: errTxt,
            }}>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div style={{
          padding: '12px 16px 14px',
          borderTop: `1px solid ${borderCol}`,
          background: surface,
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Book a meeting, check availability, list or cancel…"
              rows={1}
              disabled={loading}
              className="ai-input"
              style={{
                flex: 1, resize: 'none',
                borderRadius: '14px',
                border: `1px solid ${inputBorder}`,
                background: inputBg,
                color: txt,
                padding: '10px 14px',
                fontSize: '13.5px',
                lineHeight: 1.5,
                outline: 'none',
                maxHeight: '120px',
                overflowY: 'auto',
                opacity: loading ? 0.55 : 1,
                transition: 'opacity .2s',
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
            />
            <button
              className="ai-send-btn"
              onClick={() => sendMessage(input)}
              disabled={!canSend}
              style={{
                flexShrink: 0,
                width: 40, height: 40,
                borderRadius: '12px',
                border: 'none',
                cursor: canSend ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: canSend
                  ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                  : (d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                color: canSend ? 'white' : (d ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)'),
                boxShadow: canSend ? '0 2px 14px rgba(99,91,255,0.42)' : 'none',
              }}
            >
              <SendIcon />
            </button>
          </div>
          <p style={{ fontSize: '11px', color: muted, marginTop: '6px', paddingLeft: '2px' }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}
