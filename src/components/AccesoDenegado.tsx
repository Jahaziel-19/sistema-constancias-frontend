import { ShieldAlert } from "lucide-react";

export default function AccesoDenegado({ modulo }: { modulo?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-[28px] border border-uh-stone/15 bg-white p-8 text-center shadow-paper">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-uh-red/25 bg-uh-red/5 text-uh-red">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div className="uh-title mt-4 text-xl font-semibold text-uh-ink">Acceso denegado</div>
        <p className="mt-2 text-sm text-uh-stone/80">
          {modulo
            ? `No tienes permiso para acceder al módulo "${modulo}".`
            : "No tienes permiso para acceder a este módulo."}
        </p>
      </div>
    </div>
  );
}
