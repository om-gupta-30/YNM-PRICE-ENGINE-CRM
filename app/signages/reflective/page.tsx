'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import SmartDropdown from '@/components/forms/SmartDropdown';
import SubAccountSelect from '@/components/forms/SubAccountSelect';
import AccountSelect from '@/components/forms/AccountSelect';
import ContactSelect from '@/components/forms/ContactSelect';
import StateCitySelect from '@/components/forms/StateCitySelect';
import { PortalPopperContainer } from '@/components/ui/PortalPopperContainer';
import Toast from '@/components/ui/Toast';
import { useUser } from '@/contexts/UserContext';
import { calculateArea, Shape } from '@/lib/calculations/areaCalculations';
import { MS_PIPE_OPTIONS, MsPipeOption } from '@/data/config/msPipeOptions';
import { MS_ANGLE_OPTIONS, MsAngleOption } from '@/data/config/msAngleOptions';

// Dropdown options
const SHAPES: Shape[] = ['Circular', 'Rectangular', 'Triangle', 'Octagonal'];
const SIZE_OPTIONS = [300, 600, 750, 900, 1200, 1500]; // mm

// Board Types - User selects FIRST
export type BoardType = 
  | 'Mandatory Sign Boards'
  | 'Cautionary Sign Boards'
  | 'Informatory Sign Boards'
  | 'Place Identification Boards'
  | 'Advance Direction Boards'
  | 'Overhead Cantilever'
  | 'Overhead Gantry'
  | 'Toll Boards & Facia';

// Reverse mapping: Board Type → Allowed Shapes
const SHAPES_BY_BOARD_TYPE: Record<BoardType, Shape[]> = {
  'Mandatory Sign Boards': ['Circular', 'Octagonal'],
  'Cautionary Sign Boards': ['Triangle'],
  'Informatory Sign Boards': ['Rectangular'],
  'Place Identification Boards': ['Rectangular'],
  'Advance Direction Boards': ['Rectangular'],
  'Overhead Cantilever': ['Rectangular'],
  'Overhead Gantry': ['Rectangular'],
  'Toll Boards & Facia': ['Rectangular'],
};

// All board types for dropdown
const ALL_BOARD_TYPES: BoardType[] = [
  'Mandatory Sign Boards',
  'Cautionary Sign Boards',
  'Informatory Sign Boards',
  'Place Identification Boards',
  'Advance Direction Boards',
  'Overhead Cantilever',
  'Overhead Gantry',
  'Toll Boards & Facia',
];

// Sheeting Types
const SHEETING_TYPES = ['Type 1', 'Type 4', 'Type 11'];

// ACP Thickness options
const ACP_THICKNESS = [3, 4]; // mm

// Printing Types - Updated to include lamination
const PRINTING_TYPES = ['Digital Printing with Lamination', 'Vinyl / EC (Electrocut)'];

// Base Material Cost per sq ft configuration
// Structure: [Sheeting Type][ACP Thickness][Printing Type] = Rate per sq ft
// Note: "Digital Printing with Lamination" includes the lamination cost (+₹30/sq ft)
const BASE_RATES_PER_SQFT: Record<string, Record<string, Record<string, number>>> = {
  'Type 1': {
    '3mm': {
      'Digital Printing with Lamination': 110, // 80 + 30 lamination
      'Vinyl / EC (Electrocut)': 60,
    },
    '4mm': {
      'Digital Printing with Lamination': 120, // 90 + 30 lamination
      'Vinyl / EC (Electrocut)': 70,
    },
  },
  'Type 4': {
    '3mm': {
      'Digital Printing with Lamination': 130, // 100 + 30 lamination
      'Vinyl / EC (Electrocut)': 80,
    },
    '4mm': {
      'Digital Printing with Lamination': 150, // 120 + 30 lamination
      'Vinyl / EC (Electrocut)': 90,
    },
  },
  'Type 11': {
    '3mm': {
      'Digital Printing with Lamination': 180, // 150 + 30 lamination
      'Vinyl / EC (Electrocut)': 120,
    },
    '4mm': {
      'Digital Printing with Lamination': 210, // 180 + 30 lamination
      'Vinyl / EC (Electrocut)': 150,
    },
  },
};

// Helper function to format numbers in Indian numbering system
function formatIndianUnits(value: number): string {
  const formatted = value.toLocaleString('en-IN', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });

  if (value < 100000) {
    return formatted;
  }

  if (value >= 100000 && value < 10000000) {
    const lakhs = value / 100000;
    return `${lakhs.toFixed(1)} Lakhs`;
  }

  const crores = value / 10000000;
  return `${crores.toFixed(1)} Crores`;
}

export default function ReflectivePartPage() {
  const router = useRouter();
  const { username } = useUser();
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Save state
  const [isSaving, setIsSaving] = useState(false);
  
  // Quotation header fields (mandatory)
  const [stateId, setStateId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [stateName, setStateName] = useState<string>('');
  const [cityName, setCityName] = useState<string>('');
  const [quotationDate] = useState<string>(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  });
  const [estimateDate, setEstimateDate] = useState<Date | null>(new Date());
  const [expiryDate, setExpiryDate] = useState<Date | null>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1); // Default to 1 month from today
    return date;
  });
  const [termsAndConditions, setTermsAndConditions] = useState<string>('');
  const [estimateNumber, setEstimateNumber] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [accountName, setAccountName] = useState<string>('');
  const [subAccountId, setSubAccountId] = useState<number | null>(null);
  const [subAccountName, setSubAccountName] = useState<string>('');
  const [contactId, setContactId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState<string>(''); // Contact name
  
  // Check if all quotation fields are filled
  const isQuotationComplete = stateId !== null && 
                               cityId !== null && 
                               quotationDate.trim() !== '' && 
                               estimateDate !== null &&
                               expiryDate !== null &&
                               accountId !== null &&
                               subAccountId !== null &&
                               termsAndConditions.trim() !== '' &&
                               purpose.trim() !== '' && 
                               customerName.trim() !== '' &&
                               contactId !== null;
  
  // Track if quotation information is confirmed
  const [isQuotationConfirmed, setIsQuotationConfirmed] = useState<boolean>(false);
  const [isEditingQuotation, setIsEditingQuotation] = useState<boolean>(false);
  
  // Progressive disclosure steps
  const showDates = stateId !== null && cityId !== null;
  const showAccountSelection = showDates && estimateDate !== null && expiryDate !== null;
  const showCustomerAndPurpose = showAccountSelection && accountId !== null;
  const showTermsAndConditions = showCustomerAndPurpose && subAccountId !== null && contactId !== null && customerName.trim() !== '' && purpose.trim() !== '';
  
  // Fetch estimate number when quotation is confirmed
  useEffect(() => {
    const fetchEstimateNumber = async () => {
      if (isQuotationConfirmed && !estimateNumber && !isEditingQuotation) {
        try {
          const response = await fetch('/api/estimate/next-number', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            const data = await response.json();
            if (data.estimateNumber) {
              setEstimateNumber(data.estimateNumber);
            }
          }
        } catch (error) {
          console.error('Error fetching estimate number:', error);
        }
      }
    };
    
    fetchEstimateNumber();
  }, [isQuotationConfirmed, estimateNumber, isEditingQuotation]);
  
  // Reflective part inputs - Board Type FIRST
  const [boardType, setBoardType] = useState<BoardType | ''>('');
  const [shape, setShape] = useState<Shape | ''>('');
  const [size, setSize] = useState<number>(SIZE_OPTIONS[0]);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  
  // Material & Printing Options
  const [sheetingType, setSheetingType] = useState<string>(SHEETING_TYPES[0]);
  const [acpThickness, setAcpThickness] = useState<number>(ACP_THICKNESS[0]);
  const [printingType, setPrintingType] = useState<string>(PRINTING_TYPES[0]);
  
  // Quantity
  const [quantity, setQuantity] = useState<number>(1);
  
  // Rectangular size history from database
  const [rectangularSizes, setRectangularSizes] = useState<Array<{ width: number; height: number }>>([]);
  
  // MS Part state
  const [msEnabled, setMsEnabled] = useState<boolean>(false);
  const [msPostSpec, setMsPostSpec] = useState<string>('');
  const [msFrameSpec, setMsFrameSpec] = useState<string>('');
  const [msLengths, setMsLengths] = useState<{ postLengthM: number; frameLengthM: number; remarks: string } | null>(null);
  const [msLengthsLoading, setMsLengthsLoading] = useState<boolean>(false);
  
  // Get available shapes for selected board type
  const availableShapes = useMemo(() => {
    if (!boardType) return [];
    return SHAPES_BY_BOARD_TYPE[boardType] || [];
  }, [boardType]);
  
  // Auto-select shape if only one is allowed, or show dropdown if multiple
  const shouldShowShapeDropdown = useMemo(() => {
    return availableShapes.length > 1;
  }, [availableShapes]);
  
  // Auto-select shape when board type changes
  useEffect(() => {
    if (boardType && availableShapes.length === 1) {
      // Auto-select the only allowed shape
      setShape(availableShapes[0]);
    } else if (boardType && availableShapes.length > 1) {
      // Multiple shapes allowed - user must select
      setShape('');
    } else {
      setShape('');
    }
    // Reset size inputs when shape changes
    setSize(SIZE_OPTIONS[0]);
    setWidth(0);
    setHeight(0);
    setBoardSpecsConfirmed(false);
    setPricingConfirmed(false);
  }, [boardType, availableShapes]);
  
  // Load rectangular sizes from database when shape is Rectangular
  useEffect(() => {
    const loadRectangularSizes = async () => {
      // Only load if shape is Rectangular or will be Rectangular
      if (shape === 'Rectangular' || (boardType && SHAPES_BY_BOARD_TYPE[boardType]?.includes('Rectangular'))) {
        try {
          const response = await fetch('/api/signages/rectangular-sizes');
          if (response.ok) {
            const data = await response.json();
            setRectangularSizes(data.sizes || []);
          }
        } catch (error) {
          console.error('Error loading rectangular sizes:', error);
        }
      }
    };
    loadRectangularSizes();
  }, [shape, boardType]);
  
  // Auto-fetch MS lengths when reflective selection is valid and MS is enabled
  useEffect(() => {
    const fetchMsLengths = async () => {
      if (!msEnabled || !shape || !boardType) {
        setMsLengths(null);
        return;
      }
      
      // Build sizeCode based on shape
      let sizeCode = '';
      if (shape === 'Rectangular') {
        if (width > 0 && height > 0) {
          sizeCode = `${width}x${height}`;
        } else {
          setMsLengths(null);
          return;
        }
      } else {
        if (size > 0) {
          sizeCode = String(size);
        } else {
          setMsLengths(null);
          return;
        }
      }
      
      setMsLengthsLoading(true);
      try {
        const response = await fetch('/api/signages/ms-lengths', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shape, sizeCode }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setMsLengths(data);
        } else {
          setMsLengths(null);
        }
      } catch (error) {
        console.error('Error fetching MS lengths:', error);
        setMsLengths(null);
      } finally {
        setMsLengthsLoading(false);
      }
    };
    
    fetchMsLengths();
  }, [msEnabled, shape, size, width, height, boardType]);
  
  // Confirmation states
  const [boardSpecsConfirmed, setBoardSpecsConfirmed] = useState<boolean>(false);
  const [isEditingBoardSpecs, setIsEditingBoardSpecs] = useState<boolean>(false);
  const [pricingConfirmed, setPricingConfirmed] = useState<boolean>(false);
  const [isEditingPricing, setIsEditingPricing] = useState<boolean>(false);
  const [isMsStructureConfirmed, setIsMsStructureConfirmed] = useState<boolean>(false);
  const [isEditingMsStructure, setIsEditingMsStructure] = useState<boolean>(false);
  
  // Helper function to round area with wastage
  // Rules: If decimal > 0.5, round up to next whole number. If decimal 0-0.5, round to 0.5
  const roundAreaWithWastage = (area: number): number => {
    const wholePart = Math.floor(area);
    const decimalPart = area - wholePart;
    
    if (decimalPart === 0) {
      return area; // Already whole number
    } else if (decimalPart === 0.5) {
      return area; // Already 0.5
    } else if (decimalPart > 0.5) {
      return wholePart + 1; // Round up to next whole number
    } else {
      return wholePart + 0.5; // Round to 0.5
    }
  };

  // Calculate area with wastage rounding
  const areaResult = useMemo(() => {
    if (!shape) return null;
    let rawResult;
    if (shape === 'Rectangular') {
      if (width <= 0 || height <= 0) return null;
      rawResult = calculateArea(shape, undefined, width, height);
    } else {
      if (!size || size <= 0) return null;
      rawResult = calculateArea(shape, size);
    }
    
    if (!rawResult) return null;
    
    // Apply wastage rounding to areaSqFt
    const roundedAreaSqFt = roundAreaWithWastage(rawResult.areaSqFt);
    
    // Recalculate areaSqMm and areaSqM based on rounded sq ft (for consistency)
    // Reverse calculation: sq ft → sq m → sq mm
    const roundedAreaSqM = roundedAreaSqFt / 10.7639;
    const roundedAreaSqMm = roundedAreaSqM * 1_000_000;
    
    return {
      areaSqMm: roundedAreaSqMm,
      areaSqM: roundedAreaSqM,
      areaSqFt: roundedAreaSqFt,
    };
  }, [shape, size, width, height]);
  
  // Get base material cost per sq ft from configuration
  // Note: Lamination cost is now included in "Digital Printing with Lamination"
  const baseMaterialCostPerSqFt = useMemo(() => {
    const thicknessKey = `${acpThickness}mm`;
    return BASE_RATES_PER_SQFT[sheetingType]?.[thicknessKey]?.[printingType] || 0;
  }, [sheetingType, acpThickness, printingType]);
  
  // Additional costs per sq ft
  const rivetingPackagingCostPerSqFt = 5; // Always added
  const overheadCostPerSqFt = 15; // Always added
  
  // Calculate total cost per sq ft (before profit)
  const totalCostPerSqFt = useMemo(() => {
    return baseMaterialCostPerSqFt + rivetingPackagingCostPerSqFt + overheadCostPerSqFt;
  }, [baseMaterialCostPerSqFt, rivetingPackagingCostPerSqFt, overheadCostPerSqFt]);
  
  // Calculate profit amount per sq ft
  const profitPerSqFt = useMemo(() => {
    return totalCostPerSqFt * 0.1; // 10% profit
  }, [totalCostPerSqFt]);
  
  // Final rate per sq ft (with profit)
  const finalRatePerSqFt = useMemo(() => {
    return totalCostPerSqFt + profitPerSqFt;
  }, [totalCostPerSqFt, profitPerSqFt]);
  
  // Calculate costs (all in sq ft) with 10% profit
  const costPerPiece = useMemo(() => {
    if (!areaResult || totalCostPerSqFt === 0) return null;
    
    // Base cost = area × total cost per sq ft
    const baseCost = areaResult.areaSqFt * totalCostPerSqFt;
    
    // Add 10% profit
    return baseCost * 1.1;
  }, [areaResult, totalCostPerSqFt]);
  
  const finalTotal = useMemo(() => {
    if (!costPerPiece || quantity <= 0) return null;
    return costPerPiece * quantity;
  }, [costPerPiece, quantity]);
  
  // MS Part calculations
  const selectedPost = useMemo(() => {
    return MS_PIPE_OPTIONS.find(p => p.id === msPostSpec || p.label === msPostSpec);
  }, [msPostSpec]);
  
  const selectedAngle = useMemo(() => {
    return MS_ANGLE_OPTIONS.find(a => a.id === msFrameSpec || a.label === msFrameSpec);
  }, [msFrameSpec]);
  
  const postWeightPerPieceKg = useMemo(() => {
    if (!msEnabled || !msLengths || !selectedPost) return 0;
    return msLengths.postLengthM * selectedPost.weightKgPerM;
  }, [msEnabled, msLengths, selectedPost]);
  
  const frameWeightPerPieceKg = useMemo(() => {
    if (!msEnabled || !msLengths || !selectedAngle || msLengths.frameLengthM <= 0) return 0;
    return msLengths.frameLengthM * selectedAngle.weightKgPerM;
  }, [msEnabled, msLengths, selectedAngle]);
  
  const totalMsWeightPerPieceKg = useMemo(() => {
    return postWeightPerPieceKg + frameWeightPerPieceKg;
  }, [postWeightPerPieceKg, frameWeightPerPieceKg]);
  
  // Determine rate per kg based on board type
  const msRatePerKg = useMemo(() => {
    if (!boardType) return 110; // Default
    const isAdsOrOverhead = boardType === 'Advance Direction Boards' || 
                           boardType === 'Overhead Gantry' || 
                           boardType === 'Overhead Cantilever';
    return isAdsOrOverhead ? 100 : 110;
  }, [boardType]);
  
  // Cost weight: for ADS/Overhead, use post weight only; otherwise use total MS weight
  const costWeightKg = useMemo(() => {
    if (!msEnabled) return 0;
    const isAdsOrOverhead = boardType === 'Advance Direction Boards' || 
                           boardType === 'Overhead Gantry' || 
                           boardType === 'Overhead Cantilever';
    return isAdsOrOverhead ? postWeightPerPieceKg : totalMsWeightPerPieceKg;
  }, [msEnabled, boardType, postWeightPerPieceKg, totalMsWeightPerPieceKg]);
  
  const msCostPerStructure = useMemo(() => {
    if (!msEnabled || costWeightKg <= 0) return 0;
    return costWeightKg * msRatePerKg;
  }, [msEnabled, costWeightKg, msRatePerKg]);
  
  const totalMsCost = useMemo(() => {
    if (!msEnabled || msCostPerStructure <= 0 || quantity <= 0) return 0;
    return msCostPerStructure * quantity;
  }, [msEnabled, msCostPerStructure, quantity]);
  
  // Combined total (reflective + MS)
  const combinedTotal = useMemo(() => {
    if (!finalTotal) return null;
    return finalTotal + totalMsCost;
  }, [finalTotal, totalMsCost]);
  
  // Confirm handlers
  const handleConfirmBoardSpecs = () => {
    if (shape === 'Rectangular') {
      if (width <= 0 || height <= 0) {
        setToast({ message: 'Please enter valid width and height', type: 'error' });
        return;
      }
    } else {
      if (!size || size <= 0) {
        setToast({ message: 'Please select a valid size', type: 'error' });
        return;
      }
    }
    if (!boardType) {
      setToast({ message: 'Please select a board type', type: 'error' });
      return;
    }
    setBoardSpecsConfirmed(true);
    // Reset pricing confirmation when board specs change
    setPricingConfirmed(false);
  };
  
  const handleConfirmPricing = () => {
    if (!areaResult) {
      setToast({ message: 'Please confirm board specifications first', type: 'error' });
      return;
    }
    if (quantity <= 0) {
      setToast({ message: 'Please enter a valid quantity', type: 'error' });
      return;
    }
    if (baseMaterialCostPerSqFt === 0) {
      setToast({ message: 'Please select all material options', type: 'error' });
      return;
    }
    setPricingConfirmed(true);
  };
  
  // Handle rectangular size selection from history
  const handleSelectRectangularSize = (selectedWidth: number, selectedHeight: number) => {
    setWidth(selectedWidth);
    setHeight(selectedHeight);
    setBoardSpecsConfirmed(false);
    setPricingConfirmed(false);
  };
  
  // Save new rectangular size when quotation is saved (using UPSERT to prevent duplicates)
  const saveRectangularSize = async (width: number, height: number) => {
    if (shape !== 'Rectangular' || width <= 0 || height <= 0) return;
    
    try {
      const response = await fetch('/api/signages/rectangular-sizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ width, height }),
      });
      
      if (response.ok) {
        // Reload sizes to include the new one (if it was actually new)
        const data = await fetch('/api/signages/rectangular-sizes');
        if (data.ok) {
          const sizesData = await data.json();
          setRectangularSizes(sizesData.sizes || []);
        }
      }
    } catch (error) {
      console.error('Error saving rectangular size:', error);
    }
  };
  
  // Save quotation
  const handleSaveQuotation = async () => {
    if (!isQuotationComplete) {
      setToast({ message: 'Please complete all quotation details', type: 'error' });
      return;
    }
    
    if (!areaResult || !costPerPiece || !finalTotal) {
      setToast({ message: 'Please complete all calculation fields', type: 'error' });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const currentUsername = username || (typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin');
      
      // Save meta fields (customers, purposes) to database ONLY when saving quotation
      // State and City are already in the database, no need to save them
      if (customerName.trim()) {
        // Determine sales employee from current user
        const currentUsername = username || (typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin');
        const salesEmployee = (currentUsername === 'Employee1' || currentUsername === 'Employee2' || currentUsername === 'Employee3') 
          ? currentUsername 
          : 'Admin';
        
        await fetch('/api/meta/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            value: customerName.trim(),
            salesEmployee: salesEmployee
          }),
        });
      }
      // Purpose is not saved to database - only customer and place are saved
      
      // Save rectangular size if it's new
      if (shape === 'Rectangular' && width > 0 && height > 0) {
        await saveRectangularSize(width, height);
      }
      
      // Validate MS Part if enabled
      if (msEnabled) {
        if (!msPostSpec) {
          setToast({ message: 'Please select Post Specification for MS Structure', type: 'error' });
          setIsSaving(false);
          return;
        }
        if (msLengths && msLengths.frameLengthM > 0 && !msFrameSpec) {
          setToast({ message: 'Please select Frame Specification for MS Structure', type: 'error' });
          setIsSaving(false);
          return;
        }
      }
      
      const rawPayload = {
        boardType,
        shape,
        size: shape === 'Rectangular' ? null : size,
        width: shape === 'Rectangular' ? width : null,
        height: shape === 'Rectangular' ? height : null,
        sheetingType,
        acpThickness,
        printingType,
        areaSqMm: areaResult.areaSqMm,
        areaSqM: areaResult.areaSqM,
        areaSqFt: areaResult.areaSqFt,
        baseMaterialCostPerSqFt,
        rivetingPackagingCostPerSqFt,
        overheadCostPerSqFt,
        totalCostPerSqFt,
        profitPercent: 10,
        quantity,
        costPerPiece,
        // MS Part fields
        msEnabled,
        msPostSpec: msEnabled ? msPostSpec : null,
        msFrameSpec: msEnabled ? msFrameSpec : null,
        msPostLengthM: msEnabled && msLengths ? msLengths.postLengthM : null,
        msFrameLengthM: msEnabled && msLengths ? msLengths.frameLengthM : null,
        msPostWeightKg: msEnabled ? postWeightPerPieceKg : null,
        msFrameWeightKg: msEnabled ? frameWeightPerPieceKg : null,
        msTotalMsWeightKg: msEnabled ? totalMsWeightPerPieceKg : null,
        msRatePerKg: msEnabled ? msRatePerKg : null,
        msCostPerStructure: msEnabled ? msCostPerStructure : null,
        msTotalMsCost: msEnabled ? totalMsCost : null,
        subAccountId,
        subAccountName,
        contactId,
        contactName: customerName || '',
      };
      
      // Convert DD/MM/YYYY to YYYY-MM-DD for database
      let dateForDb = quotationDate;
      if (quotationDate.includes('/')) {
        const [day, month, year] = quotationDate.split('/');
        dateForDb = `${year}-${month}-${day}`;
      }
      
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section: 'Signages - Reflective',
          state_id: stateId,
          city_id: cityId,
          account_id: accountId, // Add account ID
          sub_account_id: subAccountId,
          customer_name: customerName || subAccountName, // Contact name
          sub_account_name: subAccountName, // Actual sub-account name
          purpose: purpose,
          date: dateForDb,
          quantity_rm: null,
          total_weight_per_rm: null,
          total_cost_per_rm: costPerPiece,
          final_total_cost: combinedTotal || finalTotal,
          raw_payload: rawPayload,
          created_by: currentUsername,
          is_saved: true,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        setToast({ message: errorData.error || 'Error saving quotation', type: 'error' });
        return;
      }
      
      setToast({ message: 'Quotation saved successfully', type: 'success' });
    } catch (error) {
      console.error('Error saving quotation:', error);
      setToast({ message: 'Error saving quotation. Please try again.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };
  
  
  return (
    <div className="min-h-screen flex flex-col items-start py-12 pt-16 pb-32 relative">
      
      <div className="w-full max-w-6xl mx-auto px-4">
        {/* Quotation Information Card - Uniform Style */}
        <div className="glassmorphic-premium rounded-3xl p-12 animate-fade-up card-hover-gold mb-10 card-3d card-depth" style={{ overflow: 'visible' }}>
          <h2 className="text-3xl font-extrabold text-white mb-3 drop-shadow-lg">Quotation Information</h2>
          <p className="text-sm text-slate-300 mb-8">Enter quotation details. You can type manually or select from dropdown suggestions.</p>
          
          {!isQuotationComplete && (
            <div className="mb-6 p-4 bg-amber-500/20 border border-amber-400/50 rounded-xl backdrop-blur-sm animate-fade-up">
              <p className="text-amber-200 text-sm font-medium flex items-center space-x-2">
                <span>⚠️</span>
                <span>Please complete the mandatory quotation details to proceed.</span>
              </p>
            </div>
          )}
          
          {isQuotationComplete && !isQuotationConfirmed && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setIsQuotationConfirmed(true)}
                className="btn-premium-gold btn-ripple btn-press btn-3d px-8 py-3 text-lg shimmer relative overflow-hidden"
                style={{
                  boxShadow: '0 0 20px rgba(209, 168, 90, 0.3)',
                }}
              >
                ✓ Confirm Quotation Information
              </button>
            </div>
          )}
          
          {isQuotationConfirmed && !isEditingQuotation && (
            <div className="mt-6 p-4 bg-green-500/20 border border-green-400/50 rounded-xl backdrop-blur-sm animate-fade-up flex items-center justify-between">
              <p className="text-green-200 text-sm font-medium flex items-center space-x-2">
                <span>✓</span>
                <span>Quotation information confirmed. You can now proceed with the quotation details below.</span>
              </p>
              <button
                onClick={() => {
                  setIsEditingQuotation(true);
                  setIsQuotationConfirmed(false);
                }}
                className="btn-premium-gold btn-ripple btn-press btn-3d px-4 py-2 text-sm ml-4"
                style={{
                  boxShadow: '0 0 15px rgba(209, 168, 90, 0.3)',
                }}
              >
                ✏️ Edit
              </button>
            </div>
          )}
          
          {/* Step 1: State and City */}
          <div className="mb-6">
            <StateCitySelect
              stateId={stateId}
              cityId={cityId}
              onStateChange={(id, name) => {
                setStateId(id);
                setStateName(name);
                setIsQuotationConfirmed(false);
                setIsEditingQuotation(false);
              }}
              onCityChange={(id, name) => {
                setCityId(id);
                setCityName(name);
                setIsQuotationConfirmed(false);
                setIsEditingQuotation(false);
              }}
              required
              disabled={isQuotationConfirmed && !isEditingQuotation}
            />
            {(!stateId || !cityId) && (
              <p className="text-amber-300 text-xs mt-2">Please select state and city to continue</p>
            )}
          </div>
          
          {/* Step 2: Dates - Show after Place of Supply is selected */}
          {showDates && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-fade-up" style={{ transform: 'none', backdropFilter: 'none', filter: 'none', mixBlendMode: 'normal' }}>
              <div style={{ transform: 'none', backdropFilter: 'none', filter: 'none', mixBlendMode: 'normal' }}>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Estimate Date <span className="text-red-400">*</span>
                </label>
                <DatePicker
                  selected={estimateDate}
                  onChange={(date: Date | null) => {
                    setEstimateDate(date);
                    setIsQuotationConfirmed(false);
                    setIsEditingQuotation(false);
                  }}
                  dateFormat="dd/MM/yyyy"
                  className="input-premium input-focus-glow w-full px-4 py-3 text-white placeholder-slate-400"
                  wrapperClassName="w-full"
                  popperPlacement="bottom-start"
                  popperContainer={PortalPopperContainer}
                  disabled={isQuotationConfirmed && !isEditingQuotation}
                />
              </div>
              
              <div style={{ transform: 'none', backdropFilter: 'none', filter: 'none', mixBlendMode: 'normal' }}>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Expiry Date <span className="text-red-400">*</span>
                </label>
                <DatePicker
                  selected={expiryDate}
                  onChange={(date: Date | null) => {
                    setExpiryDate(date);
                    setIsQuotationConfirmed(false);
                    setIsEditingQuotation(false);
                  }}
                  dateFormat="dd/MM/yyyy"
                  className="input-premium input-focus-glow w-full px-4 py-3 text-white placeholder-slate-400"
                  wrapperClassName="w-full"
                  popperPlacement="bottom-start"
                  popperContainer={PortalPopperContainer}
                  disabled={isQuotationConfirmed && !isEditingQuotation}
                />
              </div>
              {(!estimateDate || !expiryDate) && (
                <div className="md:col-span-2">
                  <p className="text-amber-300 text-xs mt-2">Please select both dates to continue</p>
                </div>
              )}
            </div>
          )}
          
          {/* Step 3: Account Selection - Show after both dates are selected */}
          {showAccountSelection && (
            <div className="mb-6 animate-fade-up">
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Account Name <span className="text-red-400">*</span>
              </label>
              <AccountSelect
                value={accountId}
                onChange={(id, name) => {
                  setAccountId(id);
                  setAccountName(name);
                  setSubAccountId(null);
                  setSubAccountName('');
                  setContactId(null);
                  setCustomerName(''); // Clear contact when account changes
                  setIsQuotationConfirmed(false);
                  setIsEditingQuotation(false);
                }}
                employeeUsername={username || ''}
                required
                disabled={isQuotationConfirmed && !isEditingQuotation}
              />
              {!accountId && (
                <p className="text-amber-300 text-xs mt-2">Please select an account to continue</p>
              )}
            </div>
          )}

          {/* Step 4: Sub Account Name and Purpose - Show after account is selected */}
          {showCustomerAndPurpose && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-fade-up">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Sub Account Name <span className="text-red-400">*</span>
                </label>
                <SubAccountSelect
                  value={subAccountId}
                  onChange={(selectedId, subName) => {
                    setSubAccountId(selectedId);
                    setSubAccountName(subName || '');
                    setContactId(null);
                    setCustomerName('');
                    setIsQuotationConfirmed(false);
                    setIsEditingQuotation(false);
                  }}
                  employeeUsername={username || ''}
                  accountId={accountId}
                  required
                  disabled={isQuotationConfirmed && !isEditingQuotation}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Purpose <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => {
                    setPurpose(e.target.value);
                    setIsQuotationConfirmed(false);
                    setIsEditingQuotation(false);
                  }}
                  placeholder="Enter purpose"
                  className="input-premium input-focus-glow w-full px-4 py-3 text-white placeholder-slate-400"
                  disabled={isQuotationConfirmed && !isEditingQuotation}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Contact <span className="text-red-400">*</span>
                </label>
                <ContactSelect
                  subAccountId={subAccountId}
                  value={contactId}
                  onChange={(selectedId, contactNameValue) => {
                    setContactId(selectedId);
                    setCustomerName(contactNameValue || '');
                    setIsQuotationConfirmed(false);
                    setIsEditingQuotation(false);
                  }}
                  required
                  disabled={!subAccountId || (isQuotationConfirmed && !isEditingQuotation)}
                />
              </div>

              {(!subAccountName.trim() || !purpose.trim() || !customerName.trim()) && (
                <div className="md:col-span-2">
                  <p className="text-amber-300 text-xs mt-2">Please fill all fields to continue</p>
                </div>
              )}
            </div>
          )}
          
          {/* Step 4: Terms and Conditions - Show after Customer Name and Purpose are filled */}
          {showTermsAndConditions && (
            <div className="mt-6 animate-fade-up">
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Terms and Conditions <span className="text-red-400">*</span>
              </label>
              <textarea
                value={termsAndConditions}
                onChange={(e) => {
                  setTermsAndConditions(e.target.value);
                  setIsQuotationConfirmed(false);
                  setIsEditingQuotation(false);
                }}
                placeholder="Enter terms and conditions for this quotation (Mandatory)"
                rows={4}
                required
                className="input-premium input-focus-glow w-full px-4 py-3 text-white placeholder-slate-400 resize-none"
                disabled={isQuotationConfirmed && !isEditingQuotation}
              />
              {!termsAndConditions.trim() && (
                <p className="text-red-400 text-xs mt-1">Terms and Conditions is required</p>
              )}
            </div>
          )}
        </div>

        {/* Input Cards - Only show when quotation is confirmed */}
        {isQuotationConfirmed && (
        <div className="space-y-10 mb-10">
          {/* Board Specifications Card */}
          <div className="glassmorphic-premium rounded-3xl p-12 animate-fade-up card-hover-gold card-3d card-depth">
            <h2 className="text-3xl font-extrabold text-white mb-3 drop-shadow-lg">Board Specifications</h2>
            <p className="text-sm text-slate-300 mb-8">Enter board specifications to calculate area.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Type of Board - FIRST */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Type of Board <span className="text-red-400">*</span>
                </label>
                <select
                  value={boardType}
                  onChange={(e) => {
                    setBoardType(e.target.value as BoardType);
                    setBoardSpecsConfirmed(false);
                    setIsEditingBoardSpecs(false);
                    setPricingConfirmed(false);
                  }}
                  className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                  disabled={boardSpecsConfirmed && !isEditingBoardSpecs}
                >
                  <option value="">Select Type of Board</option>
                  {ALL_BOARD_TYPES.map(bt => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>
              
              {/* Shape - Always show, but disabled when auto-selected */}
              {boardType && (
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Shape of Board <span className="text-red-400">*</span>
                    {!shouldShowShapeDropdown && shape && (
                      <span className="text-xs text-slate-400 ml-2">(Auto-selected)</span>
                    )}
                  </label>
                  <select
                    value={shape}
                    onChange={(e) => {
                      setShape(e.target.value as Shape);
                      setBoardSpecsConfirmed(false);
                      setIsEditingBoardSpecs(false);
                      setPricingConfirmed(false);
                    }}
                    disabled={!shouldShowShapeDropdown || (boardSpecsConfirmed && !isEditingBoardSpecs)}
                    className={`input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white ${
                      !shouldShowShapeDropdown || (boardSpecsConfirmed && !isEditingBoardSpecs) ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  >
                    {shouldShowShapeDropdown ? (
                      <>
                        <option value="">Select Shape</option>
                        {availableShapes.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </>
                    ) : (
                      <option value={shape}>{shape}</option>
                    )}
                  </select>
                </div>
              )}
              
              {/* Size Input - Conditional (only show if shape is selected) */}
              {shape && shape !== 'Rectangular' ? (
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Size (mm) <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={size}
                    onChange={(e) => {
                      setSize(Number(e.target.value));
                      setBoardSpecsConfirmed(false);
                      setIsEditingBoardSpecs(false);
                      setPricingConfirmed(false);
                    }}
                    className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                    disabled={boardSpecsConfirmed && !isEditingBoardSpecs}
                  >
                    {SIZE_OPTIONS.map(s => (
                      <option key={s} value={s}>{s} mm</option>
                    ))}
                  </select>
                </div>
              ) : shape === 'Rectangular' ? (
                <>
                  {/* Rectangular Size History Dropdown */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Select from Saved Sizes (Optional)
                    </label>
                    <select
                      value={rectangularSizes.find(sz => sz.width === width && sz.height === height) 
                        ? `${width}x${height}` 
                        : ''}
                      onChange={(e) => {
                        if (e.target.value && e.target.value !== 'new') {
                          const [w, h] = e.target.value.split('x').map(Number);
                          handleSelectRectangularSize(w, h);
                        } else if (e.target.value === 'new') {
                          // User wants to enter new size manually
                          setWidth(0);
                          setHeight(0);
                          setBoardSpecsConfirmed(false);
                          setPricingConfirmed(false);
                        }
                      }}
                      className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                    >
                      <option value="">Select from saved sizes...</option>
                      {rectangularSizes.length > 0 && (
                        <>
                          {rectangularSizes.map((sz, idx) => (
                            <option key={idx} value={`${sz.width}x${sz.height}`}>
                              {sz.width} × {sz.height} mm
                            </option>
                          ))}
                          <option value="new">--- Enter new size manually ---</option>
                        </>
                      )}
                      {rectangularSizes.length === 0 && (
                        <option value="new" disabled>No saved sizes yet</option>
                      )}
                    </select>
                    {rectangularSizes.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        Select a saved size to auto-fill, or choose "Enter new size manually"
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Width (mm) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={width || ''}
                      onChange={(e) => {
                        setWidth(Number(e.target.value));
                        setBoardSpecsConfirmed(false);
                        setIsEditingBoardSpecs(false);
                        setPricingConfirmed(false);
                      }}
                      placeholder="Enter width"
                      min="1"
                      className="input-premium input-focus-glow w-full px-6 py-4 text-white placeholder-slate-400"
                      disabled={boardSpecsConfirmed && !isEditingBoardSpecs}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Height (mm) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={height || ''}
                      onChange={(e) => {
                        setHeight(Number(e.target.value));
                        setBoardSpecsConfirmed(false);
                        setIsEditingBoardSpecs(false);
                        setPricingConfirmed(false);
                      }}
                      placeholder="Enter height"
                      min="1"
                      className="input-premium input-focus-glow w-full px-6 py-4 text-white placeholder-slate-400"
                      disabled={boardSpecsConfirmed && !isEditingBoardSpecs}
                    />
                  </div>
                </>
              ) : null}
              
              {/* Type of Sheeting */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Type of Sheeting <span className="text-red-400">*</span>
                </label>
                <select
                  value={sheetingType}
                  onChange={(e) => {
                    setSheetingType(e.target.value);
                    setBoardSpecsConfirmed(false);
                    setIsEditingBoardSpecs(false);
                    setPricingConfirmed(false);
                  }}
                  className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                  disabled={boardSpecsConfirmed && !isEditingBoardSpecs}
                >
                  {SHEETING_TYPES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              
              {/* ACP Thickness */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Thickness of ACP (mm) <span className="text-red-400">*</span>
                </label>
                <select
                  value={acpThickness}
                  onChange={(e) => {
                    setAcpThickness(Number(e.target.value));
                    setBoardSpecsConfirmed(false);
                    setIsEditingBoardSpecs(false);
                    setPricingConfirmed(false);
                  }}
                  className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                  disabled={boardSpecsConfirmed && !isEditingBoardSpecs}
                >
                  {ACP_THICKNESS.map(th => (
                    <option key={th} value={th}>{th} mm</option>
                  ))}
                </select>
              </div>
              
              {/* Type of Printing / Pasting */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Type of Printing / Pasting <span className="text-red-400">*</span>
                </label>
                <select
                  value={printingType}
                  onChange={(e) => {
                    setPrintingType(e.target.value);
                    setBoardSpecsConfirmed(false);
                    setIsEditingBoardSpecs(false);
                    setPricingConfirmed(false);
                  }}
                  className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                  disabled={boardSpecsConfirmed && !isEditingBoardSpecs}
                >
                  {PRINTING_TYPES.map(pt => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </select>
              </div>
            </div>

            {(!boardSpecsConfirmed || isEditingBoardSpecs) && (
              <button
                onClick={() => {
                  handleConfirmBoardSpecs();
                  setIsEditingBoardSpecs(false);
                }}
                className="btn-premium-gold btn-ripple btn-press btn-3d px-8 py-3 text-lg shimmer relative overflow-hidden"
                style={{
                  boxShadow: '0 0 20px rgba(209, 168, 90, 0.3)',
                }}
              >
                ✓ Confirm Board Specifications
              </button>
            )}

            {/* Board Specifications Results */}
            {boardSpecsConfirmed && areaResult && !isEditingBoardSpecs && (
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="space-y-2 mb-4">
                  <p className="text-slate-200">
                    <span className="font-semibold">Area (sq mm):</span>{' '}
                    <span className="text-white font-bold">{areaResult.areaSqMm.toFixed(2)} sq mm</span>
                  </p>
                  <p className="text-slate-200">
                    <span className="font-semibold">Area (sq m):</span>{' '}
                    <span className="text-white font-bold">{areaResult.areaSqM.toFixed(4)} sq m</span>
                  </p>
                  <p className="text-slate-200">
                    <span className="font-semibold">Area (sq ft):</span>{' '}
                    <span className="text-premium-gold font-extrabold text-xl drop-shadow-lg">
                      {areaResult.areaSqFt % 1 === 0 ? areaResult.areaSqFt.toFixed(0) : areaResult.areaSqFt.toFixed(1)} sq ft
                      <span className="text-xs text-slate-400 ml-2">(with wastage)</span>
                    </span>
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-green-200 text-sm font-medium flex items-center space-x-2">
                    <span>✓</span>
                    <span>Board specifications confirmed.</span>
                  </p>
                  <button
                    onClick={() => {
                      setIsEditingBoardSpecs(true);
                      setBoardSpecsConfirmed(false);
                    }}
                    className="btn-premium-gold btn-ripple btn-press btn-3d px-4 py-2 text-sm"
                    style={{
                      boxShadow: '0 0 15px rgba(209, 168, 90, 0.3)',
                    }}
                  >
                    ✏️ Edit
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Card */}
          <div className="glassmorphic rounded-3xl p-10 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <h2 className="text-3xl font-extrabold text-white mb-3 drop-shadow-lg">Pricing</h2>
            <p className="text-sm text-slate-300 mb-8">Enter quantity. All calculations are in square feet (sq ft).</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Quantity (number of boards) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={quantity || ''}
                  onChange={(e) => {
                    setQuantity(Number(e.target.value));
                    setPricingConfirmed(false);
                    setIsEditingPricing(false);
                  }}
                  placeholder="Enter quantity"
                  min="1"
                  className="input-premium w-full px-6 py-4 text-white placeholder-slate-400"
                  disabled={pricingConfirmed && !isEditingPricing}
                />
              </div>
              
              {/* Display Cost Breakdown */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Cost Breakdown per sq ft
                </label>
                {baseMaterialCostPerSqFt > 0 ? (
                  <div className="p-4 bg-white/5 rounded-xl border border-premium-gold/30 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Base Material:</span>
                      <span className="text-white">₹{baseMaterialCostPerSqFt.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Riveting & Packaging:</span>
                      <span className="text-white">₹{rivetingPackagingCostPerSqFt.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Overhead:</span>
                      <span className="text-white">₹{overheadCostPerSqFt.toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-white/20 flex justify-between">
                      <span className="text-slate-200 font-semibold">Subtotal:</span>
                      <span className="text-premium-gold font-bold">₹{totalCostPerSqFt.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-200 font-semibold">+ 10% Profit:</span>
                      <span className="text-premium-gold font-bold">₹{profitPerSqFt.toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-premium-gold/30 flex justify-between">
                      <span className="text-white font-bold">Final Rate per sq ft:</span>
                      <span className="text-premium-gold font-extrabold text-lg">₹{finalRatePerSqFt.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 italic">
                      Note: This is the rate per square foot. Cost per piece = Area (sq ft) × Final Rate
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-sm text-slate-400">Select material options above</p>
                  </div>
                )}
              </div>
            </div>

            {(!pricingConfirmed || isEditingPricing) && (
              <button
                onClick={() => {
                  handleConfirmPricing();
                  setIsEditingPricing(false);
                }}
                className="btn-premium-gold btn-ripple btn-press btn-3d px-8 py-3 text-lg shimmer relative overflow-hidden"
                style={{
                  boxShadow: '0 0 20px rgba(209, 168, 90, 0.3)',
                }}
              >
                ✓ Confirm Pricing
              </button>
            )}

            {/* Pricing Results */}
            {pricingConfirmed && costPerPiece && finalTotal && !isEditingPricing && (
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="space-y-2 mb-4">
                  <p className="text-slate-200">
                    <span className="font-semibold">Cost Per Piece:</span>{' '}
                    <span className="text-white font-bold">₹{costPerPiece.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                  <p className="text-slate-200">
                    <span className="font-semibold">Quantity:</span>{' '}
                    <span className="text-white font-bold">{quantity} boards</span>
                  </p>
                  <p className="text-slate-200 pt-2 border-t border-white/10">
                    <span className="font-semibold">Final Total:</span>{' '}
                    <span className="text-premium-gold font-extrabold text-xl drop-shadow-lg">₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-green-200 text-sm font-medium flex items-center space-x-2">
                    <span>✓</span>
                    <span>Pricing confirmed.</span>
                  </p>
                  <button
                    onClick={() => {
                      setIsEditingPricing(true);
                      setPricingConfirmed(false);
                    }}
                    className="btn-premium-gold btn-ripple btn-press btn-3d px-4 py-2 text-sm"
                    style={{
                      boxShadow: '0 0 15px rgba(209, 168, 90, 0.3)',
                    }}
                  >
                    ✏️ Edit
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* MS Part Card - Shows when board specs are confirmed */}
          {boardSpecsConfirmed && (
            <div className="glassmorphic-premium rounded-3xl p-12 animate-fade-up card-hover-gold card-3d card-depth">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-extrabold text-white drop-shadow-lg">MS Structure</h2>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={msEnabled}
                    onChange={(e) => {
                      setMsEnabled(e.target.checked);
                      if (!e.target.checked) {
                        setMsPostSpec('');
                        setMsFrameSpec('');
                        setMsLengths(null);
                      }
                    }}
                    className="w-6 h-6 rounded border-2 border-premium-gold bg-white/5 text-premium-gold focus:ring-2 focus:ring-premium-gold focus:ring-offset-2 focus:ring-offset-[#1A103C]"
                  />
                  <span className="text-slate-200 font-semibold">Include MS Structure</span>
                </label>
              </div>
              
              {msEnabled && (
                <>
                  {msLengthsLoading ? (
                    <div className="text-center py-8">
                      <p className="text-slate-300">Loading MS structure data...</p>
                    </div>
                  ) : msLengths ? (
                    <>
                      {/* MS Lengths Display (Read-only) */}
                      <div className="mb-6 p-4 bg-white/5 rounded-xl border border-premium-gold/30">
                        <h3 className="text-lg font-bold text-white mb-4">Structure Lengths</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-slate-300 mb-1">Post Length</p>
                            <p className="text-xl font-bold text-white">{msLengths.postLengthM.toFixed(2)} m</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-300 mb-1">Frame Length</p>
                            <p className="text-xl font-bold text-white">
                              {msLengths.frameLengthM > 0 ? `${msLengths.frameLengthM.toFixed(2)} m` : 'N/A'}
                            </p>
                          </div>
                          {msLengths.remarks && (
                            <div className="md:col-span-2">
                              <p className="text-sm text-slate-300 mb-1">Remarks</p>
                              <p className="text-sm font-semibold text-premium-gold">{msLengths.remarks}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Post Spec Selection */}
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-slate-200 mb-2">
                          Post Specification <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={msPostSpec}
                          onChange={(e) => {
                            setMsPostSpec(e.target.value);
                            setIsMsStructureConfirmed(false);
                            setIsEditingMsStructure(false);
                          }}
                          className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                          disabled={isMsStructureConfirmed && !isEditingMsStructure}
                        >
                          <option value="">Select Post Spec</option>
                          {MS_PIPE_OPTIONS.map(pipe => (
                            <option key={pipe.id} value={pipe.id}>
                              {pipe.label} ({pipe.weightKgPerM} kg/m)
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Frame Spec Selection (only if frame length > 0) */}
                      {msLengths.frameLengthM > 0 ? (
                        <div className="mb-6">
                          <label className="block text-sm font-semibold text-slate-200 mb-2">
                            Frame Specification <span className="text-red-400">*</span>
                          </label>
                          <select
                            value={msFrameSpec}
                            onChange={(e) => {
                              setMsFrameSpec(e.target.value);
                              setIsMsStructureConfirmed(false);
                              setIsEditingMsStructure(false);
                            }}
                            className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                            disabled={isMsStructureConfirmed && !isEditingMsStructure}
                          >
                            <option value="">Select Frame Spec</option>
                            {MS_ANGLE_OPTIONS.map(angle => (
                              <option key={angle.id} value={angle.id}>
                                {angle.label} ({angle.weightKgPerM} kg/m)
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                          <p className="text-slate-300 text-sm">Frame not applicable for this board type</p>
                        </div>
                      )}
                      
                      {/* MS Cost Summary */}
                      {msPostSpec && (msLengths.frameLengthM <= 0 || msFrameSpec) && (
                        <div className="mt-6 pt-6 border-t border-white/20">
                          <h3 className="text-lg font-bold text-white mb-4">MS Structure Cost Summary</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-300">Post Weight per piece:</span>
                              <span className="text-white font-bold">
                                {postWeightPerPieceKg.toFixed(2)} kg
                                {selectedPost && ` (${msLengths.postLengthM.toFixed(2)} m × ${selectedPost.weightKgPerM} kg/m)`}
                              </span>
                            </div>
                            {msLengths.frameLengthM > 0 && selectedAngle && (
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-300">Frame Weight per piece:</span>
                                <span className="text-white font-bold">
                                  {frameWeightPerPieceKg.toFixed(2)} kg
                                  {` (${msLengths.frameLengthM.toFixed(2)} m × ${selectedAngle.weightKgPerM} kg/m)`}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                              <span className="text-slate-200 font-semibold">Total MS Weight per piece:</span>
                              <span className="text-white font-bold">{totalMsWeightPerPieceKg.toFixed(2)} kg</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-300">Rate per kg:</span>
                              <span className="text-white font-bold">
                                ₹{msRatePerKg} / kg
                                {boardType && (
                                  <span className="text-xs text-slate-400 ml-2">
                                    ({boardType === 'Advance Direction Boards' || boardType === 'Overhead Gantry' || boardType === 'Overhead Cantilever' ? 'ADS/Overhead' : 'Standard'} scheme)
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-300">Cost Weight (for pricing):</span>
                              <span className="text-white font-bold">{costWeightKg.toFixed(2)} kg</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t border-premium-gold/30">
                              <span className="text-premium-gold font-bold">Cost per structure:</span>
                              <span className="text-premium-gold font-extrabold text-lg">
                                ₹{msCostPerStructure.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t border-premium-gold/30">
                              <span className="text-premium-gold font-bold">Total MS Cost ({quantity} structures):</span>
                              <span className="text-premium-gold font-extrabold text-lg">
                                ₹{totalMsCost.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Confirm MS Structure Button */}
                          {(!isMsStructureConfirmed || isEditingMsStructure) && (
                            <div className="mt-6 flex justify-center">
                              <button
                                onClick={() => {
                                  setIsMsStructureConfirmed(true);
                                  setIsEditingMsStructure(false);
                                }}
                                className="btn-premium-gold btn-ripple btn-press btn-3d px-8 py-3 text-lg shimmer relative overflow-hidden"
                                style={{
                                  boxShadow: '0 0 20px rgba(209, 168, 90, 0.3)',
                                }}
                              >
                                ✓ Confirm MS Structure
                              </button>
                            </div>
                          )}
                          
                          {/* MS Structure Confirmed Message */}
                          {isMsStructureConfirmed && !isEditingMsStructure && (
                            <div className="mt-4 p-4 bg-green-500/20 border border-green-400/50 rounded-xl backdrop-blur-sm animate-fade-up flex items-center justify-between">
                              <p className="text-green-200 text-sm font-medium flex items-center space-x-2">
                                <span>✓</span>
                                <span>MS Structure confirmed.</span>
                              </p>
                              <button
                                onClick={() => {
                                  setIsEditingMsStructure(true);
                                  setIsMsStructureConfirmed(false);
                                }}
                                className="btn-premium-gold btn-ripple btn-press btn-3d px-4 py-2 text-sm ml-4"
                                style={{
                                  boxShadow: '0 0 15px rgba(209, 168, 90, 0.3)',
                                }}
                              >
                                ✏️ Edit
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-4 bg-amber-500/20 border border-amber-400/50 rounded-xl">
                      <p className="text-amber-200 text-sm">
                        ⚠️ No MS structure data found for the selected board configuration. Please ensure board specifications are confirmed.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        )}

        {/* Area Calculation Breakdown - Only show when quotation is confirmed */}
        {isQuotationConfirmed && boardSpecsConfirmed && areaResult && (
          <div className="glassmorphic-premium rounded-3xl p-14 border-2 border-premium-gold/50 shadow-2xl slide-up mb-16 card-hover-gold card-3d card-depth" style={{ animationDelay: '200ms' }}>
            <h3 className="text-3xl font-extrabold text-white mb-8 drop-shadow-lg">Area Calculation Breakdown</h3>
            
            {/* Board Details */}
            <div className="mb-8">
              <h4 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2">Board Details</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium">Shape</span>
                  <span className="text-white font-bold text-lg">{shape}</span>
                </div>
                {shape === 'Rectangular' ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 font-medium">Width</span>
                      <span className="text-white font-bold text-lg">{width} mm</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 font-medium">Height</span>
                      <span className="text-white font-bold text-lg">{height} mm</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Size</span>
                    <span className="text-white font-bold text-lg">{size} mm</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium">Board Type</span>
                  <span className="text-white font-bold text-lg">{boardType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium">Sheeting Type</span>
                  <span className="text-white font-bold text-lg">{sheetingType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium">ACP Thickness</span>
                  <span className="text-white font-bold text-lg">{acpThickness} mm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium">Printing Type</span>
                  <span className="text-white font-bold text-lg">{printingType}</span>
                </div>
              </div>
            </div>

            {/* Area Calculations */}
            <div className="mb-8 pt-6 border-t border-white/20">
              <h4 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2">Calculated Areas</h4>
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <div className="text-slate-300 text-sm font-mono space-y-1">
                  {shape === 'Circular' && (
                    <div>Circular: π × ({size}/2)² = {areaResult.areaSqMm.toFixed(2)} sq mm</div>
                  )}
                  {shape === 'Triangle' && (
                    <div>Triangular: (√3 / 4) × {size}² = {areaResult.areaSqMm.toFixed(2)} sq mm</div>
                  )}
                  {shape === 'Octagonal' && (
                    <div>Octagonal: 2 × (1 + √2) × {size}² = {areaResult.areaSqMm.toFixed(2)} sq mm</div>
                  )}
                  {shape === 'Rectangular' && (
                    <div>Rectangular: {width} × {height} = {areaResult.areaSqMm.toFixed(2)} sq mm</div>
                  )}
                  <div className="pt-2 border-t border-white/20 mt-2">
                    <div>Area in sq mm = {areaResult.areaSqMm.toFixed(2)} sq mm</div>
                    <div>Area in sq m = {areaResult.areaSqMm.toFixed(2)} ÷ 1,000,000 = {areaResult.areaSqM.toFixed(4)} sq m</div>
                    <div>Area in sq ft = {areaResult.areaSqMm.toFixed(2)} × 0.0000107639 = {areaResult.areaSqFt % 1 === 0 ? areaResult.areaSqFt.toFixed(0) : areaResult.areaSqFt.toFixed(1)} sq ft <span className="text-yellow-400">(rounded with wastage)</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Area in sq ft (Primary Unit) */}
            <div className="pt-6 border-t border-white/20">
              <h4 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2">Area in Square Feet (Primary Unit)</h4>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-slate-300 text-sm font-mono mb-2">
                  Primary Unit: Square Foot (sq ft)
                </div>
                <div className="text-2xl font-extrabold text-premium-gold">
                  {areaResult.areaSqFt.toFixed(4)} sq ft
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Section - Only show when quotation is confirmed */}
        {isQuotationConfirmed && boardSpecsConfirmed && pricingConfirmed && areaResult && costPerPiece && finalTotal && (
          <div className="glassmorphic-premium rounded-3xl p-14 border-2 border-premium-gold/50 shadow-2xl slide-up mb-16 card-hover-gold card-3d card-depth" style={{ animationDelay: '250ms' }}>
            <h3 className="text-3xl font-extrabold text-white mb-8 drop-shadow-lg">Summary</h3>
            <div className="space-y-6">
              <div>
                <p className="text-slate-300 text-sm mb-2 font-medium">Area (sq ft) <span className="text-xs text-slate-400">(with wastage)</span></p>
                <p className="text-3xl font-bold text-white">
                  {areaResult.areaSqFt % 1 === 0 ? areaResult.areaSqFt.toFixed(0) : areaResult.areaSqFt.toFixed(1)} sq ft
                </p>
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-2 font-medium">Final Rate per sq ft (with all costs + profit)</p>
                <p className="text-3xl font-bold text-white">₹{finalRatePerSqFt.toFixed(2)} / sq ft</p>
                <p className="text-xs text-slate-400 mt-1 italic">
                  Cost per piece = Area × Final Rate
                </p>
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-2 font-medium">Cost Per Piece (Reflective)</p>
                <p className="text-3xl font-bold text-white">₹{costPerPiece.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-slate-400 mt-1 italic">
                  = {areaResult.areaSqFt % 1 === 0 ? areaResult.areaSqFt.toFixed(0) : areaResult.areaSqFt.toFixed(1)} sq ft × ₹{finalRatePerSqFt.toFixed(2)}/sq ft
                </p>
              </div>
              {msEnabled && msCostPerStructure > 0 && (
                <div>
                  <p className="text-slate-300 text-sm mb-2 font-medium">Cost Per Structure (MS)</p>
                  <p className="text-3xl font-bold text-white">₹{msCostPerStructure.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              )}
              <div>
                <p className="text-slate-300 text-sm mb-2 font-medium">Quantity</p>
                <p className="text-3xl font-bold text-white">{quantity} boards</p>
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-2 font-medium">Reflective Total</p>
                <p className="text-2xl font-bold text-white">₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              {msEnabled && totalMsCost > 0 && (
                <div>
                  <p className="text-slate-300 text-sm mb-2 font-medium">MS Structure Total</p>
                  <p className="text-2xl font-bold text-white">₹{totalMsCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              )}
              <div className="pt-4 border-t border-premium-gold/50">
                <p className="text-slate-300 text-sm mb-2 font-medium">Final Total Price</p>
                <p className="text-4xl font-extrabold text-premium-gold drop-shadow-lg">
                  ₹{(combinedTotal || finalTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xl text-premium-gold/90 mt-2">({formatIndianUnits(combinedTotal || finalTotal)})</p>
              </div>
            </div>
          </div>
        )}

        {/* Save Quotation Button - Only show when quotation is confirmed */}
        {isQuotationConfirmed && boardSpecsConfirmed && pricingConfirmed && areaResult && costPerPiece && finalTotal && (
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
            <button
              onClick={handleSaveQuotation}
              disabled={isSaving}
              className="btn-premium-gold btn-ripple btn-press btn-3d px-12 py-4 text-lg shimmer relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                boxShadow: '0 0 20px rgba(209, 168, 90, 0.3)',
              }}
            >
              {isSaving ? '⏳ Saving...' : '💾 Save Quotation'}
            </button>
          </div>
        )}
        
      </div>
      
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

