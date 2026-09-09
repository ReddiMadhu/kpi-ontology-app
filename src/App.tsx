import { useState } from 'react';

interface KPI {
  id: string;
  name: string;
  description: string;
  category: string;
  formula?: string;
}

const sampleKPIs: KPI[] = [
  {
    id: '1',
    name: 'Revenue Growth',
    description: 'Year-over-year revenue growth percentage',
    category: 'Financial',
    formula: '(Revenue_Current - Revenue_Prior) / Revenue_Prior * 100'
  },
  {
    id: '2',
    name: 'Customer Satisfaction',
    description: 'Customer satisfaction score',
    category: 'Customer',
    formula: 'Average(NPS_Scores)'
  },
  {
    id: '3',
    name: 'Employee Retention',
    description: 'Percentage of employees retained',
    category: 'HR',
    formula: '(Active_Employees - New_Attrition) / Active_Employees * 100'
  },
  {
    id: '4',
    name: 'Operational Efficiency',
    description: 'Cost per unit of output',
    category: 'Operations',
    formula: 'Total_Cost / Units_Produced'
  }
];

function App() {
  const [selectedKPI, setSelectedKPI] = useState<KPI | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const categories = ['All', ...new Set(sampleKPIs.map(kpi => kpi.category))];
  
  const filteredKPIs = sampleKPIs.filter(kpi => {
    const matchesSearch = kpi.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || kpi.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-white mb-2">KPI Ontology Bank</h1>
          <p className="text-slate-400">Browse and manage your canonical KPIs</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-white mb-4">Filters</h2>
              
              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search KPIs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Category</label>
                <div className="space-y-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setFilterCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        filterCategory === category
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {filteredKPIs.map(kpi => (
                <div
                  key={kpi.id}
                  onClick={() => setSelectedKPI(kpi)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedKPI?.id === kpi.id
                      ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">{kpi.name}</h3>
                    <span className="px-2 py-1 text-xs font-medium bg-slate-700 text-slate-200 rounded">
                      {kpi.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">{kpi.description}</p>
                </div>
              ))}
            </div>

            {/* KPI Detail View */}
            {selectedKPI && (
              <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{selectedKPI.name}</h2>
                    <span className="inline-block px-3 py-1 text-sm font-medium bg-blue-600/20 text-blue-300 rounded-lg border border-blue-500/50">
                      {selectedKPI.category}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedKPI(null)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Description</h3>
                    <p className="text-slate-400">{selectedKPI.description}</p>
                  </div>

                  {/* Formula */}
                  {selectedKPI.formula && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-2">Formula</h3>
                      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                        <code className="text-sm text-blue-300 font-mono">{selectedKPI.formula}</code>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-slate-700">
                    <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                      Use This KPI
                    </button>
                    <button className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors">
                      View Lineage
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* No Results */}
            {filteredKPIs.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-400 text-lg">No KPIs found matching your criteria</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
