"use client";

// Pide confirmación antes de una acción que el usuario podría hacer sin querer (desactivar…).
import { useState } from "react";

import { Modal } from "./modal";
import { dangerButton, secondaryButton } from "./styles";

type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose }: Props) {
  const [working, setWorking] = useState(false);

  async function confirm() {
    setWorking(true);
    await onConfirm();
    setWorking(false);
  }

  return (
    <Modal title={title} onClose={onClose} size="sm">
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={secondaryButton}>
          Cancelar
        </button>
        <button type="button" onClick={() => void confirm()} disabled={working} className={dangerButton}>
          {working ? "Procesando…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
