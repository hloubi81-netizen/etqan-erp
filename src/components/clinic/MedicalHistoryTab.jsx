import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { FileText, FlaskConical, Stethoscope, Unlink, Printer } from "lucide-react";
import { toast } from "sonner";
import { printPatientReport } from "@/utils/clinicReport";

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
        base44.entities.MedicalRecord.filter({ patient_id: patientId }, "-visit_date", 200),
        base44.entities.Prescription.filter({ patient_id: patientId }, "-date", 200),
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
    toast.success("تم ربط التقرير بالزيارة");
  }
  async function unlinkTest(idx) {
    const arr = [...tests];
    arr[idx] = { ...arr[idx], visit_id: "" };
    const updated = await base44.entities.Patient.update(patient.id, { medical_tests: arr });
    setPatient({ ...patient, medical_tests: updated.medical_tests || arr });
    toast.success("تم فصل التقرير");
  }

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const unlinkedRx = prescriptions.filter(p => !p.visit_id);
  const unlinkedTests = tests.map((t, i) => ({ t, i })).filter(x => !x.t.visit_id);

  return (
    <div>
      <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
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
        <div className="space-y-4">
          {/* Unlinked items to assign */}
          {(unlinkedRx.length > 0 || unlinkedTests.length > 0) && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <p className="text-xs font-medium mb-2 text-muted-foreground">مستندات غير مرتبطة بزيارة (اختر الزيارة لربطها):</p>
              <div className="flex flex-wrap gap-2">
                {unlinkedRx.map(p => (
                  <div key={p.id} className="flex items-center gap-1 border rounded-md px-2 py-1 bg-background">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs">وصفة: {p.date}</span>
                    <Select value="" onValueChange={(v) => linkPrescription(p.id, v)}>
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="ربط بزيارة" /></SelectTrigger>
                      <SelectContent>{visits.map(v => <SelectItem key={v.id} value={v.id}>{v.visit_date} - {v.doctor_name || "زيارة"}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
                {unlinkedTests.map(({ t, i }) => (
                  <div key={i} className="flex items-center gap-1 border rounded-md px-2 py-1 bg-background">
                    <FlaskConical className="h-3.5 w-3.5 text-warning" />
                    <span className="text-xs">{t.test_name || "فحص"}: {t.date}</span>
                    <Select value="" onValueChange={(v) => linkTest(i, v)}>
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="ربط بزيارة" /></SelectTrigger>
                      <SelectContent>{visits.map(v => <SelectItem key={v.id} value={v.id}>{v.visit_date} - {v.doctor_name || "زيارة"}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visits timeline */}
          {visits.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">لا توجد زيارات مسجلة لهذا المريض.</p>}
          {visits.map(v => {
            const linkedRx = prescriptions.filter(p => p.visit_id === v.id);
            const linkedTests = tests.map((t, i) => ({ t, i })).filter(x => x.t.visit_id === v.id);
            return (
              <div key={v.id} className="border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center"><Stethoscope className="h-4 w-4 text-primary" /></div>
                    <div>
                      <p className="font-medium text-sm">زيارة بتاريخ {v.visit_date}</p>
                      <p className="text-xs text-muted-foreground">{v.doctor_name || "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Select value="" onValueChange={(val) => val && linkPrescription(val, v.id)}>
                      <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="ربط وصفة" /></SelectTrigger>
                      <SelectContent>{unlinkedRx.map(p => <SelectItem key={p.id} value={p.id}>{p.date}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value="" onValueChange={(val) => val && linkTest(parseInt(val, 10), v.id)}>
                      <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="ربط تقرير" /></SelectTrigger>
                      <SelectContent>{unlinkedTests.map(({ t, i }) => <SelectItem key={i} value={String(i)}>{t.test_name || "فحص"} - {t.date}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-3 grid md:grid-cols-2 gap-2 text-sm">
                  {v.symptoms && <div><span className="text-muted-foreground">الأعراض: </span>{v.symptoms}</div>}
                  {v.diagnosis && <div><span className="text-muted-foreground">التشخيص: </span>{v.diagnosis}</div>}
                  {v.notes && <div className="md:col-span-2"><span className="text-muted-foreground">ملاحظات: </span>{v.notes}</div>}
                </div>
                {/* Linked prescriptions */}
                {linkedRx.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium mb-1 flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> الوصفات المرتبطة</p>
                    <div className="space-y-1">
                      {linkedRx.map(p => (
                        <div key={p.id} className="flex items-center justify-between border rounded-md px-2 py-1.5 bg-muted/30 text-xs">
                          <span>وصفة {p.date} — {(p.items || []).length} دواء{p.diagnostic_status ? ` — ${p.diagnostic_status}` : ""}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => unlinkPrescription(p.id)}><Unlink className="h-3.5 w-3.5" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Linked diagnostic reports */}
                {linkedTests.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium mb-1 flex items-center gap-1"><FlaskConical className="h-3.5 w-3.5" /> التقارير التشخيصية المرتبطة</p>
                    <div className="space-y-1">
                      {linkedTests.map(({ t, i }) => (
                        <div key={i} className="flex items-center justify-between border rounded-md px-2 py-1.5 bg-muted/30 text-xs">
                          <span><b>{t.test_name || "فحص"}</b> — {t.date} — النتيجة: {t.result || "—"}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => unlinkTest(i)}><Unlink className="h-3.5 w-3.5" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {linkedRx.length === 0 && linkedTests.length === 0 && <p className="text-xs text-muted-foreground mt-2">لا مستندات مرتبطة بهذه الزيارة.</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}