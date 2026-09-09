import { useEffect, useState, useMemo, useCallback } from 'react';
import { BookOpen, Search, Loader2, AlertCircle, Filter, Plus, Save, Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';
import { API_BASE_URL } from '@/config';

interface CanonicalKPI {
  kpi_id: string;
  name: string;
  definition: string;
  domain: string;
  sector: string;
  subdomain: string;
  line_of_business?: string;
  aliases: string[];
  aggregation_type: string;
  status: 'active' | 'inactive' | 'stale';
  is_active_sector?: boolean;
  created_by: string;
  created_at: string;
  embedding_model?: string;
  kpi_type?: 'built-in' | 'custom';
}

interface Taxonomy {
  sectors: string[];
  active_sectors: string[];
  subdomains_by_sector: Record<string, string[]>;
  subdomain_display_labels?: Record<string, string>;
  sector_display_labels?: Record<string, string>;
}

function norm(s: string | null | undefined): string {
  return (s || '').trim().toLowerCase();
}

function capitalizeFirst(s: string | null | undefined): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const BUILTIN_CREATORS = new Set(['system', 'seed', 'excel_seed']);

function isBuiltIn(kpi: CanonicalKPI): boolean {
  return BUILTIN_CREATORS.has((kpi.created_by || '').trim().toLowerCase());
}

const Badge = ({ children, variant = 'default', className = '' }: { children: React.ReactNode; variant?: string; className?: string }) => (
  <span className={`px-2 py-1 text-xs font-medium rounded-full ${variant === 'outline' ? 'border border-slate-600 bg-slate-800/50 text-slate-300' : 'bg-slate-700 text-slate-200'} ${className}`}>
    {children}
  </span>
);

const Button = ({ children, onClick, disabled = false, className = '', variant = 'default', size = 'md', type = 'button' }: any) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
      variant === 'outline'
        ? 'border border-slate-600 text-slate-200 hover:bg-slate-700'
        : 'bg-blue-600 hover:bg-blue-700 text-white'
    } ${size === 'sm' ? 'px-3 py-1.5 text-sm' : ''} ${className}`}
  >
    {children}
  </button>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-lg border border-slate-700 bg-slate-800/50 ${className}`}>{children}</div>
);

const CardHeader = ({ children }: { children: React.ReactNode }) => <div className="border-b border-slate-700 p-6 pb-4">{children}</div>;
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h2 className={`text-lg font-bold text-white ${className}`}>{children}</h2>
);
const CardContent = ({ children }: { children: React.ReactNode }) => <div className="p-6">{children}</div>;

export function KPIOntologyBankView({ onNavigate }: { onNavigate?: (view: any) => void }) {
  const [kpis, setKpis] = useState<CanonicalKPI[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [subdomainFilter, setSubdomainFilter] = useState('all');
  const [statusTypeFilter, setStatusTypeFilter] = useState('all');
  const [selectedKpi, setSelectedKpi] = useState<CanonicalKPI | null>(null);
  const [togglingKpiId, setTogglingKpiId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New KPI Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    definition: '',
    description: '',
    formula: '',
    sector: 'insurance',
    subdomain: 'service_and_operations',
    lob: '',
    aliases: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const labelSubdomain = useCallback(
    (key: string | null | undefined) => {
      if (!key) return '—';
      return taxonomy?.subdomain_display_labels?.[key] ?? key;
    },
    [taxonomy],
  );

  const labelSector = useCallback(
    (key: string | null | undefined) => {
      if (!key) return '—';
      return taxonomy?.sector_display_labels?.[key] ?? key;
    },
    [taxonomy],
  );

  const matchesSubdomain = useCallback(
    (kpiSub: string | null | undefined, filter: string) => {
      if (filter === 'all') return true;
      const raw = norm(kpiSub);
      if (!raw) return false;
      const f = norm(filter);
      if (raw === f) return true;
      const filterLabel = norm(labelSubdomain(filter));
      const kpiLabel = norm(labelSubdomain(kpiSub));
      if (raw === filterLabel || kpiLabel === f || kpiLabel === filterLabel) return true;
      const compact = (s: string) => s.replace(/[&_\s-]+/g, '');
      return compact(raw) === compact(f) || compact(raw) === compact(filterLabel);
    },
    [labelSubdomain],
  );

  const matchesSector = useCallback((kpiSector: string | null | undefined, filter: string) => {
    if (filter === 'all') return true;
    return norm(kpiSector) === norm(filter);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiRes, taxRes] = await Promise.all([
        fetch(`${API_BASE_URL}/ontology/kpis?limit=5000&status=all`),
        fetch(`${API_BASE_URL}/ontology/taxonomy`),
      ]);
      
      if (!kpiRes.ok) throw new Error('Failed to fetch KPIs');
      if (!taxRes.ok) throw new Error('Failed to fetch taxonomy');
      
      const kpiData = await kpiRes.json();
      const taxData = await taxRes.json();
      
      setKpis(Array.isArray(kpiData) ? kpiData : []);
      setTaxonomy(taxData);
    } catch (err: any) {
      setError(err.message || 'Failed to load KPI ontology');
      setKpis([]);
      setTaxonomy(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleKpiStatus = useCallback(async (kpi: CanonicalKPI, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = kpi.status === 'active' ? 'inactive' : 'active';
    setTogglingKpiId(kpi.kpi_id);
    try {
      const res = await fetch(`${API_BASE_URL}/ontology/kpis/${kpi.kpi_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setKpis((prev) =>
        prev.map((k) => (k.kpi_id === kpi.kpi_id ? { ...k, status: newStatus } : k)),
      );
    } catch (err) {
      alert('Failed to update KPI status.');
    } finally {
      setTogglingKpiId(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sectors = useMemo(() => {
    const fromTax = taxonomy?.sectors ?? [];
    const fromKpis = kpis.map((k) => k.sector).filter(Boolean);
    return ['all', ...Array.from(new Set([...fromTax, ...fromKpis]))];
  }, [kpis, taxonomy]);

  const subdomains = useMemo(() => {
    if (sectorFilter === 'all') {
      const active = taxonomy?.active_sectors ?? ['insurance'];
      const fromActive = active.flatMap((s) => taxonomy?.subdomains_by_sector?.[s] ?? []);
      const fromTax = Object.values(taxonomy?.subdomains_by_sector ?? {}).flat();
      const fromKpis = kpis.map((k) => k.subdomain).filter(Boolean);
      return ['all', ...Array.from(new Set([...fromActive, ...fromTax, ...fromKpis]))];
    }
    const fromTax = taxonomy?.subdomains_by_sector?.[sectorFilter] ?? [];
    const fromKpis = kpis
      .filter((k) => matchesSector(k.sector, sectorFilter))
      .map((k) => k.subdomain)
      .filter(Boolean);
    return ['all', ...Array.from(new Set([...fromTax, ...fromKpis]))];
  }, [kpis, taxonomy, sectorFilter, matchesSector]);

  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = { all: kpis.length };
    for (const s of sectors) {
      if (s === 'all') continue;
      counts[s] = kpis.filter((k) => matchesSector(k.sector, s)).length;
    }
    return counts;
  }, [kpis, sectors, matchesSector]);

  const subdomainCounts = useMemo(() => {
    const pool = sectorFilter === 'all'
      ? kpis
      : kpis.filter((k) => matchesSector(k.sector, sectorFilter));
    const counts: Record<string, number> = { all: pool.length };
    for (const d of subdomains) {
      if (d === 'all') continue;
      counts[d] = pool.filter((k) => matchesSubdomain(k.subdomain, d)).length;
    }
    return counts;
  }, [kpis, subdomains, sectorFilter, matchesSector, matchesSubdomain]);

  const filteredKpis = useMemo(() => {
    return kpis.filter((k) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        k.name.toLowerCase().includes(q) ||
        (k.definition || '').toLowerCase().includes(q) ||
        k.aliases?.some((a) => a.toLowerCase().includes(q)) ||
        labelSubdomain(k.subdomain).toLowerCase().includes(q) ||
        (k.domain || '').toLowerCase().includes(q);
      const matchSector = matchesSector(k.sector, sectorFilter);
      const matchSubdomain = matchesSubdomain(k.subdomain, subdomainFilter);

      let matchStatusType = true;
      if (statusTypeFilter === 'active') matchStatusType = k.status === 'active';
      else if (statusTypeFilter === 'inactive') matchStatusType = k.status === 'inactive';
      else if (statusTypeFilter === 'built-in') matchStatusType = isBuiltIn(k);
      else if (statusTypeFilter === 'custom') matchStatusType = !isBuiltIn(k);

      return matchSearch && matchSector && matchSubdomain && matchStatusType;
    });
  }, [kpis, search, sectorFilter, subdomainFilter, statusTypeFilter, labelSubdomain, matchesSector, matchesSubdomain]);

  const isSectorInactive = (sector: string) =>
    taxonomy?.active_sectors ? !taxonomy.active_sectors.includes(sector) : false;

  const filtersActive = sectorFilter !== 'all' || subdomainFilter !== 'all' || statusTypeFilter !== 'all' || Boolean(search.trim());

  const handleCreateKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.definition.trim()) {
      alert('Please fill out Name and Definition.');
      return;
    }
    setSubmitting(true);
    try {
      const aliasesList = createForm.aliases
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`${API_BASE_URL}/ontology/kpis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          definition: `${createForm.definition.trim()} ${createForm.description ? `(Description: ${createForm.description.trim()})` : ''} ${createForm.formula ? `(Formula: ${createForm.formula.trim()})` : ''}`,
          sector: createForm.sector,
          subdomain: createForm.subdomain,
          line_of_business: createForm.lob.trim() || undefined,
          aliases: aliasesList,
          created_by: localStorage.getItem('governance_analyst_id') || 'analyst_lead',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to create KPI');
      }

      setCreateForm({
        name: '',
        definition: '',
        description: '',
        formula: '',
        sector: 'insurance',
        subdomain: 'service_and_operations',
        lob: '',
        aliases: '',
      });
      setShowCreateForm(false);
      await load();
    } catch (err: any) {
      alert(err.message || 'An error occurred while creating the KPI.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-white">
            <BookOpen className="w-8 h-8 text-blue-400" />
            KPI Ontology Bank
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Browse corporate canonical KPIs, taxonomy classifications, and add new canonical definitions
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1.5" />
          Create New KPI
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 inline mr-2" />
          {error}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-blue-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Define New Canonical KPI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateKpi} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  required
                  className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white text-sm"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="KPI Name *"
                />
                <input
                  className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white text-sm"
                  value={createForm.lob}
                  onChange={(e) => setCreateForm({ ...createForm, lob: e.target.value })}
                  placeholder="Line of Business"
                />
                <select
                  className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white text-sm"
                  value={createForm.sector}
                  onChange={(e) => setCreateForm({ ...createForm, sector: e.target.value })}
                >
                  <option value="insurance">Insurance</option>
                  <option value="banking">Banking</option>
                </select>
                <select
                  className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white text-sm"
                  value={createForm.subdomain}
                  onChange={(e) => setCreateForm({ ...createForm, subdomain: e.target.value })}
                >
                  <option value="service_and_operations">Service & Operations</option>
                  <option value="underwriting">Underwriting</option>
                </select>
                <textarea
                  required
                  className="col-span-1 md:col-span-2 px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white text-sm min-h-[80px]"
                  value={createForm.definition}
                  onChange={(e) => setCreateForm({ ...createForm, definition: e.target.value })}
                  placeholder="Definition *"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" type="button" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Save to Ontology
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white text-sm"
            placeholder="Search corporate KPIs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white text-sm"
          value={sectorFilter}
          onChange={(e) => {
            setSectorFilter(e.target.value);
            setSubdomainFilter('all');
          }}
        >
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? `All Sectors (${sectorCounts.all ?? 0})` : `${labelSector(s)} (${sectorCounts[s] ?? 0})`}
            </option>
          ))}
        </select>
        <select
          className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white text-sm"
          value={subdomainFilter}
          onChange={(e) => setSubdomainFilter(e.target.value)}
        >
          {subdomains.map((d) => (
            <option key={d} value={d}>
              {d === 'all' ? `All subdomains (${subdomainCounts.all ?? 0})` : `${labelSubdomain(d)} (${subdomainCounts[d] ?? 0})`}
            </option>
          ))}
        </select>
        {filtersActive && (
          <button
            className="px-3 py-2 text-xs rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-800"
            onClick={() => {
              setSectorFilter('all');
              setSubdomainFilter('all');
              setStatusTypeFilter('all');
              setSearch('');
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* KPI List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading KPI ontology…
        </div>
      ) : filteredKpis.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No KPIs found
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredKpis.map((kpi) => (
            <div
              key={kpi.kpi_id}
              onClick={() => setSelectedKpi(kpi)}
              className="p-4 rounded-lg border border-slate-700 bg-slate-800/50 hover:border-blue-500/30 cursor-pointer transition-all text-left"
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-semibold text-white">{kpi.name}</span>
                <Badge variant="outline">
                  {labelSector(kpi.sector)} / {labelSubdomain(kpi.subdomain)}
                </Badge>
                {isBuiltIn(kpi) ? (
                  <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/20">Built-in</Badge>
                ) : (
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Custom</Badge>
                )}
                <button
                  className="ml-auto text-xs font-medium transition-colors"
                  onClick={(e) => toggleKpiStatus(kpi, e)}
                  disabled={togglingKpiId === kpi.kpi_id}
                >
                  {togglingKpiId === kpi.kpi_id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : kpi.status === 'active' ? (
                    <ToggleRight className="w-5 h-5 text-green-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-600" />
                  )}
                </button>
              </div>
              <p className="text-sm text-slate-400 line-clamp-2">{kpi.definition}</p>
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedKpi && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedKpi(null)} />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-700 shadow-xl p-6 overflow-y-auto">
            <button
              onClick={() => setSelectedKpi(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
            >
              ×
            </button>
            <h3 className="text-lg font-bold text-white mb-4">{selectedKpi.name}</h3>
            <div className="space-y-3 text-sm text-slate-300">
              <div><span className="text-slate-500">Sector:</span> {labelSector(selectedKpi.sector)}</div>
              <div><span className="text-slate-500">Subdomain:</span> {labelSubdomain(selectedKpi.subdomain)}</div>
              <div><span className="text-slate-500">Definition:</span> {selectedKpi.definition}</div>
              {selectedKpi.aliases?.length > 0 && (
                <div><span className="text-slate-500">Aliases:</span> {selectedKpi.aliases.join(', ')}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
