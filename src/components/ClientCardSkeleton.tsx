import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ClientCardSkeleton = () => {
  return (
    <Card className="p-6 border-border bg-card animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 space-y-3">
          {/* Nome e Plano */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-6 w-24" />
          </div>
          
          {/* CPF e Data de Pagamento */}
          <div className="flex gap-4 text-sm">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        
        {/* Botões de ação */}
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      {/* Separador */}
      <div className="my-4 border-t border-border" />

      {/* Informações de Cortes */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="space-y-2 mb-4">
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>

      {/* Histórico de Cortes */}
      <div className="space-y-2 mb-4">
        <Skeleton className="h-5 w-40" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      {/* Histórico de Pagamentos */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </Card>
  );
};
