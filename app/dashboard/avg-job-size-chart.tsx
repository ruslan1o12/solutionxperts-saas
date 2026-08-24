"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AverageJobSizeChart({ data }: { data: { month: string; avg: number }[] }) {
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="jobSizeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2B4C6F" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2B4C6F" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#DCE5DA" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6B6862" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#6B6862" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            formatter={(v) => [`$${Number(v).toFixed(0)}`, "Avg job size"]}
            contentStyle={{ borderRadius: 10, border: "1px solid #DCE5DA", fontSize: 12 }}
          />
          <Area type="monotone" dataKey="avg" stroke="#2B4C6F" strokeWidth={2} fill="url(#jobSizeFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
