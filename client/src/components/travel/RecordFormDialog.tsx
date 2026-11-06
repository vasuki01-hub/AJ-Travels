import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { DEFAULT_RECORD, type CustomField, type RecordType, type TravelRecord, type TravelRecordInput } from "@shared/travel";

type Props = {
  open: boolean;
  initial?: TravelRecord | null;
  initialType: RecordType;
  initialSourceEnquiry?: TravelRecord | null;
  sourceEnquiries: TravelRecord[];
  customFields: CustomField[];
  currency: string;
  onClose: () => void;
  onSubmit: (data: TravelRecordInput) => Promise<void>;
};

const statusOptions: Record<RecordType, { value: string; label: string }[]> = {
  enquiry: [
    { value: "new", label: "New enquiry" }, { value: "contacted", label: "Contacted" },
    { value: "quoted", label: "Quote sent" }, { value: "follow-up", label: "Follow-up" },
    { value: "converted", label: "Converted" }, { value: "lost", label: "Lost" },
  ],
  booking: [
    { value: "confirmed", label: "Confirmed" }, { value: "ticketed", label: "Ticketed" },
    { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" },
  ],
};

type FareGroup = "adult" | "youth" | "child" | "infant";
type MoneyKey = "netFareAdult" | "netFareYouth" | "netFareChild" | "netFareInfant" | "clientFareAdult" | "clientFareYouth" | "clientFareChild" | "clientFareInfant" | "totalNet" | "totalFareQuoted" | "receivedPayment";
type CountKey = "adultCount" | "youthCount" | "childCount" | "infantCount";
const moneyFieldKeys: MoneyKey[] = ["netFareAdult", "netFareYouth", "netFareChild", "netFareInfant", "clientFareAdult", "clientFareYouth", "clientFareChild", "clientFareInfant", "totalNet", "totalFareQuoted", "receivedPayment"];
const countKeys: CountKey[] = ["adultCount", "youthCount", "childCount", "infantCount"];
const passengerGroups: { key: FareGroup; label: string; countKey: CountKey; netKey: MoneyKey; clientKey: MoneyKey }[] = [
  { key: "adult", label: "Adult", countKey: "adultCount", netKey: "netFareAdult", clientKey: "clientFareAdult" },
  { key: "youth", label: "Youth", countKey: "youthCount", netKey: "netFareYouth", clientKey: "clientFareYouth" },
  { key: "child", label: "Child", countKey: "childCount", netKey: "netFareChild", clientKey: "clientFareChild" },
  { key: "infant", label: "Infant", countKey: "infantCount", netKey: "netFareInfant", clientKey: "clientFareInfant" },
];
function todayLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function textFor(amount: number) { return Number.isFinite(amount) ? String(amount) : "0"; }
function computedFare(values: TravelRecordInput, which: "net" | "client") {
  return passengerGroups.reduce((total, group) => total + Number(values[group.countKey] || 0) * Number(values[which === "net" ? group.netKey : group.clientKey] || 0), 0);
}
function enquiryBooking(enquiry: TravelRecord, bookingDate = todayLocal()): TravelRecordInput {
  return {
    ...DEFAULT_RECORD, recordType: "booking", status: "confirmed", sourceEnquiryId: enquiry.id,
    customerName: enquiry.customerName, passengers: enquiry.passengers ?? "", email: enquiry.email ?? "",
    contactNo: enquiry.contactNo ?? "", enquiryDate: enquiry.enquiryDate ?? "", bookingDate,
    departureDate: enquiry.departureDate ?? "", origin: enquiry.origin ?? "", destination: enquiry.destination ?? "",
    remarks: enquiry.remarks ?? "", customFields: enquiry.customFields ?? {},
  };
}
function TextField({ label, value, onChange, type = "text", placeholder = "", wide = false, readOnly = false }: {
  label: string; value: string | number; onChange?: (value: string) => void; type?: string; placeholder?: string; wide?: boolean; readOnly?: boolean;
}) {
  return <label className={`form-field${wide ? " form-field-wide" : ""}`}><span>{label}</span><input type={type} value={value} placeholder={placeholder} readOnly={readOnly} step={type === "number" ? "0.01" : undefined} onChange={event => onChange?.(event.target.value)} /></label>;
}

export default function RecordFormDialog({ open, initial, initialType, initialSourceEnquiry, sourceEnquiries, customFields, currency, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<TravelRecordInput>({ ...DEFAULT_RECORD, recordType: initialType });
  const [amountText, setAmountText] = useState<Record<MoneyKey, string>>(() => Object.fromEntries(moneyFieldKeys.map(key => [key, textFor(DEFAULT_RECORD[key])])) as Record<MoneyKey, string>);
  const [visibleFareGroups, setVisibleFareGroups] = useState<Set<FareGroup>>(() => new Set(["adult"]));
  const [manualTotals, setManualTotals] = useState({ net: false, client: false });
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);
  const isBooking = values.recordType === "booking";
  const currencySymbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : "£";
  const activeCustomFields = useMemo(() => customFields.filter(field => field.enabled), [customFields]);

  useEffect(() => {
    if (!open) return;
    const next: TravelRecordInput = initial
      ? { ...DEFAULT_RECORD, ...initial, sourceEnquiryId: initial.sourceEnquiryId ?? null, customFields: initial.customFields ?? {} }
      : initialSourceEnquiry
        ? enquiryBooking(initialSourceEnquiry)
        : { ...DEFAULT_RECORD, recordType: initialType, status: initialType === "booking" ? "confirmed" : "new", enquiryDate: initialType === "enquiry" ? todayLocal() : "" };
    setValues(next);
    setAmountText(Object.fromEntries(moneyFieldKeys.map(key => [key, textFor(next[key] ?? 0)])) as Record<MoneyKey, string>);
    setManualTotals({ net: false, client: false });
    const visible = new Set<FareGroup>(["adult"]);
    if (next.recordType === "booking") passengerGroups.slice(1).forEach(group => {
      if (Number(next[group.countKey] || 0) > 0 || Number(next[group.netKey] || 0) !== 0 || Number(next[group.clientKey] || 0) !== 0) visible.add(group.key);
    });
    setVisibleFareGroups(visible);
  }, [open, initial, initialType, initialSourceEnquiry]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);
  if (!open) return null;

  const set = <K extends keyof TravelRecordInput,>(key: K, value: TravelRecordInput[K]) => setValues(current => ({ ...current, [key]: value }));
  const autoTotalAfterFareChange = (next: TravelRecordInput, changed: MoneyKey | CountKey) => {
    const groupChange = passengerGroups.find(group => group.netKey === changed || group.clientKey === changed);
    const countChange = countKeys.includes(changed as CountKey);
    const netKey = Boolean((countChange || groupChange?.netKey === changed) && !manualTotals.net);
    const clientKey = Boolean((countChange || groupChange?.clientKey === changed) && !manualTotals.client);
    const totalNet = netKey ? computedFare(next, "net") : next.totalNet;
    const totalFareQuoted = clientKey ? computedFare(next, "client") : next.totalFareQuoted;
    setAmountText(current => ({ ...current, ...(netKey ? { totalNet: textFor(totalNet) } : {}), ...(clientKey ? { totalFareQuoted: textFor(totalFareQuoted) } : {}) }));
    return { ...next, totalNet, totalFareQuoted, profit: totalFareQuoted - totalNet };
  };
  const setMoney = (key: MoneyKey, raw: string) => {
    setAmountText(current => ({ ...current, [key]: raw }));
    const parsed = raw.trim() === "" ? 0 : Number(raw);
    const amount = Number.isFinite(parsed) ? parsed : 0;
    if (key === "totalNet") {
      setManualTotals(current => ({ ...current, net: true }));
      setValues(current => ({ ...current, totalNet: amount, profit: current.totalFareQuoted - amount }));
    } else if (key === "totalFareQuoted") {
      setManualTotals(current => ({ ...current, client: true }));
      setValues(current => ({ ...current, totalFareQuoted: amount, profit: amount - current.totalNet }));
    } else {
      setValues(autoTotalAfterFareChange({ ...values, [key]: amount }, key));
    }
  };
  const setCount = (key: CountKey, raw: string) => {
    const parsed = raw.trim() === "" ? 0 : Math.max(0, Math.min(100, Math.floor(Number(raw) || 0)));
    setValues(autoTotalAfterFareChange({ ...values, [key]: parsed }, key));
  };
  const recalculateTotals = () => {
    const totalNet = computedFare(values, "net");
    const totalFareQuoted = computedFare(values, "client");
    setValues(current => ({ ...current, totalNet, totalFareQuoted, profit: totalFareQuoted - totalNet }));
    setAmountText(current => ({ ...current, totalNet: textFor(totalNet), totalFareQuoted: textFor(totalFareQuoted) }));
    setManualTotals({ net: false, client: false });
  };
  const amountField = (key: MoneyKey, label: string) => <TextField key={key} label={`${label} (${currencySymbol})`} value={amountText[key]} onChange={raw => setMoney(key, raw)} type="number" />;
  const selectEnquiry = (id: string) => {
    const enquiry = sourceEnquiries.find(record => record.id === Number(id));
    if (!enquiry) { setValues(current => ({ ...current, sourceEnquiryId: null })); return; }
    const next = enquiryBooking(enquiry, values.bookingDate || todayLocal());
    setValues(next);
    setAmountText(Object.fromEntries(moneyFieldKeys.map(key => [key, textFor(next[key])])) as Record<MoneyKey, string>);
    setManualTotals({ net: false, client: false });
    setVisibleFareGroups(new Set(["adult"]));
  };
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ ...values, netFare: 0, quotedFare: 0, totalNet: Number(values.totalNet || 0), totalFareQuoted: Number(values.totalFareQuoted || 0), profit: Number(values.totalFareQuoted || 0) - Number(values.totalNet || 0) });
    } catch {
      // The parent mutation handler displays the relevant error message.
    } finally { setSaving(false); }
  };
  const setCustom = (id: string, value: string) => setValues(current => ({ ...current, customFields: { ...current.customFields, [id]: value } }));
  const changeCount = (key: CountKey, delta: number) => setCount(key, String(Math.max(0, Math.min(100, Number(values[key] || 0) + delta))));

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="record-modal-title">
        <header className="modal-head"><div><div className="eyebrow">{isEdit ? "Update record" : isBooking ? "New booking" : "New enquiry"}</div><h2 id="record-modal-title">{isEdit ? `Edit ${isBooking ? "booking" : "enquiry"}` : isBooking ? "Add a booking" : "Create an enquiry"}</h2><p>{isBooking ? "Booking references, passenger fares and payment tracking." : "Capture the traveller’s request and follow-up details."}</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close form"><X size={19} /></button></header>
        <form onSubmit={handleSubmit} className="record-form">
          <div className="form-scroll">
            <div className={`record-type-switch record-context ${isBooking ? "booking-context" : "enquiry-context"}`}><span className={`record-kind-pill ${values.recordType}`}>{isBooking ? "Booking" : "Enquiry"}</span><span className="record-context-note">{isBooking ? "Booking details shown" : "Enquiry details only · no booking fares or references"}</span><label className="status-select"><span>Status</span><select value={values.status} onChange={event => set("status", event.target.value)}>{statusOptions[values.recordType].map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
            {isBooking && !isEdit && <div className="form-section source-enquiry-picker"><label className="form-field"><span>Start from an open enquiry <small>Optional</small></span><select value={values.sourceEnquiryId ?? ""} onChange={event => selectEnquiry(event.target.value)}><option value="">Create a new booking</option>{sourceEnquiries.map(record => <option value={record.id} key={record.id}>#{record.id} · {record.customerName}{record.destination ? ` · ${record.destination}` : ""}</option>)}</select></label>{!sourceEnquiries.length && <p className="field-note">There are no open, unbooked enquiries to select right now.</p>}</div>}
            {isBooking && isEdit && values.sourceEnquiryId && <div className="linked-enquiry-note">Linked to source enquiry #{values.sourceEnquiryId}</div>}
            <div className="form-section"><div className="form-section-heading"><span className="section-number">01</span><div><h3>Customer & journey</h3><p>Who is travelling, and where to?</p></div></div><div className="form-grid">
              <TextField label="Customer name *" value={values.customerName} onChange={value => set("customerName", value)} placeholder="Full name" />
              <TextField label="Contact number" value={values.contactNo} onChange={value => set("contactNo", value)} placeholder="+44" />
              <TextField label="Email" value={values.email} onChange={value => set("email", value)} type="email" placeholder="traveller@example.com" />
              <TextField label="Passenger names" value={values.passengers} onChange={value => set("passengers", value)} placeholder="Separate names with commas" />
              <TextField label="Origin" value={values.origin} onChange={value => set("origin", value)} placeholder="London" />
              <TextField label="Destination" value={values.destination} onChange={value => set("destination", value)} placeholder="Mumbai" />
              {!isBooking && <TextField label="Enquiry date" value={values.enquiryDate} onChange={value => set("enquiryDate", value)} type="date" />}
              {isBooking && <TextField label="Booking date" value={values.bookingDate} onChange={value => set("bookingDate", value)} type="date" />}
              <TextField label={isBooking ? "Departure date" : "Preferred travel date"} value={values.departureDate} onChange={value => set("departureDate", value)} type="date" />
            </div></div>
            {isBooking && <>
              <div className="form-section"><div className="form-section-heading"><span className="section-number">02</span><div><h3>Booking reference</h3><p>PNR, ticket and issuing details.</p></div></div><div className="form-grid">
                <TextField label="System PNR" value={values.systemPnr} onChange={value => set("systemPnr", value.toUpperCase())} placeholder="e.g. 62KWK2" />
                <TextField label="Airline PNR" value={values.airlinePnr} onChange={value => set("airlinePnr", value.toUpperCase())} placeholder="Airline reference" />
                <TextField label="Ticket number" value={values.ticketNumber} onChange={value => set("ticketNumber", value)} placeholder="Ticket number" />
                <TextField label="Issued from" value={values.issuedFrom} onChange={value => set("issuedFrom", value)} placeholder="Supplier or platform" />
              </div></div>
              <div className="form-section"><div className="form-section-heading"><span className="section-number">03</span><div><h3>Passenger fares & payment</h3><p>Set a fare per traveller and adjust each group’s passenger count.</p></div></div>
                <div className="fare-passenger-groups">{passengerGroups.filter(group => visibleFareGroups.has(group.key)).map(group => <div className={`passenger-fare-row passenger-fare-${group.key}`} key={group.key}>
                  <span className="passenger-fare-label">{group.label}</span><label className="form-field count-field"><span>Passengers</span><span className="passenger-count-control"><button type="button" aria-label={`Remove one ${group.label.toLowerCase()}`} onClick={() => changeCount(group.countKey, -1)}><Minus size={14} /></button><input type="number" min="0" max="100" step="1" value={values[group.countKey]} onChange={event => setCount(group.countKey, event.target.value)} /><button type="button" aria-label={`Add one ${group.label.toLowerCase()}`} onClick={() => changeCount(group.countKey, 1)}><Plus size={14} /></button></span></label>
                  {amountField(group.netKey, "Net · each")}{amountField(group.clientKey, "Quoted · each")}
                </div>)}<div className="fare-group-adders" aria-label="Add passenger fare groups">{passengerGroups.filter(group => !visibleFareGroups.has(group.key)).map(group => <button key={group.key} className="fare-group-add" type="button" onClick={() => { setVisibleFareGroups(current => new Set([...current, group.key])); setCount(group.countKey, "1"); }}><Plus size={14} /> Add {group.label.toLowerCase()} · × 1</button>)}</div></div>
                <div className="booking-total-grid">{amountField("totalNet", "Total net")}{amountField("totalFareQuoted", "Total quoted")}{amountField("receivedPayment", "Payment received")}<TextField label="Payment date" value={values.paymentDate} onChange={value => set("paymentDate", value)} type="date" />
                  <label className="form-field"><span>Payment status</span><select value={values.paymentStatus} onChange={event => set("paymentStatus", event.target.value as TravelRecordInput["paymentStatus"])}><option value="pending">Pending</option><option value="partially_paid">Partially paid</option><option value="paid">Paid</option></select></label>
                  <label className="form-field"><span>Payment method</span><select value={values.paymentMode} onChange={event => set("paymentMode", event.target.value)}><option value="">Select method</option><option>Card</option><option>Cash</option><option>Bank transfer</option><option>Other</option></select></label>
                </div><div className="totals-recalculation"><span>{manualTotals.net || manualTotals.client ? "Manual totals are preserved while you edit passenger fares." : "Totals are calculated from each fare × passenger count."}</span><button type="button" onClick={recalculateTotals}><RotateCcw size={14} /> Recalculate from fares</button></div><div className="profit-hint"><span>Calculated profit</span><strong>{currencySymbol}{(Number(values.totalFareQuoted || 0) - Number(values.totalNet || 0)).toFixed(2)}</strong><small>Total quoted less total net fares</small></div>
              </div>
            </>}
            {activeCustomFields.length > 0 && <div className="form-section"><div className="form-section-heading"><span className="section-number">{isBooking ? "04" : "02"}</span><div><h3>Additional details</h3><p>Custom fields from your settings.</p></div></div><div className="form-grid">{activeCustomFields.map(field => <TextField key={field.id} label={field.label} value={values.customFields[field.id] ?? ""} onChange={value => setCustom(field.id, value)} type={field.type} />)}</div></div>}
            <div className="form-section"><div className="form-grid"><label className="form-field form-field-wide"><span>Remarks</span><textarea rows={3} value={values.remarks} onChange={event => set("remarks", event.target.value)} placeholder="Notes, special requests, fare adjustments…" /></label></div></div>
          </div>
          <footer className="modal-actions"><span className="form-required-note">* Required field</span><div><button className="button button-quiet" type="button" onClick={onClose} disabled={saving}>Cancel</button><button className="button button-primary" type="submit" disabled={saving || !values.customerName.trim()}>{saving ? "Saving…" : isEdit ? "Save changes" : isBooking ? "Save booking" : "Save enquiry"}</button></div></footer>
        </form>
      </section>
    </div>
  );
}
