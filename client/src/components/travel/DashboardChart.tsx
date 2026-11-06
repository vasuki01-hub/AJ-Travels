import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function money(value: number, currency: string) {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value); }
  catch { return `£${Math.round(value)}`; }
}

function symbol(currency: string) {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).formatToParts(0).find(part => part.type === "currency")?.value ?? "£"; }
  catch { return "£"; }
}

export default function DashboardChart({ data, currency }: { data: { month: string; quoted: number; profit: number }[]; currency: string }) {
  const sign = symbol(currency);
  return <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
      <defs>
        <linearGradient id="quotedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1677e8" stopOpacity={0.22} /><stop offset="100%" stopColor="#1677e8" stopOpacity={0.01} /></linearGradient>
        <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22b8a5" stopOpacity={0.15} /><stop offset="100%" stopColor="#22b8a5" stopOpacity={0.01} /></linearGradient>
      </defs>
      <CartesianGrid stroke="#edf1f6" vertical={false} />
      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8995a6", fontSize: 13 }} dy={8} />
      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8995a6", fontSize: 13 }} tickFormatter={value => value >= 1000 ? `${sign}${Math.round(value / 1000)}k` : `${sign}${value}`} />
      <Tooltip formatter={(value: number | string) => money(Number(value), currency)} contentStyle={{ border: "1px solid #edf0f4", borderRadius: 12, boxShadow: "0 12px 30px #1a315010", fontSize: 14 }} />
      <Area type="monotone" dataKey="quoted" name="Quoted value" stroke="#1677e8" strokeWidth={2.4} fill="url(#quotedFill)" />
      <Area type="monotone" dataKey="profit" name="Profit" stroke="#22b8a5" strokeWidth={2.3} fill="url(#profitFill)" />
    </AreaChart>
  </ResponsiveContainer>;
}
