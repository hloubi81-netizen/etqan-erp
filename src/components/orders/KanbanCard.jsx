import { Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Clock, CheckCircle2, XCircle, Truck,
  Package, Calendar, User, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_CONFIG = {
  "قيد الانتظار": { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  "موافق عليه": { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  "مرفوض": { color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  "تم الصرف": { color: "bg-blue-100 text-blue-800 border-blue-200", icon: Truck },
};

export default function KanbanCard({ request, index, onView }) {
  const cfg = STATUS_CONFIG[request.status] || STATUS_CONFIG["قيد الانتظار"];
  const Icon = cfg.icon;

  return (
    <Draggable draggableId={request.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "mb-2",
            snapshot.isDragging && "rotate-2 shadow-lg opacity-90"
          )}
        >
          <Card className="hover:shadow-md transition-shadow border cursor-grab active:cursor-grabbing">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-800 truncate">
                    #{request.request_number}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3 w-3" /> {request.date}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0"
                  onClick={(e) => { e.stopPropagation(); onView(request); }}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Badge className={cn("gap-1 text-xs", cfg.color)} variant="outline">
                <Icon className="h-3 w-3" /> {request.status}
              </Badge>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> {request.employee_name}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" /> {request.items?.length || 0} صنف
                </span>
              </div>

              {request.department && (
                <p className="text-xs text-gray-400">{request.department}</p>
              )}

              {request.rejection_reason && (
                <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                  سبب الرفض: {request.rejection_reason}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}