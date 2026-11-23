"use client";

// Ventana modal accesible: usa <dialog> del navegador, así Escape la cierra, el foco queda
// dentro y los lectores de pantalla la anuncian. En celular ocupa casi toda la pantalla.
import { useEffect, useRef, type ReactNode } from "react";

import { Icon } from "../icons";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md";
};

export function Modal({ title, onClose, children, size = "md" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault(); // Escape: lo cierra React, no el navegador
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose(); // clic fuera de la ventana
      }}
      aria-labelledby="modal-title"
      className={`m-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-surface p-0 text-fg shadow-xl backdrop:bg-slate-950/50 ${
        size === "sm" ? "max-w-sm" : "max-w-lg"
      }`}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 id="modal-title" className="text-lg font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-fg"
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto px-5 py-5">{children}</div>
    </dialog>
  );
}
