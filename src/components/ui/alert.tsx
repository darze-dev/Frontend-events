// Mensaje de error de la pantalla (lo que respondió la API, ya traducido).
import { Icon } from "../icons";

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div role="alert" className="flex gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
      <Icon name="alert" className="size-5 shrink-0" />
      {message}
    </div>
  );
}
