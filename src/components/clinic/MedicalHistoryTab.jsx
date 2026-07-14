import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { FileText, FlaskConical, Stethoscope, Unlink, Printer, Link2 } from "lucide-react";
import { toast } from "sonner";
import { printPatientReport } from "@/utils/clinicReport";

const TYPE_META = {
  visit: { label: "زيارة", icon: Stethoscope, color: "text-primary", bg: "bg-primary/10", ring: "ring-primary/30" },
  rx: { label: "وصفة طبية", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  test: { label: "تحليل / فحص", icon: FlaskConical, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" },
};

export default function MedicalHistoryTab() {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { const p = await base44.entities.Patient.list(); setPatients(p); setLoading(false); })(); }, []);

  useEffect(() => {
    if (!patientId) { setPatient(null); setVisits([]); setPrescriptions([]); return; }
    (async () => {
      const [p, v, rx] = await Promise.all([
        base44.entities.Patient.get(patientId),
        base44.entities.MedicalRecord.filter({ patient_id: patientId }, "-visit_date", 500),
        base44.entities.Prescription.filter({ patient_id: patientId }, "-date", 500),
      ]);
      setPatient(p); setVisits(v || []); setPrescriptions(rx || []);
    })();
  }, [patientId]);

  const tests = patient?.medical_tests || [];

  async function linkPrescription(prescId, visitId) {
    await base44.entities.Prescription.update(prescId, { visit_id: visitId });
    setPrescriptions(prescriptions.map(p => p.id === prescId ? { ...p, visit_id: visitId } : p));
    toast.success("تم ربط الوصفة بالزيارة");
  }
  async function unlinkPrescription(prescId) {
    await base44.entities.Prescription.update(prescId, { visit_id: "" });
    setPrescriptions(prescriptions.map(p => p.id === prescId ? { ...p, visit_id: "" } : p));
    toast.success("تم فصل الوصفة");
  }
  async function linkTest(idx, visitId) {
    const arr = [...tests];
    arr[idx] = { ...arr[idx], visit_id: visitId };
    const updated = await base44.entities.Patient.update(patient.id, { medical_tests: arr });
    setPatient({ ...patient, medical_tests: updated.medical_tests || arr });
    toast.success("تم ربط التحليل بالزيارة");
  }
  async function unlinkTest(idx) {
    const arr = [...tests];
    arr[idx] = { ...arr[idx], visit_id: "" };
    const updated = await base44.entities.Patient.update(patient.id, { medical_tests: arr });
    setPatient({ ...patient, medical_tests: updated.medical_tests || arr });
    toast.success("تم فصل التحليل");
  }

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  // Build unified timeline events
  const events = [
    ...(visits || []).map(v => ({ kind: "visit", date: v.visit_date, data: v })),
    ...prescriptions.map(p => ({ kind: "rx", date: p.date, data: p })),
    ...tests.map((t, i) => ({ kind: "test", date: t.date, data: t, index: i })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const visitOptions = visits || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <h3 className="font-semibold">التاريخ الطبي</h3>
        <div className="flex items-center gap-2">
          {patientId && (
            <Button variant="outline" size="sm" onClick={() => printPatientReport(patientId).catch(() => toast.error("تعذّر إنشاء التقرير"))}>
              <Printer className="h-4 w-4" /> تقرير مفصل
            </Button>
          )}
          <div className="w-64">
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger><SelectValue placeholder="اختر المريض" /></SelectTrigger>
              <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!patientId && <p className="text-sm text-muted-foreground text-center py-10">اختر مريضًا لعرض تاريخه الطبي.</p>}

      {patientId && (
        <>
          {/* legend */}
          <div className="flex gap-4 mb-4 text-xs">
            {Object.entries(TYPE_META).map(([k, m]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${m.bg} ring-2 ${m.ring}`} />
                <span className="text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>

          {events.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">لا توجد سجلات طبية لهذا المريض.</p>}

          {/* timeline */}
          <div className="relative pr-6">
            <div className="absolute right-[10px] top-1 bottom-1 w-px bg-border" />
            <div className="space-y-4">
              {events.map((ev, i) => {
                const m = TYPE_META[ev.kind];
                const Icon = m.icon;
                return (
                  <div key={i} className="relative">
                    <div className={`absolute right-0 top-1.5 h-5 w-5 rounded-full ${m.bg} ring-4 ring-background flex items-center justify-center`}>
                      <Icon className={`h-3 w-3 ${m.color}`} />
                    </div>
                    <div className="mr-8 border rounded-lg p-3 bg-card">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.bg} ${m.color}`}>{m.label}</span>
                          <span className="text-sm font-medium">{ev.date || "—"}</span>
                        </div>
                        {ev.kind === "visit" && ev.data.doctor_name && <span className="text-xs text-muted-foreground">{ev.data.doctor_name}</span>}
                      </div>

                      <div className="mt-2 text-sm space-y-1">
                        {ev.kind === "visit" && (
                          <>
                            {ev.data.symptoms && <div><span className="text-muted-foreground">الأعراض: </span>{ev.data.symptoms}</div>}
                            {ev.data.diagnosis && <div><span className="text-muted-foreground">التشخيص: </span>{ev.data.diagnosis}</div>}
                            {ev.data.notes && <div><span className="text-muted-foreground">ملاحظات: </span>{ev.data.notes}</div>}
                          </>
                        )}
                        {ev.kind === "rx" && (
                          <>
                            {ev.data.diagnostic_status && <div><span className="text-muted-foreground">الحالة التشخيصية: </span>{ev.data.diagnostic_status}</div>}
                            {(ev.data.items || []).length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {ev.data.items.map((it, j) => (
                                  <span key={j} className="text-xs border rounded px-1.5 py-0.5 bg-muted/30">
                                    {it.medicine}{it.dosage ? ` — ${it.dosage}` : ""}{it.duration ? ` — ${it.duration}` : ""}
                                  </span>
                                ))}
                              </div>
                            )}
                            {ev.data.notes && <div className="text-xs text-muted-foreground mt-1">{ev.data.notes}</div>}
                          </>
                        )}
                        {ev.kind === "test" && (
                          <>
                            <div><span className="text-muted-foreground">النوع: </span><b>{ev.data.test_name || "—"}</b></div>
                            {ev.data.result && <div><span className="text-muted-foreground">النتيجة: </span>{ev.data.result}</div>}
                            {ev.data.notes && <div><span className="text-muted-foreground">ملاحظات: </span>{ev.data.notes}</div>}
                          </>
                        )}
                      </div>

                      {/* linking controls for rx/test */}
                      {(ev.kind === "rx" || ev.kind === "test") && (
                        <div className="mt-2 flex items-center gap-2">
                          {ev.data.visit_id ? (
                            <BadgeLinked label="مرتبطة بزيارة" onUnlink={() => ev.kind === "rx" ? unlinkPrescription(ev.data.id) : unlinkTest(ev.index)} />
                          ) : (
                            <div className="flex items-center gap-1">
                              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                              <Select value="" onValueChange={(val) => val && (ev.kind === "rx" ? linkPrescription(ev.data.id, val) : linkTest(ev.index, val))}>
                                <SelectTrigger className="h-7 w-40 text-xs"><SelectValue placeholder="ربط بزيارة" /></SelectTrigger>
                                <SelectContent>
                                  {visitOptions.map(v => <SelectItem key={v.id} value={v.id}>{v.visit_date} - {v.doctor_name || "زيارة"}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BadgeLinked({ label, onUnlink }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs border rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {label}
      <Button size="icon" variant="ghost" className="h-5 w-5 text-emerald-700 hover:text-destructive" onClick={onUnlink}><Unlink className="h-3 w-3" /></Button>
    </div>
  );
}