'use client';

import { useState, useEffect } from 'react';

interface SubIndustry {
  id: number;
  name: string;
}

interface Industry {
  id: number;
  name: string;
  subIndustries: SubIndustry[];
}

interface SelectedIndustry {
  industry_id: number;
  industry_name: string;
  sub_industry_id: number;
  sub_industry_name: string;
}

interface IndustrySelectorProps {
  value: SelectedIndustry[];
  onChange: (selected: SelectedIndustry[]) => void;
  disabled?: boolean;
}

export default function IndustrySelector({ value, onChange, disabled = false }: IndustrySelectorProps) {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndustries, setExpandedIndustries] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchIndustries();
  }, []);

  const fetchIndustries = async () => {
    try {
      const response = await fetch('/api/industries');
      const data = await response.json();
      if (data.success) {
        setIndustries(data.industries || []);
      }
    } catch (error) {
      console.error('Error fetching industries:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleIndustryExpand = (industryId: number) => {
    const newExpanded = new Set(expandedIndustries);
    if (newExpanded.has(industryId)) {
      newExpanded.delete(industryId);
    } else {
      newExpanded.add(industryId);
    }
    setExpandedIndustries(newExpanded);
  };

  const isSubIndustrySelected = (industryId: number, subIndustryId: number): boolean => {
    return value.some(
      (item) => item.industry_id === industryId && item.sub_industry_id === subIndustryId
    );
  };

  const toggleSubIndustry = (industry: Industry, subIndustry: SubIndustry) => {
    if (disabled) return;

    const isSelected = isSubIndustrySelected(industry.id, subIndustry.id);

    if (isSelected) {
      // Remove
      onChange(
        value.filter(
          (item) => !(item.industry_id === industry.id && item.sub_industry_id === subIndustry.id)
        )
      );
    } else {
      // Add
      onChange([
        ...value,
        {
          industry_id: industry.id,
          industry_name: industry.name,
          sub_industry_id: subIndustry.id,
          sub_industry_name: subIndustry.name,
        },
      ]);
    }
  };

  const selectAllSubIndustries = (industry: Industry) => {
    if (disabled) return;

    const currentIndustrySelections = value.filter((item) => item.industry_id === industry.id);
    const allSelected = currentIndustrySelections.length === industry.subIndustries.length;

    if (allSelected) {
      // Deselect all from this industry
      onChange(value.filter((item) => item.industry_id !== industry.id));
    } else {
      // Select all from this industry
      const otherSelections = value.filter((item) => item.industry_id !== industry.id);
      const allFromThisIndustry = industry.subIndustries.map((si) => ({
        industry_id: industry.id,
        industry_name: industry.name,
        sub_industry_id: si.id,
        sub_industry_name: si.name,
      }));
      onChange([...otherSelections, ...allFromThisIndustry]);
    }
  };

  const getIndustrySelectionCount = (industryId: number): number => {
    return value.filter((item) => item.industry_id === industryId).length;
  };

  const removeSelection = (industryId: number, subIndustryId: number) => {
    if (disabled) return;
    onChange(
      value.filter(
        (item) => !(item.industry_id === industryId && item.sub_industry_id === subIndustryId)
      )
    );
  };

  if (loading) {
    return (
      <div className="text-slate-400 text-sm py-4">Loading industries...</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selected Industries Display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
          {value.map((item, idx) => (
            <span
              key={`selected-${item.industry_id}-${item.sub_industry_id}-${idx}`}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-premium-gold/20 text-premium-gold rounded-lg border border-premium-gold/30"
            >
              <span className="opacity-70">{item.industry_name}:</span>
              <span>{item.sub_industry_name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeSelection(item.industry_id, item.sub_industry_id)}
                  className="ml-1 text-premium-gold/70 hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Industry Selection List */}
      <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
        {industries.map((industry) => {
          const isExpanded = expandedIndustries.has(industry.id);
          const selectionCount = getIndustrySelectionCount(industry.id);
          const allSelected = selectionCount === industry.subIndustries.length;

          return (
            <div
              key={`industry-${industry.id}`}
              className="border border-white/10 rounded-lg overflow-hidden"
            >
              {/* Industry Header */}
              <div
                className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                  isExpanded ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => toggleIndustryExpand(industry.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                  <span className="text-white font-semibold">{industry.name}</span>
                  {selectionCount > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-premium-gold/20 text-premium-gold rounded-full">
                      {selectionCount} selected
                    </span>
                  )}
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectAllSubIndustries(industry);
                    }}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      allSelected
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                    }`}
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {/* Sub-Industries List */}
              {isExpanded && (
                <div className="px-3 py-2 bg-white/5 border-t border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {industry.subIndustries.map((subIndustry) => {
                      const isSelected = isSubIndustrySelected(industry.id, subIndustry.id);

                      return (
                        <label
                          key={`sub-${industry.id}-${subIndustry.id}`}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-premium-gold/20 border border-premium-gold/30'
                              : 'bg-white/5 border border-transparent hover:bg-white/10'
                          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSubIndustry(industry, subIndustry)}
                            disabled={disabled}
                            className="w-4 h-4 rounded border-white/30 bg-white/10 text-premium-gold focus:ring-premium-gold/50"
                          />
                          <span className={`text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {subIndustry.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {industries.length === 0 && (
        <div className="text-slate-400 text-sm py-4 text-center">
          No industries found. Please run the database migration script.
        </div>
      )}
    </div>
  );
}
