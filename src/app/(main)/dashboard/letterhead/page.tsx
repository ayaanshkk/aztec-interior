"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, UserSearch, X, Save, Trash2, Clock, CheckCircle, Pencil } from "lucide-react";
import { BACKEND_URL } from "@/lib/api";

interface Customer { id: string; name: string; address: string; phone: string; email: string; }
interface SavedLetter {
  id: number; client_id: number; form_name: string; status: string;
  created_at: string; customer: string;
  data: { date: string; subject: string; body: string; recipient: { name: string; address: string; phone: string; email: string; } };
}

const COMPANY = {
  name:    "Atelier Luxe Interiors Ltd",
  address: "127c Barkby Road, Leicester, LE4 9LG",
  phone:   "M: 07821 328849",
  email:   "E: accounts@atelierluxe.co.uk",
  reg:     "Registered in England No. 17200862",
};

const fmtDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";

const fmtShort = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

function LetterheadContent() {
  const searchParams = useSearchParams();
  const [recipient, setRecipient]     = useState({ name: "", address: "", phone: "", email: "" });
  const [subject, setSubject]         = useState("");
  const [body, setBody]               = useState("");
  const [date, setDate]               = useState(new Date().toISOString().split("T")[0]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // customer picker
  const [search, setSearch]           = useState("");
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showPicker, setShowPicker]   = useState(false);

  // save
  const [currentId, setCurrentId]     = useState<number | null>(null);
  const [saving, setSaving]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState("");

  // downloading
  const [downloading, setDownloading] = useState(false);

  // view/edit mode (view mode = read-only, activated when opened with ?id=)
  const [viewMode, setViewMode]       = useState(false);

  // saved letters panel
  const [saved, setSaved]             = useState<SavedLetter[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  const token = () => localStorage.getItem("token");

  // load saved letters on mount, and auto-load if ?id= is present
  useEffect(() => {
    const preloadId = searchParams?.get("id");
    fetch(`${BACKEND_URL}/api/letterheads`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : [])
      .then((list: SavedLetter[]) => {
        setSaved(list);
        if (preloadId) {
          const match = list.find(l => String(l.id) === preloadId);
          if (match) {
            loadLetter(match);
            setViewMode(true);
          }
        }
      })
      .finally(() => setLoadingSaved(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPicker = async () => {
    setShowPicker(true);
    setSearch("");
    if (allCustomers.length === 0) {
      setLoadingCustomers(true);
      try {
        const res = await fetch(`${BACKEND_URL}/customers`, { headers: { Authorization: `Bearer ${token()}` } });
        if (res.ok) setAllCustomers(await res.json());
      } finally { setLoadingCustomers(false); }
    }
  };

  const filteredCustomers = useMemo(() => {
    const t = search.toLowerCase();
    return allCustomers.filter(c => !t || (c.name || "").toLowerCase().includes(t) || (c.phone || "").toLowerCase().includes(t));
  }, [allCustomers, search]);

  const pickCustomer = (c: Customer) => {
    setRecipient({ name: c.name, address: c.address || "", phone: c.phone || "", email: c.email || "" });
    setSelectedClientId(c.id);
    setShowPicker(false);
    setSearch("");
  };

  const loadLetter = (l: SavedLetter) => {
    setCurrentId(l.id);
    setSelectedClientId(l.client_id ? String(l.client_id) : null);
    setDate(l.data.date || new Date().toISOString().split("T")[0]);
    setSubject(l.data.subject || "");
    setBody(l.data.body || "");
    setRecipient(l.data.recipient || { name: "", address: "", phone: "", email: "" });
    setSaveMsg("");
    setViewMode(true);
  };

  const newLetter = () => {
    setCurrentId(null);
    setSelectedClientId(null);
    setDate(new Date().toISOString().split("T")[0]);
    setSubject(""); setBody("");
    setRecipient({ name: "", address: "", phone: "", email: "" });
    setSaveMsg("");
    setViewMode(false);
  };

  const saveLetter = async (status: "draft" | "saved") => {
    setSaving(true);
    try {
      const payload = {
        id:         currentId,
        client_id:  selectedClientId,
        status,
        date, subject, body,
        recipient,
      };
      const res = await fetch(`${BACKEND_URL}/api/letterheads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      const json = await res.json();
      setCurrentId(json.id);

      // refresh list
      const listRes = await fetch(`${BACKEND_URL}/api/letterheads`, { headers: { Authorization: `Bearer ${token()}` } });
      if (listRes.ok) setSaved(await listRes.json());

      setSaveMsg(status === "draft" ? "Saved as draft" : "Saved");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch {
      alert("Failed to save letterhead");
    } finally {
      setSaving(false);
    }
  };

  const deleteLetter = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this letterhead?")) return;
    await fetch(`${BACKEND_URL}/api/letterheads/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    setSaved(prev => prev.filter(l => l.id !== id));
    if (currentId === id) newLetter();
  };

  const downloadDocx = async () => {
    setDownloading(true);
    try {
      const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
              ImageRun, Table, TableRow, TableCell, WidthType, convertInchesToTwip } =
        await import("docx");

      const FONT = "Calibri";

      const logoRes    = await fetch("/images/logo-full.png");
      const logoBuffer = await (await logoRes.blob()).arrayBuffer();

      const nil  = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;

      // Bottom divider rendered as a separate full-width paragraph (avoids table border weirdness)
      const headerDivider = new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "111827", space: 8 } },
        spacing: { after: 280 },
        children: [],
      });

      const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: nil, bottom: nil, left: nil, right: nil },
        rows: [new TableRow({ children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: { top: nil, bottom: nil, left: nil, right: nil },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [new Paragraph({
              spacing: { before: 0, after: 0 },
              children: [new ImageRun({ data: logoBuffer, transformation: { width: 300, height: 81 }, type: "png" })],
            })],
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: { top: nil, bottom: nil, left: nil, right: nil },
            margins: { top: 0, bottom: 0, left: 120, right: 0 },
            children: [
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: COMPANY.name, bold: true, size: 24, font: FONT })] }),
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 40 }, children: [new TextRun({ text: COMPANY.address, size: 20, color: "4B5563", font: FONT })] }),
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 40 }, children: [new TextRun({ text: COMPANY.phone, size: 20, color: "4B5563", font: FONT })] }),
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 40 }, children: [new TextRun({ text: COMPANY.email, size: 20, color: "4B5563", font: FONT })] }),
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 0  }, children: [new TextRun({ text: COMPANY.reg,   size: 16, color: "9CA3AF", font: FONT })] }),
            ],
          }),
        ]})],
      });

      const sp = () => new Paragraph({ children: [new TextRun({ text: "", font: FONT })] });
      const recipientLines = [recipient.name, recipient.address, recipient.phone, recipient.email].filter(Boolean);
      const bodyLines = body.split("\n").map(line => new Paragraph({ children: [new TextRun({ text: line || " ", size: 24, font: FONT })], spacing: { after: 140 } }));

      const doc = new Document({
        styles: {
          default: {
            document: {
              run: { font: FONT, size: 24 },
            },
          },
        },
        sections: [{ properties: { page: { margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1), right: convertInchesToTwip(1) } } }, children: [
          headerTable, headerDivider,
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmtDate(date), size: 24, color: "374151", font: FONT })], spacing: { after: 280 } }),
          ...recipientLines.map(line => new Paragraph({ children: [new TextRun({ text: line, size: 24, color: "374151", font: FONT })], spacing: { after: 80 } })),
          sp(),
          ...(subject ? [new Paragraph({ children: [new TextRun({ text: `Re: ${subject}`, bold: true, size: 28, font: FONT })], spacing: { after: 280 } })] : [sp()]),
          ...bodyLines, sp(), sp(),
          new Paragraph({ children: [new TextRun({ text: "Yours sincerely,", size: 24, font: FONT })] }),
          sp(), sp(), sp(),
          new Paragraph({ children: [new TextRun({ text: COMPANY.name, bold: true, size: 24, font: FONT })] }),
        ]}],
      });

      const blob = await Packer.toBlob(doc);
      const { saveAs } = await import("file-saver");
      saveAs(blob, `Letterhead${recipient.name ? `_${recipient.name.replace(/\s+/g, "_")}` : ""}_${date}.docx`);
    } catch (err) {
      console.error(err);
      alert("Failed to generate document.");
    } finally { setDownloading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto flex gap-6">

        {/* ── Saved letters sidebar ── */}
        <div className="w-64 shrink-0 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Letterheads</h2>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={newLetter}>
              + New
            </Button>
          </div>

          {loadingSaved ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
            </div>
          ) : saved.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No saved letterheads yet</p>
          ) : (
            saved.map(l => (
              <div
                key={l.id}
                onClick={() => loadLetter(l)}
                className={`group relative rounded-lg border p-3 cursor-pointer transition-colors ${
                  currentId === l.id
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate ${currentId === l.id ? "text-white" : "text-gray-800"}`}>
                      {l.data?.recipient?.name || "Untitled"}
                    </p>
                    {l.data?.subject && (
                      <p className={`text-xs truncate mt-0.5 ${currentId === l.id ? "text-gray-300" : "text-gray-500"}`}>
                        {l.data.subject}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {l.status === "draft" ? (
                        <span className={`inline-flex items-center gap-1 text-xs ${currentId === l.id ? "text-yellow-300" : "text-yellow-600"}`}>
                          <Clock className="h-3 w-3" /> Draft
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-xs ${currentId === l.id ? "text-green-300" : "text-green-600"}`}>
                          <CheckCircle className="h-3 w-3" /> Saved
                        </span>
                      )}
                      <span className={`text-xs ${currentId === l.id ? "text-gray-400" : "text-gray-400"}`}>
                        · {fmtShort(l.created_at)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={e => deleteLetter(l.id, e)}
                    className={`opacity-0 group-hover:opacity-100 shrink-0 transition-opacity ${currentId === l.id ? "text-gray-300 hover:text-white" : "text-gray-400 hover:text-red-500"}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Editor ── */}
        <div className="flex-1 space-y-4 min-w-0">

          {/* Controls bar */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-4">
            {viewMode ? (
              /* ── View mode: read-only summary + action buttons ── */
              <>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date</p>
                  <p className="text-sm text-gray-800 py-2 px-3 bg-gray-50 rounded-md w-40">{fmtDate(date) || '—'}</p>
                </div>
                <div className="flex-1 min-w-[200px] space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</p>
                  <p className="text-sm text-gray-800 py-2 px-3 bg-gray-50 rounded-md truncate">{recipient.name || '—'}</p>
                </div>
                <div className="flex-1 min-w-[200px] space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</p>
                  <p className="text-sm text-gray-800 py-2 px-3 bg-gray-50 rounded-md truncate">{recipient.address || '—'}</p>
                </div>
                <div className="flex items-end gap-2 self-end">
                  <Button variant="outline" size="sm" onClick={() => setViewMode(false)} className="gap-1.5">
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <Button size="sm" disabled={downloading} onClick={downloadDocx} className="gap-1.5">
                    <Download className="h-4 w-4" /> {downloading ? "Generating…" : "Download .docx"}
                  </Button>
                </div>
              </>
            ) : (
              /* ── Edit mode: full editable controls ── */
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date</label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
                </div>
                <div className="flex-1 min-w-[200px] space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</label>
                  <div className="flex gap-2">
                    <Input placeholder="Name" value={recipient.name} onChange={e => setRecipient(r => ({ ...r, name: e.target.value }))} className="flex-1" />
                    <Button variant="outline" size="icon" onClick={openPicker} title="Pick customer"><UserSearch className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="flex-1 min-w-[200px] space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</label>
                  <Input placeholder="Recipient address" value={recipient.address} onChange={e => setRecipient(r => ({ ...r, address: e.target.value }))} />
                </div>
                <div className="flex items-end gap-2 self-end">
                  {saveMsg && <span className="text-xs text-green-600 font-medium">{saveMsg}</span>}
                  {currentId && (
                    <Button variant="ghost" size="sm" onClick={() => setViewMode(true)} className="gap-1.5 text-gray-500">
                      Cancel
                    </Button>
                  )}
                  <Button variant="outline" size="sm" disabled={saving} onClick={() => saveLetter("draft")} className="gap-1.5">
                    <Clock className="h-4 w-4" /> Save Draft
                  </Button>
                  <Button variant="outline" size="sm" disabled={saving} onClick={async () => { await saveLetter("saved"); setViewMode(true); }} className="gap-1.5">
                    <Save className="h-4 w-4" /> Save
                  </Button>
                  <Button size="sm" disabled={downloading} onClick={downloadDocx} className="gap-1.5">
                    <Download className="h-4 w-4" /> {downloading ? "Generating…" : "Download .docx"}
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Customer picker dropdown */}
          {!viewMode && showPicker && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Search customers</span>
                <button onClick={() => { setShowPicker(false); setSearch(""); }}>
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              <Input autoFocus placeholder="Type name or phone…" value={search} onChange={e => setSearch(e.target.value)} />
              {loadingCustomers ? (
                <p className="text-xs text-gray-400 text-center py-4">Loading customers…</p>
              ) : (
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                  {filteredCustomers.slice(0, 10).map(c => (
                    <button key={c.id} onClick={() => pickCustomer(c)} className="w-full text-left px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors">
                      <p className="font-medium text-sm text-gray-900">{c.name}</p>
                      {c.address && <p className="text-xs text-gray-400 truncate">{c.address}</p>}
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No customers found</p>}
                </div>
              )}
            </div>
          )}

          {/* Letter preview / editor */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-10 py-10">

              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-gray-900 pb-7 mb-10">
                <Image src="/images/logo-full.png" alt="Atelier Luxe Interiors" width={280} height={76} className="object-contain" />
                <div className="text-right text-xs leading-6 text-gray-600">
                  <p className="font-semibold text-sm text-gray-900 mb-1">{COMPANY.name}</p>
                  <p>{COMPANY.address}</p>
                  <p>{COMPANY.phone}</p>
                  <p>{COMPANY.email}</p>
                  <p className="text-gray-400 mt-1">{COMPANY.reg}</p>
                </div>
              </div>

              {/* Date */}
              <p className="text-right text-sm text-gray-500 mb-8">{fmtDate(date)}</p>

              {/* Recipient */}
              <div className="mb-8 text-sm text-gray-700 space-y-0.5">
                {recipient.name    && <p className="font-medium">{recipient.name}</p>}
                {recipient.address && <p>{recipient.address}</p>}
                {recipient.phone   && <p>{recipient.phone}</p>}
                {recipient.email   && <p>{recipient.email}</p>}
                {!recipient.name && !recipient.address && (
                  <p className="text-gray-300 italic">Recipient details will appear here</p>
                )}
              </div>

              {/* Subject */}
              <div className="mb-6">
                {viewMode ? (
                  subject ? (
                    <p className="border-b border-dashed border-gray-200 pb-3 text-sm font-semibold text-gray-800">Re: {subject}</p>
                  ) : null
                ) : (
                  <Input
                    placeholder="Re: Subject line (optional)"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="border-0 border-b border-dashed border-gray-200 rounded-none px-0 text-sm font-semibold text-gray-800 placeholder:text-gray-300 focus-visible:ring-0 focus-visible:border-gray-400"
                  />
                )}
              </div>

              {/* Body */}
              {viewMode ? (
                <div className="w-full min-h-64 text-sm text-gray-700 leading-7 whitespace-pre-wrap">
                  {body || <span className="text-gray-300 italic">No content</span>}
                </div>
              ) : (
                <textarea
                  className="w-full min-h-64 text-sm text-gray-700 leading-7 resize-y outline-none placeholder:text-gray-300 font-[inherit]"
                  placeholder={"Dear [Name],\n\nType your letter here…\n\nYours sincerely,"}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                />
              )}

              {/* Sign-off */}
              <div className="mt-16 text-sm text-gray-700">
                <p className="font-semibold">{COMPANY.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LetterheadPage() {
  return (
    <Suspense fallback={null}>
      <LetterheadContent />
    </Suspense>
  );
}
