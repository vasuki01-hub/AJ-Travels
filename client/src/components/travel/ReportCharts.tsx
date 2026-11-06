import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, MapPin } from "lucide-react";

const palette = ["#1677e8", "#22b8a5", "#ffa649", "#8a72ed", "#ed7184", "#59b9d7"];
function formatMoney(amount: number, currency: string) {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return `£${amount.toFixed(2)}`; }
}

export default function ReportCharts({
  sourceData,
  statusData,
  currency,
  recordCount,
}: {
  sourceData: { source: string; bookings: number; profit: number; quoted: number }[];
  statusData: { name: string; value: number }[];
  currency: string;
  recordCount: number;
}) {
  return <>
    <article className="surface report-chart-card">
      <div className="section-title-row"><div><span className="eyebrow">ISSUING SOURCE</span><h3>Where bookings come from</h3><p>Booking volume and profit by supplier or platform.</p></div><span className="chart-badge"><MapPin size={13} />{sourceData.length} sources</span></div>
      {sourceData.length ? <div className="report-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={sourceData} layout="vertical" margin={{ top: 4, right: 18, left: 8, bottom: 0 }}><CartesianGrid stroke="#edf1f6" horizontal={false} /><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#8a97a9", fontSize: 13 }} /><YAxis type="category" dataKey="source" axisLine={false} tickLine={false} tick={{ fill: "#65748a", fontSize: 13 }} width={90} /><Tooltip formatter={(value: number | string, name: string) => name === "profit" || name === "quoted" ? formatMoney(Number(value), currency) : value} contentStyle={{ borderRadius: 12, border: "1px solid #e9edf3", fontSize: 14 }} /><Bar dataKey="profit" name="Profit" fill="#22b8a5" radius={[0, 5, 5, 0]} barSize={14} /><Bar dataKey="quoted" name="Quoted" fill="#1677e8" radius={[0, 5, 5, 0]} barSize={14} /><Legend verticalAlign="top" align="right" height={27} iconType="circle" wrapperStyle={{ fontSize: 13, color: "#718096" }} /></BarChart></ResponsiveContainer></div> : <div className="empty-chart"><span className="empty-illustration"><MapPin size={19} /></span><strong>Source trends start here</strong><p>Add an issuing source and booking fares to compare performance.</p></div>}
    </article>
    <article className="surface report-chart-card status-chart-card">
      <div className="section-title-row"><div><span className="eyebrow">RECORD MIX</span><h3>Pipeline at a glance</h3><p>Every enquiry and booking in this view.</p></div></div>
      {statusData.length ? <div className="status-chart-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={66} outerRadius={90} paddingAngle={4} stroke="none">{statusData.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}</Pie><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e9edf3", fontSize: 14 }} /><Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 13, color: "#718096" }} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{recordCount}</strong><span>records</span></div></div> : <div className="empty-chart"><span className="empty-illustration"><BarChart3 size={19} /></span><strong>Nothing to chart yet</strong><p>Your status mix appears after the first record.</p></div>}
    </article>
  </>;
}
