'use client';

interface FilterBarProps {
  searchQuery: string;
  filterStage: string;
  filterTag: string;
  filterEmployee: string;
  onSearchChange: (value: string) => void;
  onStageChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onEmployeeChange: (value: string) => void;
  onClearFilters: () => void;
}

export default function FilterBar({
  searchQuery,
  filterStage,
  filterTag,
  filterEmployee,
  onSearchChange,
  onStageChange,
  onTagChange,
  onEmployeeChange,
  onClearFilters
}: FilterBarProps) {
  // Company Stage options
  const companyStageOptions = [
    'Enterprise',
    'SMB',
    'Pan India',
    'APAC',
    'Middle East & Africa',
    'Europe',
    'North America',
    'LATAM_SouthAmerica'
  ];

  // Company Tag options
  const companyTagOptions = [
    'New',
    'Prospect',
    'Customer',
    'Onboard',
    'Lapsed',
    'Needs Attention',
    'Retention',
    'Renewal',
    'Upselling'
  ];

  // Assigned Employee options (only employees, not admin)
  const assignedEmployeeOptions = ['Sales_Shweta', 'Sales_Saumya', 'Sales_Nagender', 'Sales_Abhijeet'];

  const hasActiveFilters = searchQuery || filterStage || filterTag || filterEmployee;

  return (
    <div className="glassmorphic-premium rounded-3xl p-6 mb-6 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-white drop-shadow-lg">Search & Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search by Company Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">
            Search by Company Name
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input-premium w-full h-[52px] focus:outline-none"
            style={{ padding: '12px', fontSize: '15px' }}
            placeholder="Enter company name..."
          />
        </div>

        {/* Filter by Stage */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">
            Filter by Stage
          </label>
          <select
            value={filterStage}
            onChange={(e) => onStageChange(e.target.value)}
            className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
          >
            <option value="">All Stages</option>
            {companyStageOptions.map((stage) => (
              <option key={stage} value={stage}>
                {stage.replace('_', '/')}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Tag */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">
            Filter by Tag
          </label>
          <select
            value={filterTag}
            onChange={(e) => onTagChange(e.target.value)}
            className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
          >
            <option value="">All Tags</option>
            {companyTagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Assigned Employee */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">
            Filter by Employee
          </label>
          <select
            value={filterEmployee}
            onChange={(e) => onEmployeeChange(e.target.value)}
            className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
          >
            <option value="">All Employees</option>
            {assignedEmployeeOptions.map((employee) => (
              <option key={employee} value={employee}>
                {employee}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

