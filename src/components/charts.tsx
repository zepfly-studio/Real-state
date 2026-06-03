"use client";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const GOLD = "#d9a441";
const GOLD_B = "#f0c14b";

/** Reads themed chart colors from CSS vars and updates on theme change. */
function useChartTheme() {
  const [t, setT] = useState({ grid: "#e2e7f0", axis: "#93a0b5", tooltipBg: "#ffffff", txt: "#1b2433" });
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      setT({
        grid: cs.getPropertyValue("--chart-grid").trim() || "#e2e7f0",
        axis: cs.getPropertyValue("--chart-axis").trim() || "#93a0b5",
        tooltipBg: cs.getPropertyValue("--chart-tooltip-bg").trim() || "#ffffff",
        txt: cs.getPropertyValue("--txt").trim() || "#1b2433",
      });
    };
    read();
    window.addEventListener("reos-theme-change", read);
    return () => window.removeEventListener("reos-theme-change", read);
  }, []);
  return t;
}

function tip(t: ReturnType<typeof useChartTheme>) {
  return { background: t.tooltipBg, border: `1px solid ${t.grid}`, borderRadius: 10, fontSize: 12, color: t.txt };
}

export function RevenueBar({ data }: { data: { month: string; value: number }[] }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="goldBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD_B} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
        <XAxis dataKey="month" stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 10000000).toFixed(1)}Cr`} />
        <Tooltip contentStyle={tip(t)} cursor={{ fill: "rgba(217,164,65,.08)" }} formatter={(v: number) => [`₹${(v / 10000000).toFixed(2)}Cr`, "Revenue"]} />
        <Bar dataKey="value" fill="url(#goldBar)" radius={[6, 6, 0, 0]} maxBarSize={42} animationDuration={900} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({ data, keys }: { data: any[]; keys: { key: string; color: string }[] }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
        <XAxis dataKey="month" stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tip(t)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {keys.map((k) => (
          <Line key={k.key} type="monotone" dataKey={k.key} stroke={k.color} strokeWidth={2.5} dot={false} animationDuration={900} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AreaTrend({ data }: { data: { label: string; value: number }[] }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.4} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
        <XAxis dataKey="label" stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={t.axis} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tip(t)} />
        <Area type="monotone" dataKey="value" stroke={GOLD} strokeWidth={2.5} fill="url(#goldArea)" animationDuration={900} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ["#d9a441", "#5b8def", "#3ec78d", "#9b7ef0", "#f0556a", "#f0c14b"];
export function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} animationDuration={900}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip contentStyle={tip(t)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
