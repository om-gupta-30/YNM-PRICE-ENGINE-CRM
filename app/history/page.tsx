'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Toast from '@/components/ui/Toast';
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal';
import { supabaseBrowser } from '@/lib/utils/supabaseClient';
import { Quote } from '@/lib/constants/types';
import dynamic from 'next/dynamic';
import QuotationDetailsModal from '@/components/modals/QuotationDetailsModal';
import StateCitySelect from '@/components/forms/StateCitySelect';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

type SectionTab = 'mbcb' | 'signages' | 'paint';

// Type for tracking selections with source table
interface QuoteSelection {
  id: number;
  table: SectionTab;
  final_total_cost: number | null;
  section: string;
  state_id: number | null;
  city_id: number | null;
  sub_account_id: number | null;
  date: string;
  raw_payload: any;
}

export default function HistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [department, setDepartment] = useState<string>('Sales');
  const [highlightedQuoteId, setHighlightedQuoteId] = useState<number | null>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null);
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<SectionTab>('mbcb');
  
  // Filter states
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>('');
  const [filterSubAccountName, setFilterSubAccountName] = useState<string>('');
  const [filterStateId, setFilterStateId] = useState<number | null>(null);
  const [filterStateName, setFilterStateName] = useState<string>('');
  const [filterCityId, setFilterCityId] = useState<number | null>(null);
  const [filterCityName, setFilterCityName] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  
  // Sort states
  const [sortColumn, setSortColumn] = useState<'date' | 'final_total_cost' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Modal state
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Status update state
  
  // Merge state - tracks selections by unique key (table:id) to avoid cross-table conflicts
  const [selectedQuotesForMerge, setSelectedQuotesForMerge] = useState<QuoteSelection[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  
  // Check if a quote is selected (by table and id, not just id)
  const isQuoteSelected = (id: number, table: SectionTab) => {
    return selectedQuotesForMerge.some(s => s.id === id && s.table === table);
  };
  
  // Helper function to determine if a quote is MBCB
  const isMBCBQuote = (quote: Quote): boolean => {
    const section = quote.section.toLowerCase();
    return section.includes('w-beam') || section.includes('thrie') || section.includes('double');
  };
  
  // Helper function to determine if a quote is Signages
  const isSignagesQuote = (quote: Quote): boolean => {
    const section = quote.section.toLowerCase();
    return section.includes('signages') || section.includes('reflective');
  };
  
  // Get quotes for active tab
  const quotesForActiveTab = useMemo(() => {
    if (activeTab === 'mbcb') {
      return quotes.filter(isMBCBQuote);
    } else if (activeTab === 'signages') {
      return quotes.filter(isSignagesQuote);
    } else {
      return []; // Paint - coming soon
    }
  }, [quotes, activeTab]);
  
  // Unique filter values for active tab
  const uniqueValues = useMemo(() => {
    return {
      createdBy: Array.from(new Set(quotesForActiveTab.map(q => q.created_by).filter((v): v is string => Boolean(v)))).sort(),
      subAccountNames: Array.from(new Set(quotesForActiveTab.map(q => q.sub_account_name || q.customer_name).filter(Boolean))).sort(),
      states: Array.from(new Set(quotesForActiveTab.map(q => q.state_name).filter((v): v is string => Boolean(v)))).sort(),
      cities: Array.from(new Set(quotesForActiveTab.map(q => q.city_name).filter((v): v is string => Boolean(v)))).sort(),
      dates: Array.from(new Set(quotesForActiveTab.map(q => q.date))).sort().reverse(),
    };
  }, [quotesForActiveTab]);
  
  // Load user info on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem('username') || '';
      const storedIsAdmin = localStorage.getItem('isAdmin') === 'true';
      const storedDepartment = localStorage.getItem('department') || 'Sales';
      setCurrentUsername(storedUsername);
      setIsAdmin(storedIsAdmin);
      setDepartment(storedDepartment);
      
      // Redirect if not Sales department (Accounts will have different pages later)
      if (storedDepartment !== 'Sales') {
        router.replace('/');
      }
    }
  }, [router]);

  // Function to find which table contains a quote ID
  const findQuoteTable = async (quoteId: number): Promise<SectionTab | null> => {
    try {
      // Check all three tables for the quote ID
      const [mbcbRes, signagesRes, paintRes] = await Promise.all([
        supabaseBrowser.from('quotes_mbcb').select('id, section').eq('id', quoteId).maybeSingle(),
        supabaseBrowser.from('quotes_signages').select('id, section').eq('id', quoteId).maybeSingle(),
        supabaseBrowser.from('quotes_paint').select('id, section').eq('id', quoteId).maybeSingle(),
      ]);
      
      if (mbcbRes.data) return 'mbcb';
      if (signagesRes.data) return 'signages';
      if (paintRes.data) return 'paint';
      
      return null;
    } catch (error) {
      console.error('Error finding quote table:', error);
      return null;
    }
  };

  // Check for quote ID in query params to highlight
  useEffect(() => {
    if (!searchParams) return;
    const quoteIdParam = searchParams.get('quote');
    if (quoteIdParam && currentUsername) {
      const quoteId = parseInt(quoteIdParam);
      if (!isNaN(quoteId)) {
        setHighlightedQuoteId(quoteId);
        
        // Find which table contains this quote and switch to that tab
        findQuoteTable(quoteId).then((table) => {
          if (table) {
            setActiveTab(table);
          }
        }).catch((err) => {
          console.error('Error finding quote table:', err);
        });
        
        // Remove query param and highlight after 5 seconds
        const timer = setTimeout(() => {
          setHighlightedQuoteId(null);
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('quote');
          router.replace(newUrl.pathname + newUrl.search, { scroll: false });
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [searchParams, router, currentUsername, isAdmin]);

  // Scroll to highlighted quote when it's loaded and visible
  useEffect(() => {
    if (highlightedQuoteId && !loading && quotes.length > 0) {
      // Wait for table to render, then scroll
      const scrollTimer = setTimeout(() => {
        if (highlightedRowRef.current) {
          highlightedRowRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 1200);
      
      return () => clearTimeout(scrollTimer);
    }
  }, [highlightedQuoteId, loading, activeTab, quotesForActiveTab]);

  // Load quotes from Supabase based on active tab and user role
  const loadQuotes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query: any;
      
      if (activeTab === 'mbcb') {
        query = supabaseBrowser
          .from('quotes_mbcb')
          .select('*');
      } else if (activeTab === 'signages') {
        query = supabaseBrowser
          .from('quotes_signages')
          .select('*');
      } else if (activeTab === 'paint') {
        query = supabaseBrowser
          .from('quotes_paint')
          .select('*');
      } else {
        setQuotes([]);
        setLoading(false);
        return;
      }
      
      // Filter by user role: Admin sees all, employees see only their own quotations
      if (!isAdmin && currentUsername) {
        // For sales employees: filter by quotations they created
        // This ensures they only see quotations for their own customers
        query = query.eq('created_by', currentUsername);
      }
      // Admin sees all quotations - no filtering needed
      
      // Order by created_at descending
      query = query.order('created_at', { ascending: false });
      
      const { data, error: queryError } = await query;
      
      if (queryError) throw queryError;
      
      // Fetch all states and cities once
      const [statesRes, allQuotes] = await Promise.all([
        fetch('/api/states'),
        Promise.resolve(data || [])
      ]);
      
      const statesData = await statesRes.json();
      const statesMap = new Map((statesData.states || []).map((s: any) => [s.id, s.name]));
      
      // Get unique state_ids from quotes
      const uniqueStateIds = [...new Set((data || []).map((q: any) => q.state_id).filter(Boolean))];
      
      // Fetch cities for all states at once
      const citiesPromises = uniqueStateIds.map(stateId => 
        fetch(`/api/cities?state_id=${stateId}`).then(r => r.json())
      );
      const citiesResults = await Promise.all(citiesPromises);
      const citiesMap = new Map();
      citiesResults.forEach((result, index) => {
        if (result.success && result.cities) {
          result.cities.forEach((city: any) => {
            citiesMap.set(city.id, city.name);
          });
        }
      });
      
      // Transform data to include state_name and city_name
      const transformedData = (data || []).map((quote: any) => ({
        ...quote,
        state_name: quote.state_id ? statesMap.get(quote.state_id) || null : null,
        city_name: quote.city_id ? citiesMap.get(quote.city_id) || null : null,
        // Keep place_of_supply for backward compatibility
        place_of_supply: quote.place_of_supply || (quote.state_id && quote.city_id && statesMap.get(quote.state_id) && citiesMap.get(quote.city_id) ? `${statesMap.get(quote.state_id)}, ${citiesMap.get(quote.city_id)}` : null),
      }));
      
      setQuotes(transformedData);
    } catch (err: any) {
      console.error('Error loading quotes:', err);
      setError(err.message || 'Failed to load quotation history');
    } finally {
      setLoading(false);
    }
  };

  // Load quotes when tab changes or user info changes
  useEffect(() => {
    if (currentUsername) { // Only load when we have user info
      loadQuotes();
    }
    // Note: We no longer clear all selections when tab changes to support cross-product merging
    // Selections are preserved across tabs
  }, [activeTab, currentUsername, isAdmin]); // Reload when tab changes
  
  // Handle checkbox toggle - tracks selection for merge PDF generation
  const handleToggleSelect = (quote: Quote) => {
    const quoteId = quote.id;
    const sourceTable = activeTab; // Use activeTab since quotes are filtered by tab
    
    setSelectedQuotesForMerge(prev => {
      const exists = prev.some(s => s.id === quoteId && s.table === sourceTable);
      if (exists) {
        // Remove this specific quote
        return prev.filter(s => !(s.id === quoteId && s.table === sourceTable));
      } else {
        // Add this quote with all required fields for validation
        return [...prev, {
          id: quoteId,
          table: sourceTable,
          final_total_cost: quote.final_total_cost,
          section: quote.section,
          state_id: quote.state_id || null,
          city_id: quote.city_id || null,
          sub_account_id: quote.sub_account_id || null,
          date: quote.date,
          raw_payload: quote.raw_payload,
        }];
      }
    });
  };
  
  // Handle select all in current tab
  const handleSelectAll = () => {
    const allCurrentSelected = filteredQuotes.every(q => isQuoteSelected(q.id, activeTab));
    
    if (allCurrentSelected) {
      // Deselect all from current tab only
      setSelectedQuotesForMerge(prev => prev.filter(s => s.table !== activeTab));
    } else {
      // Select all from current tab (keep other tabs' selections)
      const otherTabSelections = selectedQuotesForMerge.filter(s => s.table !== activeTab);
      const currentTabSelections = filteredQuotes.map(q => ({
        id: q.id,
        table: activeTab,
        final_total_cost: q.final_total_cost,
        section: q.section,
        state_id: q.state_id || null,
        city_id: q.city_id || null,
        sub_account_id: q.sub_account_id || null,
        date: q.date,
        raw_payload: q.raw_payload,
      }));
      
      setSelectedQuotesForMerge([...otherTabSelections, ...currentTabSelections]);
    }
  };
  
  // Validation with restrictions: same place of supply, same estimate date, same expiry date
  const mergeValidation = useMemo(() => {
    if (selectedQuotesForMerge.length === 0) {
      return { canMerge: false, message: 'Select quotations to generate merged PDF' };
    }
    
    if (selectedQuotesForMerge.length < 2) {
      return { canMerge: false, message: 'Select at least 2 quotations to merge' };
    }
    
    // Check all have same place of supply (state_id + city_id)
    const placeOfSupplyKeys = selectedQuotesForMerge.map(s => `${s.state_id || 'null'}-${s.city_id || 'null'}`);
    const uniquePlaces = new Set(placeOfSupplyKeys);
    if (uniquePlaces.size > 1) {
      return { canMerge: false, message: '⚠️ All quotations must have the same Place of Supply' };
    }
    
    // Check all have same estimate date (from raw_payload or date field)
    const estimateDates = selectedQuotesForMerge.map(s => {
      const payload = s.raw_payload || {};
      return payload.estimateDate || payload.quotationDate || s.date || '';
    });
    const uniqueEstimateDates = new Set(estimateDates.filter(d => d));
    if (uniqueEstimateDates.size > 1) {
      return { canMerge: false, message: '⚠️ All quotations must have the same Estimate Date' };
    }
    
    // Check all have same expiry date (from raw_payload)
    const expiryDates = selectedQuotesForMerge.map(s => {
      const payload = s.raw_payload || {};
      return payload.expiryDate || '';
    });
    const uniqueExpiryDates = new Set(expiryDates.filter(d => d));
    if (uniqueExpiryDates.size > 1) {
      return { canMerge: false, message: '⚠️ All quotations must have the same Expiry Date' };
    }
    
    // Check if cross-product merge
    const productTypes = new Set(selectedQuotesForMerge.map(s => s.table));
    const isCrossProduct = productTypes.size > 1;
    
    // Calculate combined total
    const combinedTotal = selectedQuotesForMerge.reduce((sum, s) => sum + (s.final_total_cost || 0), 0);
    
    return { 
      canMerge: true, 
      message: isCrossProduct 
        ? `✅ ${selectedQuotesForMerge.length} quotations ready to merge (${Array.from(productTypes).join(' + ')})`
        : `✅ ${selectedQuotesForMerge.length} quotations ready to merge`,
      isCrossProduct,
      productTypes: Array.from(productTypes),
      combinedTotal,
    };
  }, [selectedQuotesForMerge]);
  
  // Handle merge - generates and downloads merged PDF
  const handleMergeQuotations = async () => {
    if (!mergeValidation.canMerge) {
      setToast({ message: mergeValidation.message, type: 'error' });
      return;
    }
    
    try {
      setIsMerging(true);
      
      // Prepare request body
      const quoteSources = selectedQuotesForMerge.map(s => ({ id: s.id, table: s.table }));
      
      const response = await fetch('/api/merge-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteSources }),
      });
      
      if (!response.ok) {
        // Try to get error message from JSON response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate PDF');
        }
        throw new Error('Failed to generate merged PDF');
      }
      
      // Get PDF blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `YNM-Merged-Quotations-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setToast({ 
        message: `✅ Merged PDF downloaded! (${selectedQuotesForMerge.length} quotations, Total: ₹${mergeValidation.combinedTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`, 
        type: 'success' 
      });
      
      // Clear selections after successful download
      setSelectedQuotesForMerge([]);
      
    } catch (error: any) {
      console.error('Error generating merged PDF:', error);
      setToast({ message: error.message || 'Failed to generate merged PDF', type: 'error' });
    } finally {
      setIsMerging(false);
    }
  };
  
  // Clear all merge selections
  const clearMergeSelections = () => {
    setSelectedQuotesForMerge([]);
  };
  
  // ID normalization disabled - was causing foreign key constraint errors
  // The normalize-ids API tries to renumber IDs which conflicts with foreign keys
  // useEffect(() => {
  //   normalizeOnLoad();
  // }, []);
  
  // Filtered and sorted quotes
  const filteredQuotes = useMemo(() => {
    let filtered = [...quotesForActiveTab];
    
    // Individual filters
    // Only filter by created_by if admin (employees only see their own quotes anyway)
    if (isAdmin && filterCreatedBy) {
      filtered = filtered.filter(q => q.created_by === filterCreatedBy);
    }
    if (filterSubAccountName) {
      filtered = filtered.filter(q => (q.sub_account_name || q.customer_name) === filterSubAccountName);
    }
    if (filterStateId) {
      filtered = filtered.filter(q => q.state_id === filterStateId);
    }
    if (filterCityId) {
      filtered = filtered.filter(q => q.city_id === filterCityId);
    }
    if (filterDate) {
      filtered = filtered.filter(q => q.date === filterDate);
    }
    
    // Sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal: any = a[sortColumn];
        let bVal: any = b[sortColumn];
        
        if (sortColumn === 'date') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        } else if (sortColumn === 'final_total_cost') {
          aVal = aVal || 0;
          bVal = bVal || 0;
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [quotesForActiveTab, filterCreatedBy, filterSubAccountName, filterStateId, filterCityId, filterDate, sortColumn, sortDirection]);
  
  const handleSort = (column: 'date' | 'final_total_cost') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };
  
  const exportToExcel = async (quote?: Quote) => {
    try {
    // Dynamic import xlsx to reduce initial bundle size
      // Use namespace import to get all exports
    const XLSX = await import('xlsx');
      
      // Verify XLSX has required methods
      if (!XLSX || !XLSX.utils || !XLSX.writeFile) {
        console.error('XLSX library not properly loaded:', XLSX);
        setToast({ message: 'Excel export library is not available. Please refresh the page and try again.', type: 'error' });
        return;
      }
    
    const dataToExport = quote ? [quote] : filteredQuotes;
      
      if (!dataToExport || dataToExport.length === 0) {
        setToast({ message: 'No quotations to export', type: 'error' });
        return;
      }
    
    const excelData = dataToExport.map(q => {
      const baseData: any = {
        'ID': q.id,
        'Created By': q.created_by || '',
        'Section': q.section,
        'State': q.state_name || '',
        'City': q.city_name || '',
          'Sub Account Name': q.sub_account_name || q.customer_name || '',
        'Purpose': q.purpose || '',
          'Date': q.date || '',
          'Final Total Cost': q.final_total_cost || 0,
        'Created At': formatTimestampIST(q.created_at),
      };
      
      // Add section-specific fields
      if (isMBCBQuote(q)) {
        baseData['Quantity (rm)'] = q.quantity_rm || '';
        baseData['Total Weight per rm'] = q.total_weight_per_rm || '';
        baseData['Total Cost per rm'] = q.total_cost_per_rm || '';
      } else if (isSignagesQuote(q)) {
        const payload = q.raw_payload || {};
        baseData['Board Type'] = payload.boardType || '';
        baseData['Shape'] = payload.shape || '';
        baseData['Area (sq ft)'] = payload.areaSqFt || '';
        baseData['Quantity'] = payload.quantity || '';
        baseData['Cost Per Piece'] = payload.costPerPiece || '';
        } else if (q.section?.toLowerCase().includes('paint')) {
          const payload = q.raw_payload || {};
          baseData['Area (sq ft)'] = payload.areaSqFt || '';
          baseData['Cost Per Sq Ft'] = payload.costPerSqFt || '';
          baseData['Quantity'] = payload.quantity || '';
      }
      
      return baseData;
    });
      
      if (!excelData || excelData.length === 0) {
        setToast({ message: 'No data to export', type: 'error' });
        return;
      }
    
    const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths for better readability
      const maxWidth = 30;
      const wscols = Object.keys(excelData[0] || {}).map(() => ({ wch: maxWidth }));
      ws['!cols'] = wscols;
      
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quotations');
    
    const fileName = quote 
        ? `Quotation-${quote.id}-${(quote.customer_name || quote.sub_account_name || 'Unknown').replace(/\s+/g, '-')}.xlsx`
      : `${activeTab.toUpperCase()}-Quotations-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
      
      // Show success message
      setToast({ 
        message: quote 
          ? 'Quotation exported to Excel successfully' 
          : `${dataToExport.length} quotation(s) exported to Excel successfully`, 
        type: 'success' 
      });
    } catch (err: any) {
      console.error('Error exporting to Excel:', err);
      setToast({ 
        message: `Failed to export to Excel: ${err.message || 'Unknown error'}. Please try again.`, 
        type: 'error' 
      });
    }
  };

  // Helper function to convert Quote to any (removed - PDF export disabled)
  const convertQuoteToPDFData = (quote: Quote): any => {
    if (!quote.raw_payload) {
      console.error('Quote missing raw_payload');
      return null;
    }

    const payload = quote.raw_payload;
    
    // For Signages, use customFields structure
    if (isSignagesQuote(quote)) {
      const formattedDate = quote.date.includes('-') 
        ? quote.date.split('-').reverse().join('/')
        : quote.date;
      
      return {
        createdBy: quote.created_by || 'Admin',
        customerName: quote.customer_name,
        state: quote.state_name || '',
        city: quote.city_name || '',
        purpose: quote.purpose || '',
        date: formattedDate,
        section: isSignagesQuote(quote) 
          ? (payload.msEnabled ? 'Reflective Part + MS Part' : 'Reflective Part')
          : quote.section,
        quantityRm: null,
        parts: [],
        materialCostPerRm: null,
        transportCostPerRm: null,
        installationCostPerRm: null,
        totalCostPerRm: payload.costPerPiece || null,
        customFields: {
          boardType: payload.boardType,
          shape: payload.shape,
          size: payload.size,
          width: payload.width,
          height: payload.height,
          sheetingType: payload.sheetingType,
          acpThickness: payload.acpThickness,
          printingType: payload.printingType,
          areaSqMm: payload.areaSqMm,
          areaSqM: payload.areaSqM,
          areaSqFt: payload.areaSqFt,
          baseMaterialCostPerSqFt: payload.baseMaterialCostPerSqFt,
          rivetingPackagingCostPerSqFt: payload.rivetingPackagingCostPerSqFt,
          overheadCostPerSqFt: payload.overheadCostPerSqFt,
          totalCostPerSqFt: payload.totalCostPerSqFt,
          profitPercent: payload.profitPercent,
          quantity: payload.quantity,
          costPerPiece: payload.costPerPiece,
          msEnabled: payload.msEnabled,
          msPostSpec: payload.msPostSpec,
          msFrameSpec: payload.msFrameSpec,
          msPostLengthM: payload.msPostLengthM,
          msFrameLengthM: payload.msFrameLengthM,
          msPostWeightKg: payload.msPostWeightPerPieceKg || payload.msPostWeightKg,
          msFrameWeightKg: payload.msFrameWeightPerPieceKg || payload.msFrameWeightKg,
          msTotalMsWeightKg: payload.msTotalWeightPerPieceKg || payload.msTotalMsWeightKg,
          msRatePerKg: payload.msRatePerKg,
          msCostPerStructure: payload.msCostPerStructure,
          msTotalMsCost: payload.msTotalCost || payload.msTotalMsCost,
        },
        finalTotal: quote.final_total_cost || null,
      };
    }
    
    // For MBCB, use existing structure
    const parts: any['parts'] = [];
    
    if (payload.includeWBeam && payload.wBeamResult?.found) {
      parts.push({
        partName: 'W-Beam',
        thickness: payload.wBeam?.thickness,
        length: null,
        coatingGsm: payload.wBeam?.coatingGsm,
        blackMaterialWeight: payload.wBeamResult.weightBlackMaterial,
        zincAddedWeight: payload.wBeamResult.weightZincAdded,
        totalWeight: payload.wBeamResult.totalWeight,
      });
    }
    
    if (payload.includeThrieBeam && payload.thrieBeamResult?.found) {
      parts.push({
        partName: 'Thrie Beam',
        thickness: payload.thrieBeam?.thickness,
        length: null,
        coatingGsm: payload.thrieBeam?.coatingGsm,
        blackMaterialWeight: payload.thrieBeamResult.weightBlackMaterial,
        zincAddedWeight: payload.thrieBeamResult.weightZincAdded,
        totalWeight: payload.thrieBeamResult.totalWeight,
      });
    }
    
    if (payload.includePost && payload.postResult?.found) {
      parts.push({
        partName: 'Post',
        thickness: payload.post?.thickness,
        length: payload.post?.length,
        coatingGsm: payload.post?.coatingGsm,
        blackMaterialWeight: payload.postResult.weightBlackMaterial,
        zincAddedWeight: payload.postResult.weightZincAdded,
        totalWeight: payload.postResult.totalWeight,
      });
    }
    
    if (payload.includeSpacer && payload.spacerResult?.found) {
      parts.push({
        partName: 'Spacer',
        thickness: payload.spacer?.thickness,
        length: payload.spacer?.length,
        coatingGsm: payload.spacer?.coatingGsm,
        blackMaterialWeight: payload.spacerResult.weightBlackMaterial,
        zincAddedWeight: payload.spacerResult.weightZincAdded,
        totalWeight: payload.spacerResult.totalWeight,
      });
    }
    
    // Extract multipliers
    const multipliers: any['multipliers'] = {};
    if (payload.includeWBeam) multipliers.wBeam = quote.section.includes('Double') ? 2 : 1;
    if (payload.includeThrieBeam) multipliers.wBeam = quote.section.includes('Double') ? 2 : 1;
    if (payload.includePost) multipliers.post = 2;
    if (payload.includeSpacer) multipliers.spacer = quote.section.includes('Double') ? 4 : 2;
    
    // Extract fastener details
    const fastenerMode = payload.fastenerMode || 'default';
    let fastenerWeight = 0;
    
    if (fastenerMode === 'manual') {
      fastenerWeight = (payload.hexBoltQty || 0) * 0.135 + (payload.buttonBoltQty || 0) * 0.145;
    } else {
      // Default mode - determine weight based on section
      if (quote.section.includes('Double W-Beam')) {
        fastenerWeight = 4;
      } else if (quote.section.includes('Double Thrie')) {
        fastenerWeight = 6;
      } else if (quote.section.includes('W-Beam')) {
        fastenerWeight = 2;
      } else if (quote.section.includes('Thrie')) {
        fastenerWeight = 3;
      } else {
        fastenerWeight = 2; // Default fallback
      }
    }
    
    const fastenerDetails = fastenerMode === 'manual' ? {
      hexBoltQty: payload.hexBoltQty || 0,
      buttonBoltQty: payload.buttonBoltQty || 0,
    } : undefined;
    
    // Convert date format from YYYY-MM-DD to DD/MM/YYYY
    let formattedDate = quote.date;
    if (quote.date.includes('-')) {
      const [year, month, day] = quote.date.split('-');
      formattedDate = `${day}/${month}/${year}`;
    }
    
      // Format section name for signages
      const sectionName = payload.msEnabled 
        ? 'Reflective Part + MS Part'
        : 'Reflective Part';
      
      return {
        createdBy: quote.created_by || 'Admin',
        customerName: quote.customer_name,
        state: quote.state_name || '',
        city: quote.city_name || '',
        purpose: quote.purpose || '',
        date: formattedDate,
        section: sectionName,
        quantityRm: quote.quantity_rm ?? null,
      parts,
      fastenerMode,
      fastenerWeight: fastenerWeight > 0 ? fastenerWeight : undefined,
      fastenerDetails,
      multipliers,
      totalSetWeight: payload.totalSetWeight || 0,
      totalWeightPerRm: quote.total_weight_per_rm || 0,
      materialCostPerRm: payload.materialCostPerRm || null,
      transportCostPerRm: payload.transportCostPerRm || null,
      installationCostPerRm: payload.includeInstallation ? (payload.installationCostPerRmValue || null) : null,
      totalCostPerRm: quote.total_cost_per_rm || null,
      finalTotal: quote.final_total_cost || null,
    };
  };

  
  const handleViewDetails = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsModalOpen(true);
  };
  
  const handleDeleteClick = (quote: Quote) => {
    setQuoteToDelete(quote);
    setDeleteConfirmOpen(true);
  };
  
  // Status updates are now handled in the Quotation Status Update page only

  const handleDeleteConfirm = async () => {
    if (!quoteToDelete) return;
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/quotes/delete?id=${quoteToDelete.id}&product_type=${activeTab}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete quotation');
      }
      
      // Remove from UI immediately (temporary, will be refreshed after normalization)
      setQuotes(prevQuotes => prevQuotes.filter(q => q.id !== quoteToDelete.id));
      
      // Close confirmation modal
      setDeleteConfirmOpen(false);
      setQuoteToDelete(null);
      
      // Refetch quotes after deletion
      await loadQuotes();
      console.log('✅ Quotation list refreshed');
      
      // Show success toast
      setToast({ message: 'Quotation deleted successfully', type: 'success' });
    } catch (error: any) {
      console.error('Error deleting quotation:', error);
      setToast({ message: error.message || 'Failed to delete quotation', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setQuoteToDelete(null);
  };
  
  const clearFilters = () => {
    setFilterCreatedBy('');
    setFilterSubAccountName('');
    setFilterStateId(null);
    setFilterStateName('');
    setFilterCityId(null);
    setFilterCityName('');
    setFilterDate('');
    setSortColumn(null);
    setSortDirection('desc');
  };
  
  // Render MBCB table
  const renderMBCBTable = () => (
    <div className="overflow-x-auto max-h-[600px] overflow-y-auto -mx-2 sm:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
      <table className="w-full min-w-[900px] sm:min-w-0">
        <thead className="sticky top-0 bg-[#1A103C]/95 backdrop-blur-sm z-10">
          <tr className="border-b border-white/20">
            <th className="text-left py-4 px-4 text-sm font-bold text-white">
              <input
                type="checkbox"
                checked={filteredQuotes.length > 0 && filteredQuotes.every(q => isQuoteSelected(q.id, activeTab))}
                onChange={handleSelectAll}
                className="w-4 h-4 text-brand-primary bg-gray-100 border-gray-300 rounded focus:ring-brand-primary"
              />
            </th>
            <th className="text-left py-4 px-4 text-sm font-bold text-white">#</th>
            <th className="text-left py-4 px-4 text-sm font-bold text-white">Section</th>
            {isAdmin && <th className="text-left py-4 px-4 text-sm font-bold text-white">Created By</th>}
            <th className="text-left py-4 px-4 text-sm font-bold text-white">Sub Account</th>
            <th className="text-left py-4 px-4 text-sm font-bold text-white">State</th>
            <th className="text-left py-4 px-4 text-sm font-bold text-white">City</th>
            <th className="text-left py-4 px-4 text-sm font-bold text-white">Purpose</th>
            <th 
              className="text-left py-4 px-4 text-sm font-bold text-white cursor-pointer hover:text-premium-gold transition-colors"
              onClick={() => handleSort('date')}
            >
              Date {sortColumn === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="text-left py-4 px-4 text-sm font-bold text-white">Qty (rm)</th>
            <th className="text-left py-4 px-4 text-sm font-bold text-white">Weight/rm</th>
            <th className="text-left py-4 px-4 text-sm font-bold text-white">Cost/rm</th>
            <th 
              className="text-left py-4 px-4 text-sm font-bold text-white cursor-pointer hover:text-premium-gold transition-colors"
              onClick={() => handleSort('final_total_cost')}
            >
              Final Total {sortColumn === 'final_total_cost' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="text-left py-4 px-4 text-sm font-bold text-white">Status</th>
            <th className="text-left py-4 px-4 text-sm font-bold text-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredQuotes.map((quote) => (
            <tr 
              key={quote.id} 
              ref={highlightedQuoteId === quote.id ? highlightedRowRef : null}
              className={`border-b border-white/10 hover:bg-white/5 transition-all duration-200 ${
                highlightedQuoteId === quote.id 
                  ? 'bg-gradient-to-r from-premium-gold/30 via-premium-gold/20 to-premium-gold/30 ring-2 ring-premium-gold/70 shadow-[0_0_35px_rgba(212,166,90,0.65)] animate-pulse relative transition-all duration-500 ease-out' 
                  : ''
              }`}
              style={highlightedQuoteId === quote.id ? {
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                boxShadow: '0 0 35px rgba(212, 166, 90, 0.55), 0 0 65px rgba(212, 166, 90, 0.35)'
              } : {}}
            >
              <td className="py-4 px-4">
                <input
                      type="checkbox"
                      checked={isQuoteSelected(quote.id, activeTab)}
                      onChange={() => handleToggleSelect(quote)}
                      className="w-4 h-4 text-brand-primary bg-gray-100 border-gray-300 rounded focus:ring-brand-primary"
                />
              </td>
              <td className="py-4 px-4 text-slate-200 font-semibold">{quote.id}</td>
              <td className="py-4 px-4 text-slate-200">{quote.section}</td>
              {isAdmin && <td className="py-4 px-4 text-slate-200">{quote.created_by || '-'}</td>}
              <td className="py-4 px-4 text-slate-200">{quote.sub_account_name || quote.customer_name}</td>
              <td className="py-4 px-4 text-slate-200">{quote.state_name || '-'}</td>
              <td className="py-4 px-4 text-slate-200">{quote.city_name || '-'}</td>
              <td className="py-4 px-4 text-slate-200">{quote.purpose || '-'}</td>
              <td className="py-4 px-4 text-slate-200">
                {quote.date.includes('-') 
                  ? (() => {
                      const [year, month, day] = quote.date.split('-');
                      return `${day}-${month}-${year}`;
                    })()
                  : quote.date.includes('/')
                  ? (() => {
                      const [day, month, year] = quote.date.split('/');
                      return `${day}-${month}-${year}`;
                    })()
                  : quote.date}
              </td>
              <td className="py-4 px-4 text-slate-200">{quote.quantity_rm || '-'}</td>
              <td className="py-4 px-4 text-slate-200">
                {quote.total_weight_per_rm ? `${quote.total_weight_per_rm.toFixed(2)} kg` : '-'}
              </td>
              <td className="py-4 px-4 text-slate-200">
                {quote.total_cost_per_rm ? `₹${quote.total_cost_per_rm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
              </td>
              <td className="py-4 px-4 text-premium-gold font-bold">
                {quote.final_total_cost ? `₹${quote.final_total_cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
              </td>
              <td className="py-4 px-4">
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  quote.status === 'closed_won' ? 'bg-green-500/20 text-green-300' :
                  quote.status === 'closed_lost' ? 'bg-red-500/20 text-red-300' :
                  quote.status === 'sent' ? 'bg-blue-500/20 text-blue-300' :
                  quote.status === 'negotiation' ? 'bg-purple-500/20 text-purple-300' :
                  quote.status === 'on_hold' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-slate-500/20 text-slate-300'
                }`}>
                  {(quote.status || 'draft').toUpperCase().replace('_', ' ')}
                </span>
              </td>
              <td className="py-4 px-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetails(quote)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-accent rounded-lg transition-all duration-200"
                  >
                    View
                  </button>
                  <button
                    onClick={() => exportToExcel(quote)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-premium-gold/80 hover:bg-premium-gold rounded-lg transition-all duration-200"
                  >
                    Excel
                  </button>
                  <button
                    onClick={() => handleDeleteClick(quote)}
                    disabled={isDeleting}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
  // Render Signages table
  const renderSignagesTable = () => {
    if (filteredQuotes.length === 0) {
      return (
        <div className="text-center py-20">
          <div className="text-4xl text-slate-400 mb-4">📋</div>
          <p className="text-slate-300">No signages quotations found</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#1A103C]/95 backdrop-blur-sm z-10">
            <tr className="border-b border-white/20">
              <th className="text-left py-4 px-4 text-sm font-bold text-white">
                <input
                  type="checkbox"
                  checked={filteredQuotes.length > 0 && filteredQuotes.every(q => isQuoteSelected(q.id, activeTab))}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-brand-primary bg-gray-100 border-gray-300 rounded focus:ring-brand-primary"
                />
              </th>
              <th className="text-left py-4 px-4 text-sm font-bold text-white">#</th>
              {isAdmin && <th className="text-left py-4 px-4 text-sm font-bold text-white">Created By</th>}
              <th className="text-left py-4 px-4 text-sm font-bold text-white">Sub Account</th>
              <th className="text-left py-4 px-4 text-sm font-bold text-white">State</th>
              <th className="text-left py-4 px-4 text-sm font-bold text-white">City</th>
            <th className="text-left py-4 px-4 text-sm font-bold text-white">Board Type</th>
              <th className="text-left py-4 px-4 text-sm font-bold text-white">Shape</th>
              <th className="text-left py-4 px-4 text-sm font-bold text-white">Area (sq ft)</th>
              <th className="text-left py-4 px-4 text-sm font-bold text-white">Quantity</th>
              <th className="text-left py-4 px-4 text-sm font-bold text-white">Cost/Piece</th>
              <th 
                className="text-left py-4 px-4 text-sm font-bold text-white cursor-pointer hover:text-premium-gold transition-colors"
                onClick={() => handleSort('final_total_cost')}
              >
                Final Total {sortColumn === 'final_total_cost' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-left py-4 px-4 text-sm font-bold text-white cursor-pointer hover:text-premium-gold transition-colors"
                onClick={() => handleSort('date')}
              >
                Date {sortColumn === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-left py-4 px-4 text-sm font-bold text-white">Status</th>
              <th className="text-left py-4 px-4 text-sm font-bold text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.map((quote) => {
              const p = (quote.raw_payload || {}) as Record<string, any>;
              return (
                <tr 
                  key={quote.id} 
                  className="border-b border-white/10 hover:bg-white/5 transition-all duration-200"
                >
                  <td className="py-4 px-4">
                    <input
                      type="checkbox"
                      checked={isQuoteSelected(quote.id, activeTab)}
                      onChange={() => handleToggleSelect(quote)}
                      className="w-4 h-4 text-brand-primary bg-gray-100 border-gray-300 rounded focus:ring-brand-primary"
                    />
                  </td>
                  <td className="py-4 px-4 text-slate-200 font-semibold">{quote.id}</td>
                  {isAdmin && <td className="py-4 px-4 text-slate-200">{quote.created_by || '-'}</td>}
                  <td className="py-4 px-4 text-slate-200">{quote.sub_account_name || quote.customer_name}</td>
                  <td className="py-4 px-4 text-slate-200">{quote.state_name || '-'}</td>
                  <td className="py-4 px-4 text-slate-200">{quote.city_name || '-'}</td>
                  <td className="py-4 px-4 text-slate-200">{p?.boardType || '-'}</td>
                  <td className="py-4 px-4 text-slate-200">{p?.shape || '-'}</td>
                  <td className="py-4 px-4 text-slate-200">
                    {p?.areaSqFt ? `${p.areaSqFt % 1 === 0 ? p.areaSqFt.toFixed(0) : p.areaSqFt.toFixed(1)} sq ft` : '-'}
                  </td>
                  <td className="py-4 px-4 text-slate-200">{p?.quantity || '-'}</td>
                  <td className="py-4 px-4 text-slate-200">
                    {p?.costPerPiece ? `₹${Number(p.costPerPiece).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="py-4 px-4 text-premium-gold font-bold">
                    {quote.final_total_cost ? `₹${quote.final_total_cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="py-4 px-4 text-slate-200">
                    {quote.date.includes('-') 
                      ? (() => {
                          const [year, month, day] = quote.date.split('-');
                          return `${day}-${month}-${year}`;
                        })()
                      : quote.date.includes('/')
                      ? (() => {
                          const [day, month, year] = quote.date.split('/');
                          return `${day}-${month}-${year}`;
                        })()
                      : quote.date}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      quote.status === 'closed_won' ? 'bg-green-500/20 text-green-300' :
                      quote.status === 'closed_lost' ? 'bg-red-500/20 text-red-300' :
                      quote.status === 'sent' ? 'bg-blue-500/20 text-blue-300' :
                      quote.status === 'negotiation' ? 'bg-purple-500/20 text-purple-300' :
                      quote.status === 'on_hold' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-slate-500/20 text-slate-300'
                    }`}>
                      {(quote.status || 'draft').toUpperCase().replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(quote)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-accent rounded-lg transition-all duration-200"
                      >
                        View
                      </button>
                      <button
                        onClick={() => exportToExcel(quote)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-premium-gold/80 hover:bg-premium-gold rounded-lg transition-all duration-200"
                      >
                        Excel
                      </button>
                      <button
                        onClick={() => handleDeleteClick(quote)}
                        disabled={isDeleting}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen flex flex-col items-start py-6 sm:py-8 md:py-12 pt-12 sm:pt-14 md:pt-16 pb-20 sm:pb-24 md:pb-32 relative">
      
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4">
        {/* Header */}
        <div className="w-full flex flex-col items-center mb-10 title-glow fade-up">
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-extrabold text-white mb-4 text-center tracking-tight drop-shadow-md text-neon-gold px-2" style={{ 
            textShadow: '0 0 10px rgba(209, 168, 90, 0.3)', /* Reduced for performance */
            letterSpacing: '-0.02em'
          }}>
            Quotation History
          </h1>
          <p className="text-xl text-slate-200 text-center max-w-2xl">
            View and manage all your saved quotations
          </p>
        </div>
        
        {/* Section Tabs */}
        <div className="glassmorphic-premium rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-md card-3d card-depth">
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => {
                setActiveTab('mbcb');
                clearFilters();
              }}
              className={`px-8 py-4 text-lg font-bold rounded-xl transition-all duration-300 ${
                activeTab === 'mbcb'
                  ? 'bg-gradient-to-r from-premium-gold to-dark-gold text-white shadow-lg shadow-premium-gold/50'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
              }`}
            >
              🏗️ MBCB
            </button>
            <button
              onClick={() => {
                setActiveTab('signages');
                clearFilters();
              }}
              className={`px-8 py-4 text-lg font-bold rounded-xl transition-all duration-300 ${
                activeTab === 'signages'
                  ? 'bg-gradient-to-r from-premium-gold to-dark-gold text-white shadow-lg shadow-premium-gold/50'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
              }`}
            >
              🚦 Signages
            </button>
            <button
              onClick={() => {
                setActiveTab('paint');
                clearFilters();
              }}
              className={`px-8 py-4 text-lg font-bold rounded-xl transition-all duration-300 ${
                activeTab === 'paint'
                  ? 'bg-gradient-to-r from-premium-gold to-dark-gold text-white shadow-lg shadow-premium-gold/50'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
              }`}
            >
              🎨 Paint
            </button>
          </div>
        </div>
        
        {/* Paint - Coming Soon */}
        {activeTab === 'paint' && (
          <div className="glassmorphic-premium rounded-3xl p-20 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-md text-center card-3d card-depth">
            <div className="text-6xl mb-6">🎨</div>
            <h2 className="text-4xl font-extrabold text-white mb-4">Coming Soon</h2>
            <p className="text-xl text-slate-300">Paint quotation history will be available here soon.</p>
          </div>
        )}
        
        {/* Filters and Content for MBCB and Signages */}
        {activeTab !== 'paint' && (
          <>
            {/* Filters Card */}
            <div className="glassmorphic-premium rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-extrabold text-white drop-shadow-lg">Filters</h2>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
                >
                  Clear All
                </button>
              </div>
              
              {/* Filter Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">Created By</label>
                    <select
                      value={filterCreatedBy}
                      onChange={(e) => setFilterCreatedBy(e.target.value)}
                      className="input-premium w-full px-4 py-3 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                    >
                      <option value="">All</option>
                      {uniqueValues.createdBy.map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Sub Account Name</label>
                  <select
                    value={filterSubAccountName}
                    onChange={(e) => setFilterSubAccountName(e.target.value)}
                    className="input-premium w-full px-4 py-3 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                  >
                    <option value="">All</option>
                    {uniqueValues.subAccountNames.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <StateCitySelect
                    stateId={filterStateId}
                    cityId={filterCityId}
                    onStateChange={(newStateId, newStateName) => {
                      setFilterStateId(newStateId);
                      setFilterStateName(newStateName);
                      setFilterCityId(null); // Reset city when state changes
                      setFilterCityName('');
                    }}
                    onCityChange={(newCityId, newCityName) => {
                      setFilterCityId(newCityId);
                      setFilterCityName(newCityName);
                    }}
                    required={false}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Date</label>
                  <select
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="input-premium w-full px-4 py-3 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                  >
                    <option value="">All</option>
                    {uniqueValues.dates.map(val => {
                      // Format date to DD-MM-YYYY
                      let formattedDate = val;
                      if (val.includes('-')) {
                        const [year, month, day] = val.split('-');
                        formattedDate = `${day}-${month}-${year}`;
                      } else if (val.includes('/')) {
                        const [day, month, year] = val.split('/');
                        formattedDate = `${day}-${month}-${year}`;
                      }
                      return (
                        <option key={val} value={val}>{formattedDate}</option>
                      );
                    })}
                  </select>
                </div>
              </div>
              
              {/* Export Buttons */}
              <div className="mt-6 flex justify-end gap-4 flex-wrap">
                <button
                  onClick={() => exportToExcel()}
                  className="btn-premium-gold btn-ripple btn-press btn-3d px-6 py-3 text-base shimmer"
                >
                  📊 Export All to Excel
                </button>
              </div>
            </div>
            
            {/* Merge Selection Panel - Shows when quotations are selected */}
            {selectedQuotesForMerge.length > 0 && (
              <div className="glassmorphic-premium rounded-xl p-4 mb-4 slide-up border-2 border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-purple-900/20">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-lg font-bold text-white">📄 Generate Merged PDF</span>
                      <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm font-semibold">
                        {selectedQuotesForMerge.length} selected
                      </span>
                      {mergeValidation.isCrossProduct && (
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-semibold">
                          Multi-Product
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-green-300">
                      {mergeValidation.message}
                    </p>
                    {mergeValidation.combinedTotal !== undefined && mergeValidation.combinedTotal > 0 && (
                      <p className="text-sm text-slate-300 mt-1">
                        Combined Total: <span className="text-premium-gold font-bold">₹{mergeValidation.combinedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </p>
                    )}
                    {/* Show which product types are selected */}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {['mbcb', 'signages', 'paint'].map(type => {
                        const count = selectedQuotesForMerge.filter(s => s.table === type).length;
                        if (count === 0) return null;
                        return (
                          <span key={type} className="px-2 py-1 bg-white/10 text-slate-200 rounded text-xs">
                            {type.toUpperCase()}: {count}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={clearMergeSelections}
                      className="px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={handleMergeQuotations}
                      disabled={!mergeValidation.canMerge || isMerging}
                      className={`px-6 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
                        mergeValidation.canMerge 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/50' 
                          : 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {isMerging ? '⏳ Generating PDF...' : '📥 Download Merged PDF'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Results Count */}
            <div className="mb-4 text-slate-300">
              Showing {filteredQuotes.length} of {quotesForActiveTab.length} quotations
              {selectedQuotesForMerge.length > 0 && (
                <span className="ml-2 text-cyan-300">
                  • {selectedQuotesForMerge.filter(s => s.table === activeTab).length} selected in this tab
                </span>
              )}
            </div>
            
            {/* Table Card */}
            <div className="glassmorphic-premium rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-md">
              {loading ? (
                <div className="text-center py-20">
                  <div className="animate-spin text-4xl text-premium-gold mb-4">⏳</div>
                  <p className="text-slate-300">Loading quotations...</p>
                </div>
              ) : error ? (
                <div className="text-center py-20">
                  <div className="text-4xl text-red-400 mb-4">⚠️</div>
                  <p className="text-red-200">{error}</p>
                </div>
              ) : filteredQuotes.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-4xl text-slate-400 mb-4">📋</div>
                  <p className="text-slate-300">No quotations found</p>
                </div>
              ) : (
                activeTab === 'mbcb' ? renderMBCBTable() : renderSignagesTable()
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Details Modal */}
      {isModalOpen && selectedQuote && (
        <QuotationDetailsModal
          quote={selectedQuote}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedQuote(null);
          }}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {quoteToDelete && (
        <DeleteConfirmationModal
          isOpen={deleteConfirmOpen}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          quotationId={quoteToDelete.id}
          customerName={quoteToDelete.customer_name}
        />
      )}
      
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
