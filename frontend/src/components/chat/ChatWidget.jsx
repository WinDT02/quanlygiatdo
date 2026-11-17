import { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { askChatbot } from '../../api/chatbotApi';
import { useAuth } from '../../context/AuthContext';

/** Shown as chips above the input; clicking one sends the text as if the customer typed it. */
export const QUICK_REPLIES = ['Bảng giá dịch vụ', 'Tra cứu đơn hàng', 'Mã giảm giá', 'Thời gian giặt', 'Chính sách bồi thường'];

const GREETING = {
  id: 'greeting',
  from: 'bot',
  text: 'Xin chào! Mình là Trợ lý Giặt Sấy. Bạn cần hỏi về giá, mã giảm giá, đơn hàng hay chính sách của tiệm? Chọn nhanh bên dưới hoặc nhắn cho mình nhé.',
};
const ERROR_TEXT = 'Xin lỗi, mình chưa trả lời được lúc này. Bạn thử lại sau ít phút nhé.';

export default function ChatWidget() {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const nextId = useRef(1);
  const userId = user?.id ?? null;

  // a new login / logout must not show the previous person's order answers
  useEffect(() => {
    setMessages([GREETING]);
    setInput('');
  }, [userId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, pending, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // staff use the admin pages; the bot is for customers and visitors
  if (role === 'ADMIN' || role === 'EMPLOYEE') return null;

  const send = async (raw) => {
    const text = raw.trim();
    if (!text || pending) return;
    const id = nextId.current++;
    setMessages((list) => [...list, { id: `u${id}`, from: 'user', text }]);
    setInput('');
    setPending(true);
    try {
      const { reply } = await askChatbot(text);
      setMessages((list) => [...list, { id: `b${id}`, from: 'bot', text: reply }]);
    } catch {
      setMessages((list) => [...list, { id: `b${id}`, from: 'bot', text: ERROR_TEXT, error: true }]);
    } finally {
      setPending(false);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(input);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <section
          role="dialog"
          aria-label="Trợ lý Giặt Sấy"
          className="flex h-[32rem] max-h-[calc(100vh-6.5rem)] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200"
        >
          <header className="flex items-center gap-3 bg-blue-600 px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20"><Bot className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">Trợ lý Giặt Sấy</p>
              <p className="flex items-center gap-1.5 text-xs text-blue-100">
                <span className="h-2 w-2 rounded-full bg-green-400" /> Online
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/20" aria-label="Đóng khung chat">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-3 py-4" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p
                  className={`max-w-[85%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    m.from === 'user'
                      ? 'rounded-br-sm bg-blue-600 text-white'
                      : m.error
                        ? 'rounded-bl-sm bg-red-50 text-red-700 ring-1 ring-red-100'
                        : 'rounded-bl-sm bg-white text-gray-800 shadow-sm ring-1 ring-gray-100'
                  }`}
                >
                  {m.text}
                </p>
              </div>
            ))}
            {pending && (
              <div className="flex justify-start" role="status" aria-label="Trợ lý đang trả lời">
                <span className="flex gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 bg-white">
            <div className="flex gap-2 overflow-x-auto px-3 pb-1 pt-2" aria-label="Gợi ý nhanh">
              {QUICK_REPLIES.map((label) => (
                <button
                  key={label}
                  type="button"
                  disabled={pending}
                  onClick={() => send(label)}
                  className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 px-3 pb-3 pt-1"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                maxLength={500}
                placeholder="Nhập câu hỏi của bạn..."
                aria-label="Tin nhắn"
                className="min-w-0 flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="submit"
                disabled={pending || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                aria-label="Gửi"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 hover:shadow-xl"
        aria-label={open ? 'Đóng trợ lý Giặt Sấy' : 'Mở trợ lý Giặt Sấy'}
        aria-expanded={open}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
