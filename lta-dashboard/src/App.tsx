import { useState, useEffect, useCallback, type ElementType } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  Construction,
  Car,
  Truck,
  Wind,
  AlertCircle,
  Download,
  RefreshCw,
  Filter,
  X,
  Clock,
  MapPin,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type Incident = {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
  message: string;
  recorded_at: string;
  last_seen_at: string | null;
};

function isActive(incident: Incident): boolean {
  if (!incident.last_seen_at) return false;
  return Date.now() - new Date(incident.last_seen_at).getTime() < 2 * 60 * 1000;
}

type SortField = 'recorded_at' | 'type';
type SortDir = 'asc' | 'desc';

const INCIDENT_TYPES = [
  'Accident',
  'Roadwork',
  'Vehicle breakdown',
  'Heavy Traffic',
  'Obstacle',
  'Road works',
  'Slow Traffic',
];

const TYPE_META: Record<string, { icon: ElementType; color: string; bg: string }> = {
  Accident: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  Roadwork: { icon: Construction, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  'Road works': { icon: Construction, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  'Vehicle breakdown': { icon: Car, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  'Heavy Traffic': { icon: Truck, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  'Slow Traffic': { icon: Wind, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  Obstacle: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? { icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' };
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [sortField, setSortField] = useState<SortField>('recorded_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase.from('traffic_incidents').select('*');

    if (filterType) query = query.eq('type', filterType);
    if (startDate) query = query.gte('recorded_at', `${startDate}T00:00:00+08:00`);
    if (endDate) query = query.lte('recorded_at', `${endDate}T23:59:59+08:00`);

    query = query.order(sortField, { ascending: sortDir === 'asc' });

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setIncidents(data ?? []);
      setLastFetched(new Date());
      setCurrentPage(1);
    }
    setLoading(false);
  }, [filterType, startDate, endDate, sortField, sortDir]);

  useEffect(() => {
    void fetchIncidents();
  }, []);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function clearFilters() {
    setFilterType('');
    setStartDate('');
    setEndDate('');
  }

  function downloadExcel() {
    const worksheetData = incidents.map((inc) => ({
      'Incident ID': inc.id,
      Status: isActive(inc) ? 'Active' : 'Resolved',
      Type: inc.type,
      Message: inc.message,
      Latitude: inc.latitude,
      Longitude: inc.longitude,
      'Recorded At (SGT)': new Date(inc.recorded_at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }),
      'Last Seen At (SGT)': inc.last_seen_at ? new Date(inc.last_seen_at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' }) : '—',
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Traffic Incidents');
    XLSX.writeFile(workbook, `LTA_Incidents_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  const typeCounts = incidents.reduce<Record<string, number>>((acc, inc) => {
    acc[inc.type] = (acc[inc.type] ?? 0) + 1;
    return acc;
  }, {});

  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  const totalPages = Math.ceil(incidents.length / PAGE_SIZE);
  const paginated = incidents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasActiveFilters = filterType || startDate || endDate;

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-slate-600" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-400" />
      : <ChevronDown className="w-3 h-3 text-blue-400" />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">LTA Traffic Incidents</h1>
              <p className="text-slate-400 text-xs">Singapore Datamall Live Feed</p>
            </div>
          </div>
          {lastFetched && (
            <div className="flex items-center gap-1.5 text-slate-500 text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>Updated {lastFetched.toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore' })}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Incidents" value={incidents.length} />
          <StatCard
            label="Most Common"
            value={topType ? topType[0] : '—'}
            sub={topType ? `${topType[1]} records` : undefined}
          />
          <StatCard
            label="Earliest"
            value={
              incidents.length
                ? new Date(
                    Math.min(...incidents.map((i) => new Date(i.recorded_at).getTime()))
                  ).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore' })
                : '—'
            }
          />
          <StatCard
            label="Latest"
            value={
              incidents.length
                ? new Date(
                    Math.max(...incidents.map((i) => new Date(i.recorded_at).getTime()))
                  ).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore' })
                : '—'
            }
          />
        </div>

        {/* Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </div>

            <div className="flex-1 min-w-[140px]">
              <label className="block text-slate-500 text-xs mb-1">Incident Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {INCIDENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <label className="block text-slate-500 text-xs mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex-1 min-w-[140px]">
              <label className="block text-slate-500 text-xs mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={fetchIncidents}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Apply'}
              </button>

              {hasActiveFilters && (
                <button
                  onClick={() => { clearFilters(); }}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg text-sm border border-slate-600 hover:border-slate-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}

              <button
                onClick={downloadExcel}
                disabled={incidents.length === 0}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download .XLSX
              </button>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                  <th
                    className="text-left px-4 py-3 cursor-pointer hover:text-slate-200 select-none"
                    onClick={() => toggleSort('type')}
                  >
                    <span className="flex items-center gap-1">
                      Type <SortIcon field="type" />
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3">Message</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Coordinates
                    </span>
                  </th>
                  <th
                    className="text-left px-4 py-3 cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                    onClick={() => toggleSort('recorded_at')}
                  >
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Recorded At <SortIcon field="recorded_at" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loading && (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Fetching incidents...
                    </td>
                  </tr>
                )}
                {!loading && paginated.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-slate-500">
                      No incidents found. Try adjusting your filters.
                    </td>
                  </tr>
                )}
                {!loading &&
                  paginated.map((inc) => {
                    const meta = getTypeMeta(inc.type);
                    const Icon = meta.icon;
                    return (
                      <tr key={inc.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${meta.color} ${meta.bg}`}>
                            <Icon className="w-3 h-3" />
                            {inc.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isActive(inc) ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border text-slate-400 bg-slate-500/10 border-slate-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                              Resolved
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-300 max-w-sm">
                          <p className="line-clamp-2 leading-snug">{inc.message}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap font-mono">
                          {inc.latitude.toFixed(5)}, {inc.longitude.toFixed(5)}
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                          {new Date(inc.recorded_at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-slate-700 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, incidents.length)} of {incidents.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded border border-slate-600 disabled:opacity-40 hover:bg-slate-700 transition-colors"
                >
                  Prev
                </button>
                <span className="px-3">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded border border-slate-600 disabled:opacity-40 hover:bg-slate-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
