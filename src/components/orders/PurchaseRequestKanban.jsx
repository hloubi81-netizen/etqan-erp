import { useState, useCallback } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { Clock, CheckCircle2, XCircle, Truck } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";

const COLUMNS = [
  { status: "قيد الانتظار", label: "قيد الانتظار", icon: Clock, colorClass: "bg-yellow-100 text-yellow-600" },
  { status: "موافق عليه", label: "تمت الموافقة", icon: CheckCircle2, colorClass: "bg-green-100 text-green-600" },
  { status: "مرفوض", label: "مرفوض", icon: XCircle, colorClass: "bg-red-100 text-red-600" },
  { status: "تم الصرف", label: "تم الاستلام", icon: Truck, colorClass: "bg-blue-100 text-blue-600" },
];

export default function PurchaseRequestKanban({ requests, isAdmin, onView, onRefresh }) {
  const [rejectTarget, setRejectTarget] = useState(null);

  const getColumnRequests = (status) =>
    requests.filter((r) => r.status === status);

  const handleDragEnd = useCallback(async (result) => {
    const { draggableId, source, destination } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const request = requests.find((r) => r.id === draggableId);
    if (!request) return;
    if (!isAdmin) { toast.error("المشرف فقط يمكنه تغيير حالة الطلب"); return; }

    const newStatus = destination.droppableId;

    // If moving to rejected, show confirmation dialog
    if (newStatus === "مرفوض") {
      setRejectTarget({ request, oldStatus: source.droppableId });
      return;
    }

    await updateRequestStatus(request, newStatus, null);
  }, [requests, isAdmin]);

  const updateRequestStatus = async (request, newStatus, reason) => {
    try {
      const updateData = { status: newStatus };

      if (newStatus === "موافق عليه") {
        const user = await base44.auth.me();
        updateData.approved_by = user?.id;
        updateData.approved_by_name = user?.full_name || user?.email;
        updateData.approved_at = new Date().toISOString();
      } else if (newStatus === "مرفوض") {
        if (!reason) return; // Should not happen
        updateData.rejection_reason = reason;
      } else if (newStatus === "تم الصرف") {
        updateData.received_at = new Date().toISOString();
      } else if (newStatus === "قيد الانتظار") {
        updateData.approved_by = null;
        updateData.approved_by_name = null;
        updateData.approved_at = null;
        updateData.rejection_reason = null;
      }

      await base44.entities.PurchaseRequest.update(request.id, updateData);
      toast.success(`تم نقل الطلب إلى "${newStatus}"`);
      onRefresh();
    } catch (e) {
      toast.error("حدث خطأ أثناء تحديث الحالة");
    }
  };

  const handleRejectConfirm = async (reason) => {
    if (!rejectTarget) return;
    await updateRequestStatus(rejectTarget.request, "مرفوض", reason);
    setRejectTarget(null);
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const columnRequests = getColumnRequests(col.status);
            return (
              <KanbanColumn
                key={col.status}
                status={col.status}
                label={col.label}
                icon={col.icon}
                colorClass={col.colorClass}
                count={columnRequests.length}
              >
                {columnRequests.map((req, index) => (
                  <KanbanCard
                    key={req.id}
                    request={req}
                    index={index}
                    onView={onView}
                  />
                ))}
              </KanbanColumn>
            );
          })}
        </div>
      </DragDropContext>

      {/* Reject Reason Dialog */}
      {rejectTarget && (
        <RejectDialog
          requestNumber={rejectTarget.request.request_number}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </>
  );
}

function RejectDialog({ requestNumber, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
          <XCircle className="h-5 w-5 text-red-600" /> تأكيد الرفض
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          رفض الطلب #{requestNumber}
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1">سبب الرفض *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="اذكر سبب الرفض..."
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
        />
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50">
            إلغاء
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            تأكيد الرفض
          </button>
        </div>
      </div>
    </div>
  );
}