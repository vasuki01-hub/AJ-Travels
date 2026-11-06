import { Fragment, lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Check,
  ChevronDown, CircleDollarSign, Clock3, Compass, Download, FileSpreadsheet,
  FileText, Filter, LayoutDashboard, LogOut, Mail, MapPin, Menu, MoreHorizontal,
  Pencil, Phone, Plane, Plus, Search, Settings, Sparkles, Ticket, Trash2, TrendingUp,
  UserRound, UsersRound, Wallet, X, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { downloadExcel, downloadPdf } from "@/lib/exports";
import RecordFormDialog from "@/components/travel/RecordFormDialog";
const DashboardChart = lazy(() => import("@/components/travel/DashboardChart"));
const ReportCharts = lazy(() => import("@/components/travel/ReportCharts"));
import {
  DEFAULT_PORTAL_SETTINGS,
  type CustomField,
  type PortalSettings,
  type RecordType,
  type TravelRecord,
  type TravelRecordInput,
} from "@shared/travel";

const blue = "#1677e8";
type Section = "dashboard" | "enquiries" | "bookings" | "reports" | "settings";
type Period = "all" | "week" | "month" | "year";

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function entryDay(record: TravelRecord) {
  const date = record.createdAt instanceof Date ? record.createdAt : new Date(record.createdAt);
  return Number.isNaN(date.getTime()) ? "" : localDayKey(date);
}
function periodBounds(period: Period, now = new Date()) {
  const end = localDayKey(now);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === "month") start.setDate(1);
  if (period === "year") { start.setMonth(0, 1); }
  return { start: period === "all" ? "" : localDayKey(start), end: period === "all" ? "" : end };
}
function periodLabel(period: Period) {
  return ({ all: "All time", week: "This week", month: "This month", year: "This year" } as const)[period];
}
function withinPeriod(record: TravelRecord, period: Period) {
  if (period === "all") return true;
  const date = entryDay(record);
  if (!date) return false;
  const bounds = periodBounds(period);
  return date >= bounds.start && date <= bounds.end;
}

function formatMoney(amount: number, currency = "GBP") {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount || 0)); }
  catch { return `£${Number(amount || 0).toFixed(2)}`; }
}
function dateText(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
function shortDate(value: string | null | undefined) {
  if (!value) return "No departure date";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "No departure date" : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date);
}
function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "AJ"; }
function labelStatus(status: string) {
  return ({ new: "New", contacted: "Contacted", quoted: "Quote sent", "follow-up": "Follow-up", converted: "Converted", lost: "Lost", confirmed: "Confirmed", ticketed: "Ticketed", completed: "Completed", cancelled: "Cancelled" } as Record<string, string>)[status] ?? status;
}
function recordInput(record: TravelRecord, recordType = record.recordType, status = record.status): TravelRecordInput {
  return {
    recordType, status, customerName: record.customerName, passengers: record.passengers ?? "", email: record.email ?? "", contactNo: record.contactNo ?? "",
    enquiryDate: record.enquiryDate ?? "", bookingDate: record.bookingDate ?? "", departureDate: record.departureDate ?? "", origin: record.origin ?? "", destination: record.destination ?? "",
    systemPnr: record.systemPnr ?? "", airlinePnr: record.airlinePnr ?? "", ticketNumber: record.ticketNumber ?? "", sourceEnquiryId: record.sourceEnquiryId ?? null,
    adultCount: Number(record.adultCount ?? 1), youthCount: Number(record.youthCount ?? 0), childCount: Number(record.childCount ?? 0), infantCount: Number(record.infantCount ?? 0), netFare: Number(record.netFare || 0),
    netFareAdult: Number(record.netFareAdult || 0), netFareYouth: Number(record.netFareYouth || 0), netFareChild: Number(record.netFareChild || 0), netFareInfant: Number(record.netFareInfant || 0),
    totalNet: Number(record.totalNet || 0), quotedFare: Number(record.quotedFare || 0), clientFareAdult: Number(record.clientFareAdult || 0), clientFareYouth: Number(record.clientFareYouth || 0),
    clientFareChild: Number(record.clientFareChild || 0), clientFareInfant: Number(record.clientFareInfant || 0), totalFareQuoted: Number(record.totalFareQuoted || 0), profit: Number(record.profit || 0),
    receivedPayment: Number(record.receivedPayment || 0), paymentStatus: record.paymentStatus ?? "pending", paymentDate: record.paymentDate ?? "", paymentMode: record.paymentMode ?? "", issuedFrom: record.issuedFrom ?? "", remarks: record.remarks ?? "", customFields: record.customFields ?? {},
  };
}

function BrandMark({ settings, size = "normal" }: { settings: PortalSettings; size?: "normal" | "small" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [settings.logoUrl]);
  return settings.logoUrl && !failed ? <img className={`brand-mark ${size}`} src={settings.logoUrl} alt="" onError={() => setFailed(true)} /> : <span className={`brand-mark brand-mark-fallback ${size}`} aria-hidden="true"><span>AJ</span><i /></span>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.replace(/[^a-z-]/g, "")}`}><i />{labelStatus(status)}</span>;
}

function Sidebar({ active, setActive, settings, mobileOpen, closeMobile, onLogout, userName }: {
  active: Section; setActive: (section: Section) => void; settings: PortalSettings; mobileOpen: boolean; closeMobile: () => void; onLogout: () => void; userName: string;
}) {
  const nav: { id: Section; label: string; icon: LucideIcon; count?: number }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "enquiries", label: "Enquiries", icon: FileText },
    { id: "bookings", label: "Bookings", icon: Plane },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ];
  const visible = nav.filter(item => item.id === "dashboard" ? settings.modules.dashboard : item.id === "enquiries" ? settings.modules.enquiries : item.id === "bookings" ? settings.modules.bookings : settings.modules.reports);
  return <>
    {mobileOpen && <button className="mobile-shade" aria-label="Close navigation" onClick={closeMobile} />}
    <aside className={`sidebar${mobileOpen ? " sidebar-open" : ""}`}>
      <div className="sidebar-brand"><BrandMark settings={settings} /><div><strong>{settings.agencyName || "AJ Tours & Travel"}</strong><span>TRAVEL DESK</span></div><button className="sidebar-close icon-button" onClick={closeMobile} aria-label="Close navigation"><X size={18} /></button></div>
      <div className="sidebar-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        {visible.map(item => <button key={item.id} className={`nav-item${active === item.id ? " active" : ""}`} onClick={() => { setActive(item.id); closeMobile(); }}><item.icon size={18} strokeWidth={1.9} /><span>{item.label}</span>{active === item.id && <i className="nav-current" />}</button>)}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-tip"><span className="tip-icon"><Sparkles size={16} /></span><strong>Every trip, in good hands.</strong><p>Keep the details together and the next step clear.</p></div>
      <button className={`nav-item${active === "settings" ? " active" : ""}`} onClick={() => { setActive("settings"); closeMobile(); }}><Settings size={18} /><span>Settings</span>{active === "settings" && <i className="nav-current" />}</button>
      <div className="sidebar-user"><div className="user-avatar">{initials(userName)}</div><div className="user-info"><strong>{userName || "Team member"}</strong><span>Employee workspace</span></div><button className="icon-button logout-button" onClick={onLogout} title="Sign out" aria-label="Sign out"><LogOut size={16} /></button></div>
    </aside>
  </>;
}

function StatCard({ title, value, hint, icon: Icon, tone, trend }: { title: string; value: string; hint: string; icon: typeof CircleDollarSign; tone: string; trend?: string }) {
  return <article className={`stat-card tone-${tone}`}><div className="stat-top"><span className="stat-icon"><Icon size={18} /></span>{trend && <span className="stat-trend"><ArrowUpRight size={13} />{trend}</span>}</div><div className="stat-label">{title}</div><strong className="stat-value">{value}</strong><span className="stat-hint">{hint}</span></article>;
}

function Dashboard({ records, settings, onCreate, onOpen, setSection }: { records: TravelRecord[]; settings: PortalSettings; onCreate: () => void; onOpen: (record: TravelRecord) => void; setSection: (section: Section) => void }) {
  const bookings = records.filter(record => record.recordType === "booking" && record.status !== "cancelled");
  const activeBookings = bookings.filter(record => record.status !== "completed");
  const enquiries = records.filter(record => record.recordType === "enquiry");
  const totalQuoted = bookings.reduce((sum, record) => sum + Number(record.totalFareQuoted || 0), 0);
  const totalReceived = bookings.reduce((sum, record) => sum + Number(record.receivedPayment || 0), 0);
  const totalProfit = bookings.reduce((sum, record) => sum + Number(record.profit || 0), 0);
  const outstanding = bookings.reduce((sum, record) => sum + Math.max(0, Number(record.totalFareQuoted || 0) - Number(record.receivedPayment || 0)), 0);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter(record => record.departureDate && record.departureDate >= today).sort((a, b) => a.departureDate.localeCompare(b.departureDate)).slice(0, 4);
  const latest = [...records].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
  const sixMonths = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
    const id = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const set = bookings.filter(record => (record.bookingDate || "").startsWith(id));
    return { month: date.toLocaleDateString("en-GB", { month: "short" }), quoted: set.reduce((sum, record) => sum + Number(record.totalFareQuoted || 0), 0), profit: set.reduce((sum, record) => sum + Number(record.profit || 0), 0) };
  }), [bookings]);
  const greeting = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return <div className="page-stack dashboard-page">
    <section className="welcome-banner">
      <div className="welcome-copy"><span className="welcome-kicker"><span className="flight-path" /> YOUR TRAVEL DESK · {greeting.toUpperCase()}</span><h2>Good travel starts with <em>good details.</em></h2><p>See what is moving, what is due and where each journey stands.</p><div className="welcome-actions"><button className="button button-white" onClick={onCreate}><Plus size={16} />New enquiry</button><button className="button button-banner-quiet" onClick={() => setSection("bookings")}>View bookings <ArrowRight size={15} /></button></div></div>
      <div className="welcome-art" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="sun-disc" /><span className="cloud cloud-one" /><span className="cloud cloud-two" /><Plane size={62} strokeWidth={1.2} className="hero-plane" /><span className="art-stamp">AJ<br /><b>TRAVEL</b></span></div>
    </section>
    <section className="stats-grid">
      <StatCard title="Active bookings" value={String(activeBookings.length)} hint={`${bookings.length - activeBookings.length} completed trips excluded`} icon={Plane} tone="blue" />
      <StatCard title="Open enquiries" value={String(enquiries.filter(record => !["converted", "lost"].includes(record.status)).length)} hint={`${enquiries.length} enquiries recorded`} icon={UsersRound} tone="mint" />
      <StatCard title="Profit to date" value={formatMoney(totalProfit, settings.currency)} hint="Across non-cancelled bookings" icon={TrendingUp} tone="lavender" />
      <StatCard title="Payments due" value={formatMoney(outstanding, settings.currency)} hint={`${formatMoney(totalReceived, settings.currency)} received of ${formatMoney(totalQuoted, settings.currency)}`} icon={Wallet} tone="peach" />
    </section>
    <section className="dash-grid">
      <article className="surface chart-panel">
        <div className="section-title-row"><div><span className="eyebrow">BUSINESS SNAPSHOT</span><h3>Bookings & margin</h3><p>Your six-month booking value and profit trend.</p></div><button className="subtle-link" onClick={() => setSection("reports")}>Full report <ArrowRight size={14} /></button></div>
        <div className="chart-legend"><span><i className="legend-blue" />Quoted value</span><span><i className="legend-mint" />Profit</span></div>
        <div className="chart-area"><Suspense fallback={<div className="chart-empty">Preparing your chart…</div>}><DashboardChart data={sixMonths} currency={settings.currency} /></Suspense>{records.length === 0 && <div className="chart-empty">Your booking trends will take shape as records are added.</div>}</div>
      </article>
      <article className="surface departures-panel">
        <div className="section-title-row"><div><span className="eyebrow">UP NEXT</span><h3>Upcoming departures</h3><p>The journeys on the horizon.</p></div><span className="count-pill">{upcoming.length}</span></div>
        {upcoming.length ? <div className="departures-list">{upcoming.map(record => <button className="departure-row" key={record.id} onClick={() => onOpen(record)}><span className="departure-date"><strong>{record.departureDate ? new Date(`${record.departureDate}T12:00:00`).getDate() : "—"}</strong><small>{record.departureDate ? new Date(`${record.departureDate}T12:00:00`).toLocaleDateString("en-GB", { month: "short" }).toUpperCase() : "TBC"}</small></span><span className="departure-details"><strong>{record.destination || record.customerName}</strong><small>{record.customerName} · {record.systemPnr || "PNR pending"}</small></span><span className="departure-arrow"><ArrowRight size={15} /></span></button>)}</div> : <div className="empty-compact"><span className="empty-illustration"><CalendarDays size={20} /></span><strong>Nothing taking off just yet</strong><p>Bookings with a future departure date will show here.</p><button className="text-action" onClick={() => setSection("bookings")}>Open bookings <ArrowRight size={14} /></button></div>}
      </article>
    </section>
    <section className="surface activity-panel">
      <div className="section-title-row"><div><span className="eyebrow">RECENT ACTIVITY</span><h3>Latest updates</h3></div><button className="subtle-link" onClick={() => setSection("enquiries")}>View all records <ArrowRight size={14} /></button></div>
      {latest.length ? <div className="activity-list">{latest.map(record => <button key={record.id} className="activity-row" onClick={() => onOpen(record)}><span className={`activity-mark ${record.recordType}`}><Plane size={15} /></span><span className="activity-main"><strong>{record.customerName}</strong><small>{record.recordType === "booking" ? "Booking" : "Enquiry"} · {[record.origin, record.destination].filter(Boolean).join(" → ") || "Journey details pending"}</small></span><StatusBadge status={record.status} /><time>{dateText(record.updatedAt)}</time><MoreHorizontal size={17} className="activity-more" /></button>)}</div> : <div className="empty-line"><Compass size={18} /><span>Your latest enquiries and bookings will appear here.</span><button className="text-action" onClick={onCreate}>Add your first enquiry <ArrowRight size={14} /></button></div>}
    </section>
  </div>;
}

function paymentStatusLabel(value: string) { return ({ pending: "Pending", partially_paid: "Part-paid", paid: "Paid" } as Record<string, string>)[value] ?? value; }
function RecordTable({ records, currency, onEdit, onDelete, onConvert, onView, groupByMonth = true, monthlyProfitRecords }: {
  records: TravelRecord[]; currency: string; onEdit: (record: TravelRecord) => void; onDelete: (record: TravelRecord) => void; onConvert: (record: TravelRecord) => void; onView: (record: TravelRecord) => void; groupByMonth?: boolean; monthlyProfitRecords?: TravelRecord[];
}) {
  if (!records.length) return <div className="table-empty"><span className="empty-illustration"><Ticket size={21} /></span><h3>No records to show</h3><p>Add a travel record or adjust your search and filters.</p></div>;
  const months = new Map<string, { label: string; records: TravelRecord[] }>();
  records.forEach(record => {
    const day = entryDay(record);
    const key = groupByMonth ? (day ? day.slice(0, 7) : "undated") : "filtered";
    const [year, month] = key.split("-").map(Number);
    const label = key === "filtered" ? "Filtered records" : key === "undated" ? "Entry date not recorded" : new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const group = months.get(key) ?? { label, records: [] };
    group.records.push(record);
    months.set(key, group);
  });
  const monthEntries = [...months.entries()].sort(([first], [second]) => {
    if (first === "undated") return 1;
    if (second === "undated") return -1;
    return second.localeCompare(first);
  });
  let serial = 0;
  return <div className="table-scroll"><table className="record-table"><thead><tr><th>Sr. No.</th><th>Customer / PNR</th><th>Journey</th><th>Entry date</th><th>Departure</th><th>Total quoted</th><th>Received</th><th>Payment</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{monthEntries.map(([key, month]) => {
    const monthlyProfit = (monthlyProfitRecords ?? month.records).filter(record => record.recordType === "booking" && record.status !== "cancelled" && entryDay(record).slice(0, 7) === key).reduce((sum, record) => sum + Number(record.profit || 0), 0);
    return <Fragment key={key}><tr className="month-group-row"><th colSpan={10}><span className="month-group-title"><CalendarDays size={15} />{month.label}<small>{month.records.length} {month.records.length === 1 ? "entry" : "entries"}</small></span>{groupByMonth && month.records.some(record => record.recordType === "booking") && <strong className="month-profit">Month profit <b>{formatMoney(monthlyProfit, currency)}</b></strong>}</th></tr>{month.records.map(record => {
      serial += 1;
      return <tr key={record.id} onClick={() => onView(record)}><td data-label="Sr. No." className="serial-cell">{serial}</td><td data-label="Customer / PNR"><div className="customer-cell"><span className={`customer-avatar avatar-${record.recordType}`}>{initials(record.customerName)}</span><div><strong>{record.customerName}</strong><small>{record.systemPnr || record.contactNo || "No reference yet"}</small></div></div></td><td data-label="Journey"><div className="route-cell"><strong>{record.destination || "Journey TBD"}</strong><small>{[record.origin, record.destination].filter(Boolean).join(" → ") || "Details to follow"}</small></div></td><td data-label="Entry date">{dateText(entryDay(record))}</td><td data-label="Departure">{dateText(record.departureDate)}</td><td data-label="Total quoted" className="money-cell">{formatMoney(record.totalFareQuoted, currency)}</td><td data-label="Received" className="money-cell">{formatMoney(record.receivedPayment, currency)}</td><td data-label="Payment"><span className={`payment-badge payment-${record.paymentStatus}`}>{record.recordType === "booking" ? paymentStatusLabel(record.paymentStatus) : "—"}</span></td><td data-label="Status"><StatusBadge status={record.status} /></td><td data-label="Actions"><div className="row-actions" onClick={event => event.stopPropagation()}><button className="icon-button row-action" title="Edit record" onClick={() => onEdit(record)}><Pencil size={15} /></button>{record.recordType === "enquiry" && !["converted", "lost"].includes(record.status) && <button className="convert-button" title="Create booking from enquiry" onClick={() => onConvert(record)}><ArrowUpRight size={14} /></button>}<button className="icon-button row-action danger-hover" title="Delete record" onClick={() => onDelete(record)}><Trash2 size={15} /></button></div></td></tr>;
    })}</Fragment>;
  })}</tbody></table></div>;
}

function Reports({ records, settings, globalPeriod }: { records: TravelRecord[]; settings: PortalSettings; globalPeriod: Period }) {
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [reportType, setReportType] = useState("all");
  const filtered = useMemo(() => records.filter(record => {
    const date = entryDay(record);
    return (!from || date >= from) && (!to || date <= to) && (reportType === "all" || record.recordType === reportType);
  }), [records, from, to, reportType]);
  const bookings = filtered.filter(record => record.recordType === "booking" && record.status !== "cancelled");
  const totalQuoted = bookings.reduce((sum, row) => sum + Number(row.totalFareQuoted || 0), 0);
  const totalNet = bookings.reduce((sum, row) => sum + Number(row.totalNet || 0), 0);
  const totalProfit = bookings.reduce((sum, row) => sum + Number(row.profit || 0), 0);
  const totalReceived = bookings.reduce((sum, row) => sum + Number(row.receivedPayment || 0), 0);
  const sourceData = useMemo(() => {
    const grouped = new Map<string, { source: string; bookings: number; profit: number; quoted: number }>();
    bookings.forEach(row => { const source = row.issuedFrom || "Not specified"; const current = grouped.get(source) ?? { source, bookings: 0, profit: 0, quoted: 0 }; current.bookings += 1; current.profit += Number(row.profit || 0); current.quoted += Number(row.totalFareQuoted || 0); grouped.set(source, current); });
    return [...grouped.values()].sort((a, b) => b.bookings - a.bookings).slice(0, 6);
  }, [bookings]);
  const statusData = useMemo(() => {
    const counts = new Map<string, number>(); filtered.forEach(row => counts.set(row.status, (counts.get(row.status) || 0) + 1));
    return [...counts.entries()].map(([name, value]) => ({ name: labelStatus(name), value }));
  }, [filtered]);
  const periodText = from || to ? `${periodLabel(globalPeriod)} · entry dates ${from ? dateText(from) : "any start"} — ${to ? dateText(to) : "today"}` : periodLabel(globalPeriod);
  const exportFile = async (type: "excel" | "pdf", dataset: TravelRecord[] = filtered, scope = "filtered report") => {
    try {
      if (type === "excel") await downloadExcel(dataset, settings);
      else await downloadPdf(dataset, settings);
      toast.success(`${type === "excel" ? "Excel" : "PDF"} ${scope} downloaded`);
    } catch {
      toast.error(`${type === "excel" ? "Excel" : "PDF"} export could not be created`);
    }
  };
  return <div className="page-stack reports-page">
    <section className="report-intro"><div><span className="eyebrow">CLEAR NUMBERS, BETTER NEXT STEPS</span><h2>Your travel business, <em>in view.</em></h2><p>Explore bookings, collections, fare performance and what each issuing source contributes.</p></div><div className="report-export"><div className="report-export-copy"><strong>Filtered report records</strong><span>Downloads follow the selected period, dates and record type.</span></div><div className="report-export-buttons"><button className="button button-outline" onClick={() => exportFile("excel")}><FileSpreadsheet size={16} />Filtered · Excel</button><button className="button button-primary" onClick={() => exportFile("pdf")}><FileText size={16} />Filtered · PDF</button></div></div></section>
    <section className="surface filter-bar report-filters"><div className="filter-title"><Filter size={16} /><strong>Report filters</strong><span>{filtered.length} records</span></div><label className="filter-date"><span>Entry date from</span><input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label className="filter-date"><span>Entry date to</span><input type="date" value={to} onChange={event => setTo(event.target.value)} /></label><label className="filter-select"><span>Record type</span><select value={reportType} onChange={event => setReportType(event.target.value)}><option value="all">All records</option><option value="booking">Bookings</option><option value="enquiry">Enquiries</option></select></label><button className="clear-filter" onClick={() => { setFrom(""); setTo(""); setReportType("all"); }}>Reset</button></section>
    <div className="report-period"><CalendarDays size={14} /> Showing {periodText}</div>
    <section className="stats-grid report-stats"><StatCard title="Quoted value" value={formatMoney(totalQuoted, settings.currency)} hint={`${bookings.length} bookings in this view`} icon={CircleDollarSign} tone="blue" /><StatCard title="Net fares" value={formatMoney(totalNet, settings.currency)} hint="Supplier fare total" icon={Ticket} tone="peach" /><StatCard title="Profit" value={formatMoney(totalProfit, settings.currency)} hint={totalQuoted ? `${Math.round((totalProfit / totalQuoted) * 100)}% of quoted value` : "Add booking fares to calculate"} icon={TrendingUp} tone="mint" /><StatCard title="Collected" value={formatMoney(totalReceived, settings.currency)} hint={`${formatMoney(Math.max(0, totalQuoted - totalReceived), settings.currency)} outstanding`} icon={Wallet} tone="lavender" /></section>
    <section className="reports-grid"><Suspense fallback={<div className="chart-loading">Preparing report charts…</div>}><ReportCharts sourceData={sourceData} statusData={statusData} currency={settings.currency} recordCount={filtered.length} /></Suspense></section>
    <section className="surface report-table-card"><div className="section-title-row"><div><span className="eyebrow">DETAIL VIEW</span><h3>Records in this report</h3><p>The same columns follow into your Excel and PDF downloads.</p></div><div className="report-table-exports"><button className="button button-small button-outline" onClick={() => exportFile("excel")}><FileSpreadsheet size={15} />Current view · Excel</button><button className="button button-small button-outline" onClick={() => exportFile("pdf")}><FileText size={15} />Current view · PDF</button></div></div><RecordTable records={filtered.slice(0, 12)} currency={settings.currency} onEdit={() => {}} onDelete={() => {}} onConvert={() => {}} onView={() => {}} groupByMonth={false} />{filtered.length > 12 && <p className="table-note">Showing the first 12 records here. The export includes all {filtered.length} filtered records.</p>}</section>
  </div>;
}

function SettingsPage({ settings, onSave, hasRecords }: { settings: PortalSettings; onSave: (settings: PortalSettings) => Promise<void>; hasRecords: boolean }) {
  const [agencyName, setAgencyName] = useState(settings.agencyName);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [currency, setCurrency] = useState(settings.currency);
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [modules, setModules] = useState(settings.modules);
  const [fields, setFields] = useState<CustomField[]>(settings.customFields);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<CustomField["type"]>("text");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setAgencyName(settings.agencyName); setLogoUrl(settings.logoUrl); setCurrency(settings.currency); setAccentColor(settings.accentColor); setModules(settings.modules); setFields(settings.customFields); }, [settings]);
  const addField = () => {
    const label = newLabel.trim(); if (!label) return;
    if (fields.some(field => field.label.toLowerCase() === label.toLowerCase())) { toast.error("A custom field with that name already exists"); return; }
    const id = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}_${Date.now().toString(36)}`;
    setFields(current => [...current, { id, label, type: newType, enabled: true }]); setNewLabel("");
  };
  const submit = async () => {
    setSaving(true);
    try { await onSave({ agencyName, logoUrl, currency, accentColor, modules, customFields: fields }); }
    finally { setSaving(false); }
  };
  const toggle = (key: keyof PortalSettings["modules"]) => setModules(current => ({ ...current, [key]: !current[key] }));
  return <div className="page-stack settings-page">
    <section className="settings-intro"><div><span className="eyebrow">MAKE THE DESK YOURS</span><h2>Settings & <em>preferences.</em></h2><p>Shape the workspace for the way your team works.</p></div><button className="button button-primary" onClick={submit} disabled={saving}><Check size={16} />{saving ? "Saving…" : "Save settings"}</button></section>
    <section className="surface settings-card"><div className="settings-card-head"><span className="settings-icon settings-blue"><Compass size={19} /></span><div><h3>Agency profile</h3><p>Your brand details used across the employee portal.</p></div></div><div className="profile-settings-grid"><div className="brand-preview"><BrandMark settings={{ ...settings, agencyName, logoUrl }} /><div><strong>{agencyName || "AJ Tours & Travel"}</strong><span>Portal identity preview</span></div></div><label className="form-field"><span>Agency name</span><input value={agencyName} onChange={event => setAgencyName(event.target.value)} placeholder="AJ Tours & Travel" /></label><label className="form-field"><span>Logo image URL <small>HTTPS</small></span><input value={logoUrl} onChange={event => setLogoUrl(event.target.value)} placeholder="https://…" /></label><label className="form-field"><span>Report currency <small>{hasRecords ? "Locked" : "Change before adding records"}</small></span><select disabled={hasRecords} value={currency} onChange={event => setCurrency(event.target.value as PortalSettings["currency"])}><option value="GBP">GBP · British pound</option><option value="EUR">EUR · Euro</option><option value="USD">USD · US dollar</option></select>{hasRecords && <small className="field-note">Existing fares are not converted automatically, so currency is locked after the first record.</small>}</label><label className="form-field"><span>Signature colour</span><div className="color-input-row"><input type="color" value={accentColor} onChange={event => setAccentColor(event.target.value)} /><input value={accentColor} onChange={event => /^#[0-9a-fA-F]{0,6}$/.test(event.target.value) && setAccentColor(event.target.value)} /></div></label></div></section>
    <section className="surface settings-card"><div className="settings-card-head"><span className="settings-icon settings-lilac"><LayoutDashboard size={19} /></span><div><h3>Workspace features</h3><p>Choose which areas appear in your team's navigation. Settings stays available.</p></div></div><div className="module-list">{([
      ["dashboard", "Dashboard", "Overview metrics, upcoming departures and recent updates", LayoutDashboard],
      ["enquiries", "Enquiries", "Lead pipeline, follow-ups and quote tracking", UsersRound],
      ["bookings", "Bookings", "Confirmed trips, fares, PNRs and payment tracking", Plane],
      ["reports", "Reports", "Financial summaries, trends and exports", BarChart3],
    ] as const).map(([key, title, description, Icon]) => <div className="module-row" key={key}><span className="module-icon"><Icon size={17} /></span><div className="module-copy"><strong>{title}</strong><span>{description}</span></div><button className={`toggle-switch${modules[key] ? " on" : ""}`} role="switch" aria-checked={modules[key]} aria-label={`${title} feature`} onClick={() => toggle(key)}><i /></button></div>)}</div></section>
    <section className="surface settings-card custom-fields-card"><div className="settings-card-head"><span className="settings-icon settings-mint"><Ticket size={19} /></span><div><h3>Custom record fields</h3><p>Add or remove fields to capture the details your team needs.</p></div></div><div className="custom-field-list">{fields.length ? fields.map(field => <div className={`custom-field-row${field.enabled ? "" : " field-disabled"}`} key={field.id}><span className="field-grip">··</span><div className="module-copy"><strong>{field.label}</strong><span>{field.type} field · {field.enabled ? "shown on record forms" : "hidden from forms"}</span></div><button className={`toggle-switch${field.enabled ? " on" : ""}`} role="switch" aria-checked={field.enabled} aria-label={`Show ${field.label}`} onClick={() => setFields(current => current.map(item => item.id === field.id ? { ...item, enabled: !item.enabled } : item))}><i /></button><button className="icon-button remove-field" aria-label={`Remove ${field.label}`} onClick={() => setFields(current => current.filter(item => item.id !== field.id))}><Trash2 size={15} /></button></div>) : <div className="custom-empty">No custom fields yet. Start with a field your team uses every day.</div>}</div><div className="add-field-row"><label className="form-field"><span>Field name</span><input value={newLabel} onChange={event => setNewLabel(event.target.value)} placeholder="e.g. Loyalty number" onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addField(); } }} /></label><label className="form-field"><span>Field type</span><select value={newType} onChange={event => setNewType(event.target.value as CustomField["type"])}><option value="text">Text</option><option value="number">Number</option><option value="date">Date</option></select></label><button className="button button-outline add-field-button" onClick={addField} disabled={!newLabel.trim()}><Plus size={15} />Add field</button></div></section>
    <div className="settings-footnote"><Sparkles size={14} /> Settings are shared with your AJ Tours & Travel team and saved securely.</div>
  </div>;
}

function SignIn({ loading, error }: { loading: boolean; error: boolean }) {
  const [busy, setBusy] = useState(false);
  const signIn = () => { setBusy(true); try { startLogin(); } catch (cause) { console.error(cause); toast.error("Sign-in is not configured for this preview yet."); setBusy(false); } };
  return <main className="signin-screen"><div className="signin-card"><BrandMark settings={DEFAULT_PORTAL_SETTINGS} size="small" /><span className="eyebrow">AJ TOURS & TRAVEL</span><h1>Your travel desk,<br /><em>ready when you are.</em></h1><p>A clear place for every enquiry, booking and next step.</p>{loading ? <div className="signin-progress"><span className="spinner" />Checking your session…</div> : <><button className="button button-primary signin-button" onClick={signIn} disabled={busy}><UserRound size={17} />{busy ? "Opening secure sign-in…" : "Sign in to your workspace"}<ArrowRight size={15} /></button><span className="signin-note">Secure employee access powered by Manus account sign-in.</span>{error && <button className="text-action" onClick={() => window.location.reload()}>Try again</button>}</>}</div><div className="signin-foot"><span>AJ</span> EVERY TRIP, IN GOOD HANDS.</div></main>;
}

export default function Home() {
  const auth = trpc.auth.me.useQuery(undefined, { retry: false });
  const user = auth.data;
  const recordsQuery = trpc.travel.list.useQuery(undefined, { enabled: Boolean(user), staleTime: 15000 });
  const settingsQuery = trpc.travel.settings.useQuery(undefined, { enabled: Boolean(user), staleTime: 30000 });
  const settings = settingsQuery.data ?? DEFAULT_PORTAL_SETTINGS;
  const records = recordsQuery.data ?? [];
  const utils = trpc.useUtils();
  const createMutation = trpc.travel.create.useMutation();
  const updateMutation = trpc.travel.update.useMutation();
  const removeMutation = trpc.travel.remove.useMutation();
  const settingsMutation = trpc.travel.saveSettings.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();
  const [active, setActive] = useState<Section>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [initialType, setInitialType] = useState<RecordType>("enquiry");
  const [initialSourceEnquiry, setInitialSourceEnquiry] = useState<TravelRecord | null>(null);
  const [selected, setSelected] = useState<TravelRecord | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [period, setPeriod] = useState<Period>("all");

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && (active === "enquiries" || active === "bookings")) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>(".records-toolbar .search-box input")?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, [active]);

  useEffect(() => { setStatusFilter("all"); setSearch(""); }, [active]);

  const openNew = (type: RecordType) => { setSelected(null); setInitialSourceEnquiry(null); setInitialType(type); setRecordOpen(true); };
  const openEdit = (record: TravelRecord) => { setSelected(record); setInitialSourceEnquiry(null); setInitialType(record.recordType); setRecordOpen(true); };
  const openBookingFromEnquiry = (record: TravelRecord) => { setSelected(null); setInitialSourceEnquiry(record); setInitialType("booking"); setRecordOpen(true); };
  const submitRecord = async (data: TravelRecordInput) => {
    try {
      if (selected) await updateMutation.mutateAsync({ id: selected.id, data });
      else await createMutation.mutateAsync(data);
      await utils.travel.list.invalidate(); setRecordOpen(false); setSelected(null); toast.success(selected ? "Record updated" : data.recordType === "enquiry" ? "Enquiry saved" : "Booking saved");
    } catch (error) { console.error(error); toast.error("Could not save this record. Please try again."); throw error; }
  };
  const deleteRecord = async (record: TravelRecord) => {
    if (!window.confirm(`Delete the ${record.recordType} for ${record.customerName}? This cannot be undone.`)) return;
    try { await removeMutation.mutateAsync({ id: record.id }); await utils.travel.list.invalidate(); toast.success("Record deleted"); }
    catch (error) { console.error(error); toast.error("Could not delete the record."); }
  };
  const saveSettings = async (next: PortalSettings) => {
    try {
      await settingsMutation.mutateAsync(next);
      await utils.travel.settings.invalidate();
      if (active !== "settings" && !next.modules[active]) {
        setActive(next.modules.dashboard ? "dashboard" : next.modules.enquiries ? "enquiries" : next.modules.bookings ? "bookings" : next.modules.reports ? "reports" : "settings");
      }
      toast.success("Settings saved for your team");
    }
    catch (error) { console.error(error); toast.error(error instanceof Error && error.message.includes("HTTPS") ? "Logo URL must start with https://" : "Could not save settings."); throw error; }
  };
  const logout = async () => { try { await logoutMutation.mutateAsync(); await utils.auth.me.invalidate(); await utils.travel.list.reset(); } catch { toast.error("Could not sign out. Please try again."); } };
  const periodRecords = useMemo(() => records.filter(record => withinPeriod(record, period)), [records, period]);
  const sourceEnquiries = useMemo(() => {
    const alreadyLinked = new Set(records.filter(record => record.recordType === "booking" && record.sourceEnquiryId).map(record => record.sourceEnquiryId));
    return records.filter(record => record.recordType === "enquiry" && !["converted", "lost"].includes(record.status) && !alreadyLinked.has(record.id));
  }, [records]);
  const filtered = useMemo(() => {
    let result = [...periodRecords];
    if (active === "enquiries") result = result.filter(record => record.recordType === "enquiry");
    if (active === "bookings") result = result.filter(record => record.recordType === "booking");
    if (statusFilter !== "all") result = result.filter(record => record.status === statusFilter);
    const query = search.trim().toLowerCase();
    if (query) result = result.filter(record => [record.customerName, record.passengers, record.contactNo, record.email, record.systemPnr, record.airlinePnr, record.ticketNumber, record.origin, record.destination, record.issuedFrom].join(" ").toLowerCase().includes(query));
    result.sort((a, b) => sortBy === "departure" ? (a.departureDate || "9999").localeCompare(b.departureDate || "9999") : sortBy === "name" ? a.customerName.localeCompare(b.customerName) : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return result;
  }, [periodRecords, active, statusFilter, search, sortBy]);
  const exportVisibleRecords = async (type: "excel" | "pdf") => {
    try {
      if (type === "excel") await downloadExcel(filtered, settings);
      else await downloadPdf(filtered, settings);
      toast.success(`${active === "enquiries" ? "Enquiry" : "Booking"} ${type === "excel" ? "Excel" : "PDF"} downloaded`);
    } catch {
      toast.error(`${type === "excel" ? "Excel" : "PDF"} export could not be created`);
    }
  };

  if (auth.isLoading || !user) return <SignIn loading={auth.isLoading} error={auth.isError} />;
  if (recordsQuery.isLoading || settingsQuery.isLoading) return <main className="app-loading"><BrandMark settings={settings} /><span className="spinner" /><p>Preparing your travel desk…</p></main>;
  const pageTitle = active === "dashboard" ? "A clearer view of every journey" : active === "enquiries" ? "Enquiries" : active === "bookings" ? "Bookings" : active === "reports" ? "Reports" : "Settings";
  const pageSubtitle = active === "dashboard" ? "Everything your team needs, at a glance." : active === "enquiries" ? "Capture the ask, send the quote, keep the follow-up moving." : active === "bookings" ? "Confirmed travel, fare details and payments in one place." : active === "reports" ? "Numbers you can act on, neatly packaged." : "Tailor the portal to your team's day.";
  const displayName = user.name || user.email?.split("@")[0] || "Team member";
  const handleNew = () => openNew(active === "bookings" ? "booking" : "enquiry");
  return <div className="portal-root" style={{ "--accent": settings.accentColor || blue } as CSSProperties}>
    <Sidebar active={active} setActive={setActive} settings={settings} mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} onLogout={logout} userName={displayName} />
    <main className="main-shell">
      <header className="topbar"><div className="topbar-heading"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={19} /></button><div><div className="breadcrumb">{settings.agencyName} <span>/</span> {active.charAt(0).toUpperCase() + active.slice(1)}</div><h1>{pageTitle}</h1></div></div><div className="topbar-actions">{active !== "settings" && <label className="period-picker" title="Filter all portal data by record-entry date"><CalendarDays size={15} /><select aria-label="Filter all sections by period" value={period} onChange={event => setPeriod(event.target.value as Period)}><option value="all">All time</option><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option></select><ChevronDown size={13} /></label>}{active !== "reports" && active !== "settings" && <button className="button button-primary header-create" onClick={handleNew}><Plus size={16} />{active === "bookings" ? "Add booking" : "New enquiry"}</button>}<span className="topbar-date"><CalendarDays size={15} />{new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date())}</span><button className="header-avatar" title={displayName}>{initials(displayName)}</button></div></header>
      <section className="page-intro-line"><p>{pageSubtitle}</p>{active === "dashboard" && <span className="live-indicator"><i /> LIVE WORKSPACE</span>}</section>
      <div className="page-content">
        {active === "dashboard" && <Dashboard records={periodRecords} settings={settings} onCreate={() => openNew("enquiry")} onOpen={openEdit} setSection={setActive} />}
        {(active === "enquiries" || active === "bookings") && <div className="page-stack records-page"><section className="records-toolbar"><div className="records-counter"><strong>{filtered.length}</strong><span>{active === "enquiries" ? "enquiries" : "bookings"} · {periodLabel(period).toLowerCase()}</span></div><div className="records-controls"><label className="search-box"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, PNR, contact…" /><kbd>⌘ K</kbd>{search && <button aria-label="Clear search" onClick={() => setSearch("")}><X size={13} /></button>}</label><label className="select-control"><Filter size={15} /><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{(active === "enquiries" ? ["new", "contacted", "quoted", "follow-up", "converted", "lost"] : ["confirmed", "ticketed", "completed", "cancelled"]).map(status => <option value={status} key={status}>{labelStatus(status)}</option>)}</select><ChevronDown size={14} /></label><label className="select-control sort-control"><select value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="recent">Most recent</option><option value="departure">Departure date</option><option value="name">Customer name</option></select><ChevronDown size={14} /></label></div></section><section className="surface table-surface"><RecordTable records={filtered} currency={settings.currency} onEdit={openEdit} onDelete={deleteRecord} onConvert={openBookingFromEnquiry} onView={openEdit} monthlyProfitRecords={periodRecords.filter(record => record.recordType === "booking")} /></section><div className="table-footer"><span><span className="sync-dot" />Showing {periodLabel(period).toLowerCase()} records; downloads match this view.</span><div className="table-footer-actions"><button className="button button-small button-outline" onClick={() => exportVisibleRecords("excel")}><FileSpreadsheet size={14} />Download Excel</button><button className="button button-small button-primary" onClick={() => exportVisibleRecords("pdf")}><FileText size={14} />Download PDF</button></div></div></div>}
        {active === "reports" && <Reports records={periodRecords} settings={settings} globalPeriod={period} />}
        {active === "settings" && <SettingsPage settings={settings} onSave={saveSettings} hasRecords={records.length > 0} />}
      </div>
      <footer className="app-footer"><span>© {new Date().getFullYear()} {settings.agencyName}</span><span>Made for the journeys that matter <span className="footer-heart">✦</span></span></footer>
    </main>
    <RecordFormDialog open={recordOpen} initial={selected} initialType={initialType} initialSourceEnquiry={initialSourceEnquiry} sourceEnquiries={sourceEnquiries} customFields={settings.customFields} currency={settings.currency} onClose={() => { setRecordOpen(false); setSelected(null); setInitialSourceEnquiry(null); }} onSubmit={submitRecord} />
  </div>;
}
