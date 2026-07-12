import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Loader2, RefreshCw, Check, X, Link2 } from "lucide-react";

const CONNECTOR_ID = "6a2f820e9d36c7b03419cd81";

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
];

function getDates() {
  const result = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    result.push(d);
  }
  return result;
}

function isSlotBusy(busySlots, dateStr, slot) {
  const slotStart = new Date(`${dateStr}T${slot}:00`);
  const slotEnd = new Date(slotStart.getTime() + 30 * 60000);
  return busySlots.some(busy => {
    if (!busy.start || !busy.end) return false;
    const busyStart = new Date(busy.start);
    const busyEnd = new Date(busy.end);
    return slotStart < busyEnd && slotEnd > busyStart;
  });
}

export default function CalendarAvailability({ onSlotSelect }) {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [busySlots, setBusySlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const dates = getDates();

  const fetchAvailability = useCallback(async (date) => {
    if (!date) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getCalendarAvailability", {
        start_date: date,
        end_date: date
      });
      if (res.data?.busy_slots) {
        setBusySlots(res.data.busy_slots);
        setConnected(true);
      } else if (res.data?.error) {
        setConnected(false);
      }
    } catch {
      setConnected(false);
      setBusySlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability(selectedDate);
  }, [selectedDate, fetchAvailability]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAvailability(selectedDate);
    setRefreshing(false);
  };

  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, "_blank");
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        fetchAvailability(selectedDate);
      }
    }, 500);
  };

  const handleSlotClick = (slot) => {
    if (isSlotBusy(busySlots, selectedDate, slot)) return;
    setSelectedSlot(slot);
    if (onSlotSelect) onSlotSelect(selectedDate, slot);
  };

  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  if (!connected && !loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            أوقات التواجد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Link2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">اربط تقويم جوجل لعرض الأوقات المتاحة</p>
            <Button onClick={handleConnect} size="sm" className="gap-2">
              <Link2 className="h-4 w-4" /> ربط التقويم
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            أوقات التواجد المتاحة
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {dates.map((d) => {
            const dateStr = d.toISOString().split('T')[0];
            const isActive = dateStr === selectedDate;
            return (
              <button
                key={dateStr}
                onClick={() => { setSelectedDate(dateStr); setSelectedSlot(null); }}
                className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border"
                }`}
              >
                <span className="text-[10px] font-medium opacity-80">{dayNames[d.getDay()]}</span>
                <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                <span className="text-[10px] opacity-80">{monthNames[d.getMonth()]}</span>
              </button>
            );
          })}
        </div>

        {/* Time slots */}
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {TIME_SLOTS.map((slot) => {
              const busy = isSlotBusy(busySlots, selectedDate, slot);
              const selected = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  onClick={() => handleSlotClick(slot)}
                  disabled={busy}
                  className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                    busy
                      ? "bg-destructive/10 text-destructive/50 cursor-not-allowed"
                      : selected
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                        : "bg-success/10 text-success hover:bg-success/20"
                  }`}
                >
                  {busy ? <X className="h-3 w-3" /> : selected ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {slot}
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-success/20"></span> متاح
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-destructive/10"></span> محجوز
          </span>
        </div>

        {selectedSlot && (
          <div className="text-xs text-muted-foreground bg-primary/5 rounded-lg p-2 flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-primary" />
            الموعد المحدد: {dayNames[new Date(selectedDate).getDay()]} {new Date(selectedDate).getDate()} {monthNames[new Date(selectedDate).getMonth()]} الساعة {selectedSlot}
          </div>
        )}
      </CardContent>
    </Card>
  );
}