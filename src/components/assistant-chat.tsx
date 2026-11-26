"use client";

// Asistente de consulta con IA (HU35–HU39): botón flotante y panel de chat.
// - La conversación vive en esta pestaña (sessionStorage); el backend no la guarda (R-IA-3).
//   Solo se envían los últimos turnos como contexto para las preguntas de seguimiento.
// - Debajo de cada respuesta se muestran las funciones consultadas (transparencia).
// - Sin clave del proveedor (assistant_status), el botón aparece como "no disponible".
// - Bajo cada respuesta, "Correcta"/"Incorrecta" (HU40); la pestaña "Mis consultas" lista el historial propio.
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

import { api, type AssistantFeedbackValue, type AssistantToolUse, type Permission } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { MAX_HISTORY_TURNS, MAX_QUESTION, MAX_TURN_TEXT, SUGGESTIONS, toolSummary } from "@/lib/assistant";

import { AssistantHistory } from "./assistant-history";
import { FeedbackButtons } from "./assistant-feedback";
import { useAuth } from "./auth-provider";
import { Icon } from "./icons";
import { ErrorAlert } from "./ui/alert";

// Permisos que usan las funciones de consulta del asistente: sin ninguno, no hay nada que consultar.
const ASSISTANT_PERMISSIONS: Permission[] = [
  "events:read",
  "finance:read",
  "inventory:read",
  "purchasing:manage",
  "clients:manage",
  "payments:record",
  "quotes:manage",
];

type Message =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      text: string;
      tools: AssistantToolUse[];
      queryId?: string; // id de la consulta en el backend: sirve para valorar la respuesta
      feedback?: AssistantFeedbackValue;
    };

type Tab = "chat" | "history";

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function AssistantChat() {
  const { user, can } = useAuth();
  const allowed = ASSISTANT_PERMISSIONS.some(can);
  const storageKey = `darze.assistant.${user.id}`;

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [available, setAvailable] = useState<boolean | null>(null); // null: consultando
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Disponibilidad: si el proveedor no está configurado, el resto del sistema funciona igual (CA-40.2).
  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    void api
      .GET("/v1/assistant/status")
      .then(({ data }) => {
        if (!cancelled) setAvailable(data ? data.available : false);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  // Recupera la conversación de la pestaña (por si se recarga la página).
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (raw) setMessages(JSON.parse(raw) as Message[]);
      } catch {
        // sessionStorage bloqueado o contenido dañado: se empieza de cero
      }
      setLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // sin almacenamiento: la conversación solo vive en pantalla
    }
  }, [messages, loaded, storageKey]);

  // Al llegar mensajes nuevos se baja al final.
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, thinking, open]);

  // Al abrir, el foco va al campo de texto; al cerrar vuelve al botón.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!allowed) return null;

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const ask = async (raw: string) => {
    const question = raw.trim();
    if (!question || thinking) return;
    // Contexto: los últimos turnos de la sesión (sin errores), como pide la API.
    const history = messages
      .slice(-MAX_HISTORY_TURNS)
      .map((m) => ({ role: m.role, text: m.text.slice(0, MAX_TURN_TEXT) }));
    setMessages((current) => [...current, { id: newId(), role: "user", text: question }]);
    setDraft("");
    setError(null);
    setThinking(true);
    try {
      const { data, error: apiError } = await api.POST("/v1/assistant/ask", { body: { question, history } });
      if (data) {
        setMessages((current) => [
          ...current,
          { id: newId(), role: "assistant", text: data.answer, tools: data.tools, queryId: data.query_id },
        ]);
      } else {
        const code = (apiError as { code?: string } | undefined)?.code;
        if (code === "assistant.unavailable") setAvailable(false);
        setError(errorMessage(apiError));
      }
    } catch {
      setError(errorMessage(null));
    } finally {
      setThinking(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(draft);
  };

  // Enter envía; Shift+Enter agrega un salto de línea.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void ask(draft);
    }
  };

  const setFeedback = (id: string, feedback: AssistantFeedbackValue) =>
    setMessages((current) => current.map((m) => (m.id === id && m.role === "assistant" ? { ...m, feedback } : m)));

  const clear = () => {
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  };

  // Escape cierra el panel; Tab se queda dentro de él mientras está abierto.
  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), textarea:not([disabled])",
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="print:hidden">
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-labelledby={titleId}
          onKeyDown={onPanelKeyDown}
          className="fixed inset-x-3 bottom-20 z-50 flex max-h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl sm:inset-x-auto sm:right-5 sm:w-[26rem] sm:h-[34rem]"
        >
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Icon name="chat" className="size-4" />
            </span>
            <h2 id={titleId} className="mr-auto font-semibold">
              Asistente
            </h2>
            {tab === "chat" && messages.length > 0 && (
              <button
                type="button"
                onClick={clear}
                aria-label="Limpiar conversación"
                title="Limpiar conversación"
                className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-danger"
              >
                <Icon name="trash" className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar asistente"
              className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-fg"
            >
              <Icon name="close" className="size-4" />
            </button>
          </div>

          <div role="tablist" aria-label="Asistente" className="flex border-b border-line text-sm">
            {(
              [
                ["chat", "Conversación"],
                ["history", "Mis consultas"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`${titleId}-tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`${titleId}-panel-${id}`}
                onClick={() => setTab(id)}
                className={`flex-1 border-b-2 px-3 py-2 font-medium transition ${
                  tab === id ? "border-primary text-primary" : "border-transparent text-muted hover:text-fg"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "history" && (
            <div
              role="tabpanel"
              id={`${titleId}-panel-history`}
              aria-labelledby={`${titleId}-tab-history`}
              className="flex min-h-0 flex-1 flex-col"
            >
              <AssistantHistory />
            </div>
          )}

          {tab === "chat" && (
            <div
              className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
              role="tabpanel"
              id={`${titleId}-panel-chat`}
              aria-labelledby={`${titleId}-tab-chat`}
            >
              <div className="space-y-4" role="log" aria-live="polite" aria-label="Conversación">
                {messages.length === 0 && (
                  <div>
                    <p className="text-sm text-muted">
                      Pregúntame por los datos del sistema: eventos, cobros, stock, compras, flujo de caja o clientes.
                      Solo consulto, no modifico nada.
                    </p>
                    <ul className="mt-3 space-y-2" aria-label="Preguntas sugeridas">
                      {SUGGESTIONS.map((suggestion) => (
                        <li key={suggestion}>
                          <button
                            type="button"
                            onClick={() => void ask(suggestion)}
                            disabled={available === false || thinking}
                            className="w-full rounded-lg border border-line px-3 py-2 text-left text-sm transition hover:bg-surface-muted disabled:opacity-60"
                          >
                            {suggestion}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {messages.map((message) =>
                  message.role === "user" ? (
                    <div key={message.id} className="flex justify-end">
                      <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-white">
                        {message.text}
                      </p>
                    </div>
                  ) : (
                    <div key={message.id} className="max-w-[92%]">
                      <div className="rounded-2xl rounded-bl-sm bg-surface-muted px-3 py-2 text-sm">
                        <PlainText text={message.text} />
                      </div>
                      {message.tools.length > 0 && (
                        <p className="mt-1 px-1 text-xs text-muted">Consultó: {toolSummary(message.tools)}</p>
                      )}
                      {message.queryId && (
                        <FeedbackButtons
                          queryId={message.queryId}
                          value={message.feedback ?? null}
                          onRated={(value) => setFeedback(message.id, value)}
                        />
                      )}
                    </div>
                  ),
                )}

                {thinking && (
                  <p role="status" className="flex items-center gap-2 text-sm text-muted">
                    <span className="size-2 animate-pulse rounded-full bg-primary" />
                    Pensando…
                  </p>
                )}
                {error && <ErrorAlert message={error} />}
                <div ref={endRef} />
              </div>
            </div>
          )}

          {tab === "chat" && (
            <form onSubmit={onSubmit} className="border-t border-line p-3">
              {available === false && (
                <p className="mb-2 text-xs text-muted">
                  Asistente no disponible por ahora. El resto del sistema funciona igual.
                </p>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  maxLength={MAX_QUESTION}
                  disabled={available === false}
                  aria-label="Escribe tu pregunta"
                  placeholder="Escribe tu pregunta…"
                  className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-surface-muted disabled:text-muted"
                />
                <button
                  type="submit"
                  disabled={thinking || available === false || draft.trim() === ""}
                  aria-label="Enviar pregunta"
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-primary-hover disabled:opacity-60"
                >
                  <Icon name="send" className="size-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? "Cerrar asistente" : "Abrir asistente"}
        aria-expanded={open}
        title={available === false ? "Asistente no disponible" : "Asistente"}
        className={`fixed bottom-4 right-4 z-50 inline-flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:bottom-5 sm:right-5 ${
          available === false ? "opacity-60" : ""
        }`}
      >
        <Icon name={open ? "chevronDown" : "chat"} className="size-6" />
      </button>
    </div>
  );
}

// Texto simple: respeta saltos de línea y convierte líneas "- ", "* ", "• " o "1. " en listas.
// No interpreta HTML: lo que escribe el modelo se muestra siempre como texto.
function PlainText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(
        <p key={blocks.length} className="whitespace-pre-wrap break-words">
          {paragraph.join("\n")}
        </p>,
      );
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      const Tag = list.ordered ? "ol" : "ul";
      blocks.push(
        <Tag
          key={blocks.length}
          className={`ml-5 space-y-0.5 break-words ${list.ordered ? "list-decimal" : "list-disc"}`}
        >
          {list.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </Tag>,
      );
      list = null;
    }
  };

  for (const line of text.split("\n")) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const item = bullet ?? numbered;
    if (item) {
      flushParagraph();
      const ordered = !bullet;
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push(item[1].replace(/\*\*(.+?)\*\*/g, "$1"));
    } else {
      flushList();
      if (line.trim() === "") flushParagraph();
      else paragraph.push(line.replace(/\*\*(.+?)\*\*/g, "$1"));
    }
  }
  flushParagraph();
  flushList();

  return <div className="space-y-2">{blocks}</div>;
}
