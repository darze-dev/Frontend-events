"use client";

// Registrar o editar un trabajador (HU15). Obligatorios: nombre y documento (CA-15.1, CA-15.2).
// El documento se normaliza sin espacios ni guiones (CA-15.19); el teléfono, solo dígitos
// (CA-15.22); la función "otro" exige descripción (CA-15.25); si aplica hora extra, su monto
// es mayor que cero (CA-15.21). Los montos se escriben en soles y viajan en céntimos.
// El backend valida todo igual; aquí se adelantan los errores más comunes.
import { useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { fieldClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import {
  api,
  type Worker,
  type WorkerCreate,
  type WorkerDocumentType,
  type WorkerFunction,
  type WorkerType,
} from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { centsToSolesText, solesToCents } from "@/lib/money";
import {
  FUNCTION_DESCRIPTION_MAX,
  WORKER_DOCUMENTS,
  WORKER_FUNCTIONS,
  WORKER_TYPES,
  documentProblem,
  normalizeDocument,
} from "@/lib/staff";

type Props = {
  worker: Worker | null; // null = trabajador nuevo
  onSaved: (worker: Worker) => void;
  onClose: () => void;
};

export function WorkerForm({ worker, onSaved, onClose }: Props) {
  const [workerFunction, setWorkerFunction] = useState<WorkerFunction | "">(worker?.function ?? "");
  const [overtime, setOvertime] = useState(worker?.overtime_applies ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isNew = worker === null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();

    const documentType = text("document_type") as WorkerDocumentType;
    const documentNumber = normalizeDocument(text("document_number"));
    const phone = text("phone").replace(/[\s-]/g, "");
    const rateText = text("rate");
    const rate = rateText ? solesToCents(rateText) : null;
    const overtimeRate = overtime ? solesToCents(text("overtime_rate")) : null;
    const description = text("function_description");

    const problem =
      documentProblem(documentType, documentNumber) ??
      (phone && !/^\d+$/.test(phone) ? "El teléfono solo admite dígitos." : null) ??
      (workerFunction === "OTHER" && !description ? "Con la función «Otro», describe la función real." : null) ??
      (rateText && rate === null ? "La tarifa debe ser un monto en soles, por ejemplo 120 o 120.50." : null) ??
      (overtime && !overtimeRate ? "Si aplica hora extra, indica un monto mayor que cero." : null);
    if (problem) {
      setError(problem);
      return;
    }

    const body: WorkerCreate = {
      name: text("name"),
      document_type: documentType,
      document_number: documentNumber,
      phone: phone || null,
      function: workerFunction || null,
      function_description: workerFunction === "OTHER" ? description : null,
      worker_type: (text("worker_type") as WorkerType) || null,
      rate_cents: rate,
      overtime_applies: overtime,
      overtime_rate_cents: overtimeRate,
    };

    setSaving(true);
    setError(null);
    try {
      const { data, error: apiError } = isNew
        ? await api.POST("/v1/staff", { body })
        : await api.PUT("/v1/staff/{worker_id}", { params: { path: { worker_id: worker.id } }, body });
      if (data) onSaved(data);
      else setError(errorMessage(apiError));
    } catch {
      setError(errorMessage(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? "Nuevo trabajador" : "Editar trabajador"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className={labelClass}>
          Nombre completo <span className="text-danger">*</span>
          <input name="name" required maxLength={150} autoFocus defaultValue={worker?.name} className={fieldClass} />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className={labelClass}>
            Documento <span className="text-danger">*</span>
            <select name="document_type" defaultValue={worker?.document_type ?? "DNI"} className={fieldClass}>
              {(Object.keys(WORKER_DOCUMENTS) as WorkerDocumentType[]).map((type) => (
                <option key={type} value={type} title={WORKER_DOCUMENTS[type]}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className={`${labelClass} col-span-2`}>
            Número <span className="text-danger">*</span>
            <input
              name="document_number"
              required
              inputMode="numeric"
              autoComplete="off"
              defaultValue={worker?.document_number}
              onBlur={(e) => (e.currentTarget.value = normalizeDocument(e.currentTarget.value))}
              className={fieldClass}
            />
          </label>
        </div>
        <p className="-mt-2 text-xs text-muted">
          DNI de 8 dígitos; carné de extranjería (CE) de 9 a 12. Los espacios y guiones se quitan.
        </p>

        <label className={labelClass}>
          Teléfono <span className="font-normal text-muted">(opcional, solo dígitos)</span>
          <input
            name="phone"
            inputMode="tel"
            defaultValue={worker?.phone ?? ""}
            className={fieldClass}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Función
            <select
              name="function"
              value={workerFunction}
              onChange={(e) => setWorkerFunction(e.target.value as WorkerFunction | "")}
              className={fieldClass}
            >
              <option value="">Sin indicar</option>
              {(Object.keys(WORKER_FUNCTIONS) as WorkerFunction[]).map((value) => (
                <option key={value} value={value}>
                  {WORKER_FUNCTIONS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Tipo
            <select name="worker_type" defaultValue={worker?.worker_type ?? ""} className={fieldClass}>
              <option value="">Sin indicar</option>
              {(Object.keys(WORKER_TYPES) as WorkerType[]).map((value) => (
                <option key={value} value={value}>
                  {WORKER_TYPES[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {workerFunction === "OTHER" && (
          <label className={labelClass}>
            Descripción de la función <span className="text-danger">*</span>
            <input
              name="function_description"
              required
              maxLength={FUNCTION_DESCRIPTION_MAX}
              placeholder="Por ejemplo: maestro de ceremonias"
              defaultValue={worker?.function_description ?? ""}
              className={fieldClass}
            />
          </label>
        )}

        <label className={labelClass}>
          Tarifa referencial por evento (S/) <span className="font-normal text-muted">(opcional)</span>
          <input
            name="rate"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={worker?.rate_cents != null ? centsToSolesText(worker.rate_cents) : ""}
            className={fieldClass}
          />
        </label>

        <fieldset className="space-y-3 rounded-lg border border-line p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={overtime}
              onChange={(e) => setOvertime(e.target.checked)}
              className="size-4 accent-primary"
            />
            Aplica hora extra
          </label>
          {overtime && (
            <label className={labelClass}>
              Monto referencial por hora extra (S/) <span className="text-danger">*</span>
              <input
                name="overtime_rate"
                required
                inputMode="decimal"
                placeholder="0.00"
                defaultValue={
                  worker?.overtime_rate_cents != null ? centsToSolesText(worker.overtime_rate_cents) : ""
                }
                className={fieldClass}
              />
            </label>
          )}
          <p className="text-xs text-muted">
            La tarifa y la hora extra son referenciales: el pago se acuerda en cada asignación a un evento.
          </p>
        </fieldset>

        {error && <ErrorAlert message={error} />}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Guardando…" : isNew ? "Registrar trabajador" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
