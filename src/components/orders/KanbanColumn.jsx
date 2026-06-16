import { Droppable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function KanbanColumn({ status, label, icon: Icon, colorClass, count, children }) {
  return (
    <div className="flex flex-col bg-gray-50 rounded-xl border min-w-[280px] w-[280px] flex-shrink-0">
      <div className="flex items-center justify-between px-3 py-3 border-b bg-white/80 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", colorClass)}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm text-gray-700">{label}</span>
        </div>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 p-2 overflow-y-auto min-h-[200px] transition-colors",
              snapshot.isDraggingOver && "bg-blue-50"
            )}
          >
            {children}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}