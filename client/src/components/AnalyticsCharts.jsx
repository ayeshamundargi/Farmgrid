import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { BarChart3, PieChart as PieIcon, Award } from 'lucide-react';

const STATUS_COLORS = {
  Available: '#16a34a',
  Booked: '#0284c7',
  Maintenance: '#e11d48',
  Scheduled: '#16a34a',
  Waitlist: '#f59e0b',
  Conflict: '#e11d48',
  Pending: '#64748b'
};

const PIE_COLORS = ['#16a34a', '#0284c7', '#f59e0b', '#e11d48', '#8b5cf6', '#06b6d4'];

export default function AnalyticsCharts({ charts = {} }) {
  const {
    requestsByType = [],
    priorityDistribution = [],
    resourceStatuses = [],
    requestStatuses = []
  } = charts;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Resource Allocation Status */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PieIcon className="w-4 h-4 text-agri-600" />
            <h4 className="text-sm font-bold text-slate-800">Resource Fleet Status</h4>
          </div>
          <p className="text-xs text-slate-500 mb-4">Current availability & maintenance split</p>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={resourceStatuses}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={4}
              >
                {resourceStatuses.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Priority Score Distribution */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-agri-600" />
            <h4 className="text-sm font-bold text-slate-800">Priority Distribution</h4>
          </div>
          <p className="text-xs text-slate-500 mb-4">Request count grouped by 0-100 score tiers</p>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityDistribution}>
              <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="count" fill="#2b7c46" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Requests By Resource Type */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-agri-600" />
            <h4 className="text-sm font-bold text-slate-800">Demand by Equipment</h4>
          </div>
          <p className="text-xs text-slate-500 mb-4">Farmer requests per equipment classification</p>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={requestsByType.slice(0, 6)} layout="vertical">
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis dataKey="type" type="category" width={80} tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="count" fill="#0284c7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
