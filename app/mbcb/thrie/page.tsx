'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import SmartDropdown from '@/components/forms/SmartDropdown';
import SubAccountSelect from '@/components/forms/SubAccountSelect';
import AccountSelect from '@/components/forms/AccountSelect';
import ContactSelect from '@/components/forms/ContactSelect';
import StateCitySelect from '@/components/forms/StateCitySelect';
import Toast from '@/components/ui/Toast';
import { useUser } from '@/contexts/UserContext';
import { calculateThrieBeamWeights } from '@/lib/calculations/thrieBeamCalculations';
import { calculatePostWeights } from '@/lib/calculations/postCalculations';
import { calculateSpacerWeights } from '@/lib/calculations/spacerCalculations';
import { useDebounce } from '@/hooks/useDebounce';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { PortalPopperContainer } from '@/components/ui/PortalPopperContainer';

type PartInput = {
  thickness?: number;
  length?: number | null;
  coatingGsm?: number;
};

type PartResult = {
  found: boolean;
  error?: string;
  weightBlackMaterial?: number;
  weightZincAdded?: number;
  totalWeight?: number;
};

// Hardcoded dropdown values for Thrie Beam Section
const THRIE_BEAM_THICKNESS = [2.0, 2.05, 2.1, 2.15, 2.2, 2.25, 2.3, 2.35, 2.4, 2.45, 2.5, 2.55, 2.6, 2.65, 2.7, 2.75, 2.8, 2.85, 2.9, 2.95, 3.0];
const THRIE_BEAM_COATING = [350, 400, 450, 500, 550];

const THRIE_POST_THICKNESS = [4.0, 4.05, 4.1, 4.15, 4.2, 4.25, 4.3, 4.35, 4.4, 4.45, 4.5, 4.55, 4.6, 4.65, 4.7, 4.75, 4.8, 4.85, 4.9, 4.95, 5.0];
const THRIE_POST_LENGTH = [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000];
const THRIE_POST_COATING = [350, 400, 450, 500, 550];

const THRIE_SPACER_THICKNESS = [4.0, 4.05, 4.1, 4.15, 4.2, 4.25, 4.3, 4.35, 4.4, 4.45, 4.5, 4.55, 4.6, 4.65, 4.7, 4.75, 4.8, 4.85, 4.9, 4.95, 5.0];
const THRIE_SPACER_LENGTH = [530, 550];
const THRIE_SPACER_COATING = [350, 400, 450, 500, 550];

// Helper function to format numbers in Indian numbering system
function formatIndianUnits(value: number): string {
  // Format with Indian comma style
  const formatted = value.toLocaleString('en-IN', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });

  // If less than 1 Lakh (1,00,000), return just the formatted number
  if (value < 100000) {
    return formatted;
  }

  // If >= 1 Lakh and < 1 Crore (1,00,00,000), return in Lakhs
  if (value >= 100000 && value < 10000000) {
    const lakhs = value / 100000;
    return `${lakhs.toFixed(1)} Lakhs`;
  }

  // If >= 1 Crore, return in Crores
  const crores = value / 10000000;
  return `${crores.toFixed(1)} Crores`;
}

export default function ThrieBeamPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { username } = useUser();
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Save state to prevent duplicate saves
  const [isSaving, setIsSaving] = useState(false);
  
  // Quotation header fields (mandatory)
  const [stateId, setStateId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [stateName, setStateName] = useState<string>('');
  const [cityName, setCityName] = useState<string>('');
  const [quotationDate] = useState<string>(() => {
    // Auto-fill with today's date in DD/MM/YYYY format (non-editable)
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
  
  // Check if user is MBCB or Admin (price checking only, no save)
  const isMBCBUser = username === 'MBCB';
  const isAdminUser = username === 'Admin';
  const isViewOnlyUser = isMBCBUser || isAdminUser;
  
  // Track if quotation information is confirmed
  // For MBCB and Admin users, always treat as confirmed (they skip quotation details)
  const [isQuotationConfirmed, setIsQuotationConfirmed] = useState<boolean>(isViewOnlyUser);
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
  
  // Track if cost inputs are confirmed
  const [isCostConfirmed, setIsCostConfirmed] = useState<boolean>(false);
  const [isEditingCost, setIsEditingCost] = useState<boolean>(false);
  
  // Track if quantity is confirmed
  const [isQuantityConfirmed, setIsQuantityConfirmed] = useState<boolean>(false);
  const [isEditingQuantity, setIsEditingQuantity] = useState<boolean>(false);
  
  // Track if fasteners are confirmed
  const [isFastenerConfirmed, setIsFastenerConfirmed] = useState<boolean>(false);
  const [isEditingFastener, setIsEditingFastener] = useState<boolean>(false);
  
  // Track if parts are being edited
  const [isEditingThrieBeam, setIsEditingThrieBeam] = useState<boolean>(false);
  const [isEditingPost, setIsEditingPost] = useState<boolean>(false);
  const [isEditingSpacer, setIsEditingSpacer] = useState<boolean>(false);
  
  // Part selection toggles
  const [includeThrieBeam, setIncludeThrieBeam] = useState<boolean>(true);
  const [includePost, setIncludePost] = useState<boolean>(true);
  const [includeSpacer, setIncludeSpacer] = useState<boolean>(true);
  const [includeTransportation, setIncludeTransportation] = useState<boolean>(false);
  const [includeInstallation, setIncludeInstallation] = useState<boolean>(false);

  // Fasteners state
  const [fastenerMode, setFastenerMode] = useState<'default' | 'manual'>('default');
  const [hexBoltQty, setHexBoltQty] = useState<number>(0);
  const [buttonBoltQty, setButtonBoltQty] = useState<number>(0);

  const [thrieBeam, setThrieBeam] = useState<PartInput>({
    thickness: THRIE_BEAM_THICKNESS[0],
    coatingGsm: THRIE_BEAM_COATING[0],
  });
  const [post, setPost] = useState<PartInput>({
    thickness: THRIE_POST_THICKNESS[0],
    length: THRIE_POST_LENGTH[0],
    coatingGsm: THRIE_POST_COATING[0],
  });
  const [spacer, setSpacer] = useState<PartInput>({
    thickness: THRIE_SPACER_THICKNESS[0],
    length: THRIE_SPACER_LENGTH[0],
    coatingGsm: THRIE_SPACER_COATING[0],
  });
  const [ratePerKg, setRatePerKg] = useState<number | null>(null);
  const [transportCostPerKg, setTransportCostPerKg] = useState<number | null>(null);
  const [installationCostPerRm, setInstallationCostPerRm] = useState<number | null>(null);
  const [quantityRm, setQuantityRm] = useState<number | null>(null);
  
  // Debounced values for calculations to prevent lag while typing
  const debouncedRatePerKg = useDebounce(ratePerKg, 300);
  const debouncedTransportCostPerKg = useDebounce(transportCostPerKg, 300);
  const debouncedInstallationCostPerRm = useDebounce(installationCostPerRm, 300);
  const debouncedQuantityRm = useDebounce(quantityRm, 300);

  // Results for each part
  const [thrieBeamResult, setThrieBeamResult] = useState<PartResult | null>(null);
  const [postResult, setPostResult] = useState<PartResult | null>(null);
  const [spacerResult, setSpacerResult] = useState<PartResult | null>(null);

  // Overall totals state
  const [totalBlackWeight, setTotalBlackWeight] = useState<number>(0);
  const [totalZincWeight, setTotalZincWeight] = useState<number>(0);
  const [totalWeight, setTotalWeight] = useState<number>(0);
  const [totalSetWeight, setTotalSetWeight] = useState<number>(0);

  // Calculate fastener weight based on mode
  const calculateFastenerWeight = (): number => {
    if (fastenerMode === 'default') {
      return 3; // Default: 3 kg for Single Thrie-Beam
    } else {
      // Manual mode: calculate from bolt quantities
      const hexWeight = hexBoltQty * 0.135; // Hex Bolt = 0.135 kg each
      const buttonWeight = buttonBoltQty * 0.145; // Button Bolt = 0.145 kg each
      return hexWeight + buttonWeight;
    }
  };

  // Reset part selections when fastener mode changes to manual
  useEffect(() => {
    if (fastenerMode === 'manual') {
      // Disable all parts when manual fastener mode is selected
      setIncludeThrieBeam(false);
      setIncludePost(false);
      setIncludeSpacer(false);
      // Clear all part results
      setThrieBeamResult(null);
      setPostResult(null);
      setSpacerResult(null);
    }
  }, [fastenerMode]);

  // Function to update overall totals with multipliers and fasteners (Single Thrie-Beam)
  // Single Thrie-Beam: Thrie-Beam × 1, Post × 2, Spacer × 2, Fasteners (default or manual)
  const updateOverallTotals = () => {
    // If manual fastener mode, only calculate fastener weight
    if (fastenerMode === 'manual') {
      const fastenersWeight = calculateFastenerWeight();
      const totalSetWeightKg = fastenersWeight;
      const totalWeightPerRmKg = totalSetWeightKg / 4;
      
      // For manual mode, there are no parts, so black and zinc weights are 0
      setTotalBlackWeight(0);
      setTotalZincWeight(0);
      setTotalSetWeight(totalSetWeightKg);
      setTotalWeight(totalWeightPerRmKg);
      return;
    }
    
    // Get part weights (black + zinc) from confirmed results
    const thrieBeamWeight = includeThrieBeam && thrieBeamResult?.found ? (thrieBeamResult.totalWeight || 0) : 0;
    const postWeight = includePost && postResult?.found ? (postResult.totalWeight || 0) : 0;
    const spacerWeight = includeSpacer && spacerResult?.found ? (spacerResult.totalWeight || 0) : 0;
    
    // Calculate fastener weight based on mode
    const fastenersWeight = calculateFastenerWeight();
    
    // Calculate total set weight with multipliers
    // totalSetWeightKg = (1 × thrieBeamWeight) + (2 × postWeight) + (2 × spacerWeight) + fastenersWeight
    const totalSetWeightKg = (1 * thrieBeamWeight) + (2 * postWeight) + (2 * spacerWeight) + fastenersWeight;
    
    // Total weight per running metre = totalSetWeightKg / 4
    const totalWeightPerRmKg = totalSetWeightKg / 4;
    
    // Calculate black and zinc totals for display (with multipliers)
    const thrieBeamBlack = includeThrieBeam && thrieBeamResult?.found ? (thrieBeamResult.weightBlackMaterial || 0) * 1 : 0;
    const thrieBeamZinc = includeThrieBeam && thrieBeamResult?.found ? (thrieBeamResult.weightZincAdded || 0) * 1 : 0;
    const postBlack = includePost && postResult?.found ? (postResult.weightBlackMaterial || 0) * 2 : 0;
    const postZinc = includePost && postResult?.found ? (postResult.weightZincAdded || 0) * 2 : 0;
    const spacerBlack = includeSpacer && spacerResult?.found ? (spacerResult.weightBlackMaterial || 0) * 2 : 0;
    const spacerZinc = includeSpacer && spacerResult?.found ? (spacerResult.weightZincAdded || 0) * 2 : 0;
    
    setTotalBlackWeight(thrieBeamBlack + postBlack + spacerBlack);
    setTotalZincWeight(thrieBeamZinc + postZinc + spacerZinc);
    setTotalSetWeight(totalSetWeightKg);
    setTotalWeight(totalWeightPerRmKg); // Store kgPerRm in totalWeight
  };

  // Reset all state when navigating to this page - only on mount
  useEffect(() => {
    // Only reset if we're actually on this page and state hasn't been initialized
    if (pathname === '/mbcb/thrie' && !thrieBeamResult && !postResult && !spacerResult) {
      // Reset all form states to defaults
      setIncludeThrieBeam(true);
      setIncludePost(true);
      setIncludeSpacer(true);
      setIncludeTransportation(false);
      setIncludeInstallation(false);
      
      setThrieBeam({
        thickness: THRIE_BEAM_THICKNESS[0],
        coatingGsm: THRIE_BEAM_COATING[0],
      });
      setPost({
        thickness: THRIE_POST_THICKNESS[0],
        length: THRIE_POST_LENGTH[0],
        coatingGsm: THRIE_POST_COATING[0],
      });
      setSpacer({
        thickness: THRIE_SPACER_THICKNESS[0],
        length: THRIE_SPACER_LENGTH[0],
        coatingGsm: THRIE_SPACER_COATING[0],
      });
      
      setRatePerKg(null);
      setTransportCostPerKg(null);
      setInstallationCostPerRm(null);
      setQuantityRm(null);
      
      setFastenerMode('default');
      setHexBoltQty(0);
      setButtonBoltQty(0);
      
      setThrieBeamResult(null);
      setPostResult(null);
      setSpacerResult(null);
      
      setTotalBlackWeight(0);
      setTotalZincWeight(0);
      setTotalWeight(0);
      setTotalSetWeight(0);
    }
  }, []); // Only run on mount

  // Update totals whenever any result or selection changes
  useEffect(() => {
    updateOverallTotals();
  }, [thrieBeamResult, postResult, spacerResult, includeThrieBeam, includePost, includeSpacer, fastenerMode, hexBoltQty, buttonBoltQty]);

  const handleConfirmThrieBeam = () => {
    setIsEditingThrieBeam(false);
    if (!thrieBeam.thickness || !thrieBeam.coatingGsm) {
      setThrieBeamResult({
        found: false,
        error: 'Please select thickness and coating GSM',
      });
      return;
    }

    // Use formula-based calculation for Thrie Beam
    const weights = calculateThrieBeamWeights({
      thicknessMm: thrieBeam.thickness,
      coatingGsm: thrieBeam.coatingGsm,
    });
    
    setThrieBeamResult({
      found: true,
      weightBlackMaterial: weights.blackMaterialWeightKg,
      weightZincAdded: weights.zincWeightKg,
      totalWeight: weights.totalThrieBeamWeightKg,
    });
    // Totals will update automatically via useEffect
  };

  const handleConfirmPost = () => {
    setIsEditingPost(false);
    if (!post.thickness || !post.length || !post.coatingGsm) {
      setPostResult({
        found: false,
        error: 'Please select thickness, length, and coating GSM',
      });
      return;
    }

    // Use formula-based calculation for Post
    const weights = calculatePostWeights({
      thicknessMm: post.thickness,
      lengthMm: post.length,
      coatingGsm: post.coatingGsm,
    });
    
    setPostResult({
      found: true,
      weightBlackMaterial: weights.blackMaterialWeightKg,
      weightZincAdded: weights.zincWeightKg,
      totalWeight: weights.totalPostWeightKg,
    });
    // Totals will update automatically via useEffect
  };

  const handleConfirmSpacer = () => {
    setIsEditingSpacer(false);
    if (!spacer.thickness || !spacer.length || !spacer.coatingGsm) {
      setSpacerResult({
        found: false,
        error: 'Please select thickness, length, and coating GSM',
      });
      return;
    }

    // Use formula-based calculation for Spacer
    const weights = calculateSpacerWeights({
      thicknessMm: spacer.thickness,
      lengthMm: spacer.length,
      coatingGsm: spacer.coatingGsm,
    });
    
    setSpacerResult({
      found: true,
      weightBlackMaterial: weights.blackMaterialWeightKg,
      weightZincAdded: weights.zincWeightKg,
      totalWeight: weights.totalSpacerWeightKg,
    });
    // Totals will update automatically via useEffect
  };

  // Memoized cost calculations to prevent unnecessary recalculations
  const costCalculations = useMemo(() => {
    // kgPerRm is stored in totalWeight
    const kgPerRm = totalWeight;
    
    const transportCostPerKgValue = includeTransportation && debouncedTransportCostPerKg && debouncedTransportCostPerKg > 0 ? debouncedTransportCostPerKg : 0;
    const installationCostPerRmValue = includeInstallation && debouncedInstallationCostPerRm && debouncedInstallationCostPerRm > 0 ? debouncedInstallationCostPerRm : 0;
    
    // Calculate fastener weight per running meter
    const fastenerWeightKg = calculateFastenerWeight();
    const fastenerWeightPerRm = fastenerWeightKg / 4; // Convert from kg/set to kg/rm
    
    // If fasteners are in manual mode, calculate fastener cost differently
    let materialCostPerRm: number | null = null;
    let transportCostPerRm: number | null = null;
    let fastenerMaterialCostPerRm: number | null = null;
    let fastenerTransportCostPerRm: number | null = null;
    let totalCostPerRm: number | null = null;
    let finalTotal: number | null = null;
    
    if (fastenerMode === 'manual') {
      // Manual mode: Only fasteners, different calculation
      // Fastener weight in kg (total weight, not per-rm)
      const fastenerWeightTotalKg = fastenerWeightKg;
      
      // Material cost = ratePerKg × fastenerWeight (in rupees)
      if (debouncedRatePerKg && debouncedRatePerKg > 0 && fastenerWeightTotalKg > 0) {
        fastenerMaterialCostPerRm = fastenerWeightTotalKg * debouncedRatePerKg;
      }
      
      // Transport cost = transportCostPerKg × fastenerWeight (in rupees)
      if (includeTransportation && transportCostPerKgValue > 0 && fastenerWeightTotalKg > 0) {
        fastenerTransportCostPerRm = fastenerWeightTotalKg * transportCostPerKgValue;
      }
      
      // Final total = material cost + transport cost (in rupees, not per-rm)
      finalTotal = (fastenerMaterialCostPerRm || 0) + (fastenerTransportCostPerRm || 0);
      
      // For manual mode, we don't use per-rm calculations
      materialCostPerRm = fastenerMaterialCostPerRm;
      transportCostPerRm = fastenerTransportCostPerRm;
      totalCostPerRm = finalTotal; // This will be the final price in rupees
    } else {
      // Default mode: Calculate normally (fasteners included in total weight)
      materialCostPerRm = debouncedRatePerKg && debouncedRatePerKg > 0 && kgPerRm > 0 ? kgPerRm * debouncedRatePerKg : null;
      transportCostPerRm = kgPerRm > 0 ? kgPerRm * transportCostPerKgValue : null;
      
      // Calculate total cost per rm
      totalCostPerRm = materialCostPerRm !== null
        ? materialCostPerRm + (transportCostPerRm || 0) + installationCostPerRmValue
        : null;
      
      // Calculate final total based on quantity
      finalTotal = totalCostPerRm !== null && debouncedQuantityRm !== null && debouncedQuantityRm > 0
        ? totalCostPerRm * debouncedQuantityRm
        : null;
    }
    
    return {
      materialCostPerRm,
      transportCostPerRm,
      installationCostPerRmValue,
      totalCostPerRm,
      finalTotal,
      fastenerMaterialCostPerRm,
      fastenerTransportCostPerRm
    };
  }, [totalWeight, debouncedRatePerKg, debouncedTransportCostPerKg, debouncedInstallationCostPerRm, debouncedQuantityRm, includeTransportation, includeInstallation, fastenerMode, hexBoltQty, buttonBoltQty]);
  
  const { materialCostPerRm, transportCostPerRm, installationCostPerRmValue, totalCostPerRm, finalTotal, fastenerMaterialCostPerRm, fastenerTransportCostPerRm } = costCalculations;

  // Save Quotation Function (separate from PDF)
  const handleSaveQuotation = async () => {
    // Prevent duplicate saves
    if (isSaving) {
      return;
    }

    // Validate inputs
    if (!isQuotationComplete) {
      setToast({ message: 'Please complete all mandatory quotation fields', type: 'error' });
      return;
    }

    if (fastenerMode === 'manual') {
      if (calculateFastenerWeight() === 0 || !ratePerKg || ratePerKg <= 0) {
        setToast({ message: 'Please enter fastener quantities and rate per kg', type: 'error' });
        return;
      }
    } else {
      if (totalWeight === 0 || !ratePerKg || ratePerKg <= 0) {
        setToast({ message: 'Please confirm parts and enter rate per kg', type: 'error' });
        return;
      }
    }

    setIsSaving(true);
    try {
      const currentUsername = username || (typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin');
      
      // Save meta fields (customers, purposes) to database ONLY when saving quotation
      // State and City are already in the database, no need to save them
      if (customerName.trim()) {
        // Determine sales employee from current user
        const salesEmployee = currentUsername.startsWith('Sales_') 
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
      
      // Convert DD/MM/YYYY to YYYY-MM-DD for database
      let dateForDb = quotationDate;
      if (quotationDate.includes('/')) {
        const [day, month, year] = quotationDate.split('/');
        dateForDb = `${year}-${month}-${day}`;
      }
      
      const quotePayload = {
        section: 'Thrie',
        state_id: stateId,
        city_id: cityId,
        account_id: accountId, // Add account ID
        sub_account_id: subAccountId,
        customer_name: customerName || subAccountName, // Contact name
        sub_account_name: subAccountName, // Actual sub-account name
        purpose: purpose,
        date: dateForDb,
        quantity_rm: quantityRm || null,
        total_weight_per_rm: totalWeight || null,
        total_cost_per_rm: totalCostPerRm || null,
        final_total_cost: finalTotal || null,
        created_by: currentUsername,
        is_saved: true,
        raw_payload: {
          username: currentUsername,
          includeThrieBeam,
          includePost,
          includeSpacer,
          includeTransportation,
          includeInstallation,
          fastenerMode,
          hexBoltQty,
          buttonBoltQty,
          thrieBeam,
          post,
          spacer,
          thrieBeamResult,
          postResult,
          spacerResult,
          subAccountId,
          subAccountName,
          contactId,
          contactName: customerName || '',
          ratePerKg,
          transportCostPerKg,
          installationCostPerRm,
          totalBlackWeight,
          totalZincWeight,
          totalSetWeight,
          materialCostPerRm,
          transportCostPerRm,
          installationCostPerRmValue,
        },
      };

      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quotePayload),
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

        {/* Quotation Information Card - Uniform Style - Hidden for MBCB and Admin users */}
        {!isViewOnlyUser && (
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
          
          {isQuotationComplete && (!isQuotationConfirmed || isEditingQuotation) && (
            <div className="mt-8 mb-8 flex justify-center">
              <button
                onClick={() => {
                  setIsQuotationConfirmed(true);
                  setIsEditingQuotation(false);
                }}
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
            <div className="mt-8 mb-6 p-4 bg-green-500/20 border border-green-400/50 rounded-xl backdrop-blur-sm animate-fade-up flex items-center justify-between">
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

          {/* Step 4: Sub Account, Purpose, and Contact - Show after account is selected */}
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
        )}

        {/* Part Selection Toggles - Only show when quotation is confirmed */}
        {isQuotationConfirmed && fastenerMode === 'default' && (
        <div className="glassmorphic-premium rounded-3xl p-12 mb-16 slide-up card-hover-gold card-3d card-depth">
          <h3 className="text-2xl font-extrabold text-white mb-8 drop-shadow-lg">Select Parts to Include</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <label className="flex items-center space-x-3 cursor-pointer group toggle-glow">
              <input
                type="checkbox"
                checked={includeThrieBeam}
                onChange={(e) => {
                  setIncludeThrieBeam(e.target.checked);
                  if (!e.target.checked) {
                    setThrieBeamResult(null);
                  }
                }}
                className="w-5 h-5 rounded border-white/30 bg-white/10 text-premium-gold focus:ring-2 focus:ring-premium-gold cursor-pointer transition-all"
              />
              <span className="text-slate-200 font-semibold group-hover:text-premium-gold transition-colors">Include Thrie Beam?</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer group toggle-glow">
              <input
                type="checkbox"
                checked={includePost}
                onChange={(e) => {
                  setIncludePost(e.target.checked);
                  if (!e.target.checked) {
                    setPostResult(null);
                  }
                }}
                className="w-5 h-5 rounded border-white/30 bg-white/10 text-premium-gold focus:ring-2 focus:ring-premium-gold cursor-pointer transition-all"
              />
              <span className="text-slate-200 font-semibold group-hover:text-premium-gold transition-colors">Include Post?</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer group toggle-glow">
              <input
                type="checkbox"
                checked={includeSpacer}
                onChange={(e) => {
                  setIncludeSpacer(e.target.checked);
                  if (!e.target.checked) {
                    setSpacerResult(null);
                  }
                }}
                className="w-5 h-5 rounded border-white/30 bg-white/10 text-premium-gold focus:ring-2 focus:ring-premium-gold cursor-pointer transition-all"
              />
              <span className="text-slate-200 font-semibold group-hover:text-premium-gold transition-colors">Include Spacer?</span>
            </label>
          </div>
        </div>
        )}

        {isQuotationConfirmed && fastenerMode === 'manual' && (
        <div className="glassmorphic-premium rounded-3xl p-12 mb-16 slide-up card-hover-gold border-2 border-premium-gold/50 card-3d card-depth">
          <h3 className="text-2xl font-extrabold text-white mb-4 drop-shadow-lg">Manual Fastener Mode</h3>
          <p className="text-slate-300 text-sm mb-0">
            When selecting fasteners manually, only fasteners are included in the calculation. Other parts (Thrie Beam, Post, Spacer) are disabled.
          </p>
        </div>
        )}

        {/* Input Cards - Only show when quotation is confirmed */}
        {isQuotationConfirmed && (
        <div className="space-y-10 mb-10">
          {/* Thrie Beam Card */}
          {fastenerMode === 'default' && includeThrieBeam && (
          <div className="glassmorphic-premium rounded-3xl p-12 animate-fade-up card-hover-gold card-3d card-depth">
            <h2 className="text-3xl font-extrabold text-white mb-3 drop-shadow-lg">Thrie Beam</h2>
            <p className="text-sm text-slate-300 mb-8">Enter parameters to fetch weights from master data.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Thickness (mm)
                </label>
                <select
                  value={thrieBeam.thickness || ''}
                  onChange={(e) => {
                    setThrieBeam({ ...thrieBeam, thickness: parseFloat(e.target.value) });
                    setThrieBeamResult(null);
                    setIsEditingThrieBeam(false);
                  }}
                  className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                  disabled={thrieBeamResult?.found && !isEditingThrieBeam}
                >
                  {THRIE_BEAM_THICKNESS.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Coating GSM (g/sq.m)
                </label>
                <select
                  value={thrieBeam.coatingGsm || ''}
                  onChange={(e) => {
                    setThrieBeam({ ...thrieBeam, coatingGsm: parseInt(e.target.value) });
                    setThrieBeamResult(null);
                    setIsEditingThrieBeam(false);
                  }}
                  className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                  disabled={thrieBeamResult?.found && !isEditingThrieBeam}
                >
                  {THRIE_BEAM_COATING.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(!thrieBeamResult?.found || isEditingThrieBeam) && (
              <button
                onClick={handleConfirmThrieBeam}
                disabled={!thrieBeam.thickness || !thrieBeam.coatingGsm}
                className="btn-premium-gold btn-ripple btn-press btn-3d px-8 py-4 text-lg shimmer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Thrie Beam
              </button>
            )}

            {thrieBeamResult?.found && !isEditingThrieBeam && (
              <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <div className="space-y-2 mb-4">
                  <p className="text-slate-200">
                    <span className="font-semibold">Weight of Black Material:</span> {thrieBeamResult.weightBlackMaterial?.toFixed(3)} kg/rm
                  </p>
                  <p className="text-slate-200">
                    <span className="font-semibold">Weight of Zinc Added:</span> {thrieBeamResult.weightZincAdded?.toFixed(3)} kg/rm
                  </p>
                  <p className="text-premium-gold font-bold text-lg">
                    <span className="font-semibold">Total Weight:</span> {thrieBeamResult.totalWeight?.toFixed(3)} kg/rm
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-green-200 text-sm font-medium flex items-center space-x-2">
                    <span>✓</span>
                    <span>Thrie Beam confirmed.</span>
                  </p>
                  <button
                    onClick={() => {
                      setIsEditingThrieBeam(true);
                      setThrieBeamResult(null);
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
            {thrieBeamResult && !thrieBeamResult.found && (
              <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <p className="text-red-400 font-semibold">No matching entry found in master data for the selected values.</p>
              </div>
            )}
          </div>
          )}

          {/* Post Card */}
          {fastenerMode === 'default' && includePost && (
          <div className="glassmorphic rounded-3xl p-10 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <h2 className="text-3xl font-extrabold text-white mb-3 drop-shadow-lg">Post</h2>
            <p className="text-sm text-slate-300 mb-8">Enter parameters to fetch weights from master data.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Thickness (mm)
                </label>
                <select
                  value={post.thickness || ''}
                  onChange={(e) => {
                    setPost({ ...post, thickness: parseFloat(e.target.value) });
                    setPostResult(null);
                    setIsEditingPost(false);
                  }}
                  className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                  disabled={postResult?.found && !isEditingPost}
                >
                  {THRIE_POST_THICKNESS.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Length (mm)
                </label>
                <select
                  value={post.length || ''}
                    onChange={(e) => {
                      setPost({ ...post, length: e.target.value ? parseFloat(e.target.value) : null });
                      setPostResult(null);
                      setIsEditingPost(false);
                    }}
                    className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                    disabled={postResult?.found && !isEditingPost}
                  >
                  {THRIE_POST_LENGTH.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Coating GSM (g/sq.m)
                </label>
                <select
                  value={post.coatingGsm || ''}
                  onChange={(e) => {
                    setPost({ ...post, coatingGsm: parseFloat(e.target.value) });
                    setPostResult(null);
                    setIsEditingPost(false);
                  }}
                  className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                  disabled={postResult?.found && !isEditingPost}
                >
                  {THRIE_POST_COATING.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(!postResult?.found || isEditingPost) && (
              <button
                onClick={handleConfirmPost}
                disabled={!post.thickness || !post.length || !post.coatingGsm}
                className="btn-premium-gold btn-ripple btn-press btn-3d px-8 py-4 text-lg shimmer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Post
              </button>
            )}

            {postResult?.found && !isEditingPost && (
              <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <div className="space-y-2 mb-4">
                  <p className="text-slate-200">
                    <span className="font-semibold">Weight of Black Material:</span> {postResult.weightBlackMaterial?.toFixed(3)} kg/rm
                  </p>
                  <p className="text-slate-200">
                    <span className="font-semibold">Weight of Zinc Added:</span> {postResult.weightZincAdded?.toFixed(3)} kg/rm
                  </p>
                  <p className="text-premium-gold font-bold text-lg">
                    <span className="font-semibold">Total Weight:</span> {postResult.totalWeight?.toFixed(3)} kg/rm
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-green-200 text-sm font-medium flex items-center space-x-2">
                    <span>✓</span>
                    <span>Post confirmed.</span>
                  </p>
                  <button
                    onClick={() => {
                      setIsEditingPost(true);
                      setPostResult(null);
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
            {postResult && !postResult.found && (
              <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <p className="text-red-400 font-semibold">No matching entry found in master data for the selected values.</p>
              </div>
            )}
          </div>
          )}

          {/* Spacer Card */}
          {fastenerMode === 'default' && includeSpacer && (
          <div className="glassmorphic rounded-3xl p-10 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <h2 className="text-3xl font-extrabold text-white mb-3 drop-shadow-lg">Spacer</h2>
            <p className="text-sm text-slate-300 mb-8">Enter parameters to fetch weights from master data.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Thickness (mm)
                </label>
                <select
                  value={spacer.thickness || ''}
                  onChange={(e) => {
                    setSpacer({ ...spacer, thickness: parseFloat(e.target.value) });
                    setSpacerResult(null);
                    setIsEditingSpacer(false);
                  }}
                  className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                  disabled={spacerResult?.found && !isEditingSpacer}
                >
                  {THRIE_SPACER_THICKNESS.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Length (mm)
                </label>
                <select
                  value={spacer.length || ''}
                  onChange={(e) => {
                    setSpacer({ ...spacer, length: e.target.value ? parseFloat(e.target.value) : null });
                    setSpacerResult(null);
                    setIsEditingSpacer(false);
                  }}
                  className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                  disabled={spacerResult?.found && !isEditingSpacer}
                >
                  {THRIE_SPACER_LENGTH.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Coating GSM (g/sq.m)
                </label>
                <select
                  value={spacer.coatingGsm || ''}
                  onChange={(e) => {
                    setSpacer({ ...spacer, coatingGsm: parseFloat(e.target.value) });
                    setSpacerResult(null);
                    setIsEditingSpacer(false);
                  }}
                  className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                  disabled={spacerResult?.found && !isEditingSpacer}
                >
                  {THRIE_SPACER_COATING.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(!spacerResult?.found || isEditingSpacer) && (
              <button
                onClick={handleConfirmSpacer}
                disabled={!spacer.thickness || !spacer.length || !spacer.coatingGsm}
                className="btn-premium-gold btn-ripple btn-press btn-3d px-8 py-4 text-lg shimmer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Spacer
              </button>
            )}

            {spacerResult?.found && !isEditingSpacer && (
              <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <div className="space-y-2 mb-4">
                  <p className="text-slate-200">
                    <span className="font-semibold">Weight of Black Material:</span> {spacerResult.weightBlackMaterial?.toFixed(3)} kg/rm
                  </p>
                  <p className="text-slate-200">
                    <span className="font-semibold">Weight of Zinc Added:</span> {spacerResult.weightZincAdded?.toFixed(3)} kg/rm
                  </p>
                  <p className="text-premium-gold font-bold text-lg">
                    <span className="font-semibold">Total Weight:</span> {spacerResult.totalWeight?.toFixed(3)} kg/rm
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-green-200 text-sm font-medium flex items-center space-x-2">
                    <span>✓</span>
                    <span>Spacer confirmed.</span>
                  </p>
                  <button
                    onClick={() => {
                      setIsEditingSpacer(true);
                      setSpacerResult(null);
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
            {spacerResult && !spacerResult.found && (
              <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10">
                <p className="text-red-400 font-semibold">No matching entry found in master data for the selected values.</p>
              </div>
            )}
          </div>
          )}

          {/* Fasteners (Nuts & Bolts) Card */}
          <div className="glassmorphic-premium rounded-3xl p-12 animate-fade-up card-hover-gold" style={{ animationDelay: '100ms' }}>
            <h2 className="text-3xl font-extrabold text-white mb-3 drop-shadow-lg">Fasteners (Nuts & Bolts)</h2>
            <p className="text-sm text-slate-300 mb-8">Select fastener calculation mode.</p>
            
            {/* Mode Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-200 mb-4">Fastener Mode</label>
              <div className="flex flex-col space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="fastenerMode"
                    value="default"
                    checked={fastenerMode === 'default'}
                    onChange={(e) => {
                      setFastenerMode('default');
                      setHexBoltQty(0);
                      setButtonBoltQty(0);
                      setIsFastenerConfirmed(false);
                      setIsEditingFastener(false);
                      // Re-enable part selections when switching back to default
                      setIncludeThrieBeam(true);
                      setIncludePost(true);
                      setIncludeSpacer(true);
                    }}
                    className="w-5 h-5 border-white/30 bg-white/10 text-premium-gold focus:ring-2 focus:ring-premium-gold cursor-pointer"
                  />
                  <span className="text-slate-200 font-semibold group-hover:text-premium-gold transition-colors">Use Default Fastener Weight (3 kg)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="fastenerMode"
                    value="manual"
                    checked={fastenerMode === 'manual'}
                    onChange={(e) => {
                      setFastenerMode('manual');
                      setIsFastenerConfirmed(false);
                      setIsEditingFastener(false);
                    }}
                    className="w-5 h-5 border-white/30 bg-white/10 text-premium-gold focus:ring-2 focus:ring-premium-gold cursor-pointer"
                    disabled={isFastenerConfirmed && !isEditingFastener}
                  />
                  <span className="text-slate-200 font-semibold group-hover:text-premium-gold transition-colors">Select Fasteners Manually</span>
                </label>
              </div>
            </div>

            {/* Manual Mode Inputs */}
            {fastenerMode === 'manual' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Quantity of Hexagonal Bolts
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={hexBoltQty || ''}
                    onChange={(e) => {
                      setHexBoltQty(e.target.value ? parseInt(e.target.value) : 0);
                      setIsFastenerConfirmed(false);
                      setIsEditingFastener(false);
                    }}
                    placeholder="Enter quantity"
                    className="input-premium input-focus-glow w-full px-4 py-3 text-white placeholder-slate-400"
                    disabled={isFastenerConfirmed && !isEditingFastener}
                  />
                  <p className="text-xs text-slate-400 mt-1">Weight: 0.135 kg each</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Quantity of Button Bolts
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={buttonBoltQty || ''}
                    onChange={(e) => {
                      setButtonBoltQty(e.target.value ? parseInt(e.target.value) : 0);
                      setIsFastenerConfirmed(false);
                      setIsEditingFastener(false);
                    }}
                    placeholder="Enter quantity"
                    className="input-premium input-focus-glow w-full px-4 py-3 text-white placeholder-slate-400"
                    disabled={isFastenerConfirmed && !isEditingFastener}
                  />
                  <p className="text-xs text-slate-400 mt-1">Weight: 0.145 kg each</p>
                </div>
              </div>
            )}

            {/* Fastener Weight Display */}
            {(!isFastenerConfirmed || isEditingFastener) && (
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="space-y-2">
                  {fastenerMode === 'default' ? (
                    <div>
                      <p className="text-slate-200">
                        <span className="font-semibold">Fasteners (Default):</span>{' '}
                        <span className="text-premium-gold font-extrabold text-xl drop-shadow-lg">{calculateFastenerWeight().toFixed(3)} kg</span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-slate-200">
                        <span className="font-semibold">Hex Bolts:</span>{' '}
                        <span className="text-white font-bold">{hexBoltQty} × 0.135 = {(hexBoltQty * 0.135).toFixed(3)} kg</span>
                      </p>
                      <p className="text-slate-200">
                        <span className="font-semibold">Button Bolts:</span>{' '}
                        <span className="text-white font-bold">{buttonBoltQty} × 0.145 = {(buttonBoltQty * 0.145).toFixed(3)} kg</span>
                      </p>
                      <p className="text-slate-200 pt-2 border-t border-white/10">
                        <span className="font-semibold">Total Fastener Weight:</span>{' '}
                        <span className="text-premium-gold font-extrabold text-xl drop-shadow-lg">{calculateFastenerWeight().toFixed(3)} kg</span>
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => {
                      setIsFastenerConfirmed(true);
                      setIsEditingFastener(false);
                    }}
                    className="btn-premium-gold btn-ripple btn-press btn-3d px-8 py-3 text-lg shimmer relative overflow-hidden"
                    style={{
                      boxShadow: '0 0 20px rgba(209, 168, 90, 0.3)',
                    }}
                  >
                    ✓ Confirm Fasteners
                  </button>
                </div>
              </div>
            )}
            
            {isFastenerConfirmed && !isEditingFastener && (
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="space-y-2 mb-4">
                  {fastenerMode === 'default' ? (
                    <div>
                      <p className="text-slate-200">
                        <span className="font-semibold">Fasteners (Default):</span>{' '}
                        <span className="text-premium-gold font-extrabold text-xl drop-shadow-lg">{calculateFastenerWeight().toFixed(3)} kg</span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-slate-200">
                        <span className="font-semibold">Hex Bolts:</span>{' '}
                        <span className="text-white font-bold">{hexBoltQty} × 0.135 = {(hexBoltQty * 0.135).toFixed(3)} kg</span>
                      </p>
                      <p className="text-slate-200">
                        <span className="font-semibold">Button Bolts:</span>{' '}
                        <span className="text-white font-bold">{buttonBoltQty} × 0.145 = {(buttonBoltQty * 0.145).toFixed(3)} kg</span>
                      </p>
                      <p className="text-slate-200 pt-2 border-t border-white/10">
                        <span className="font-semibold">Total Fastener Weight:</span>{' '}
                        <span className="text-premium-gold font-extrabold text-xl drop-shadow-lg">{calculateFastenerWeight().toFixed(3)} kg</span>
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-green-200 text-sm font-medium flex items-center space-x-2">
                    <span>✓</span>
                    <span>Fasteners confirmed.</span>
                  </p>
                  <button
                    onClick={() => {
                      setIsEditingFastener(true);
                      setIsFastenerConfirmed(false);
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
        </div>
        )}

        {/* Cost Inputs - Only show when quotation is confirmed */}
        {isQuotationConfirmed && (
        <div className="glassmorphic-premium rounded-3xl p-14 animate-fade-up mb-20 card-hover-gold" style={{ animationDelay: '100ms' }}>
            <h2 className="text-3xl font-extrabold text-white mb-8 drop-shadow-lg">Cost Inputs</h2>
            
            {!isQuotationComplete && (
              <div className="mb-6 p-4 bg-amber-500/20 border border-amber-400/50 rounded-xl backdrop-blur-sm animate-fade-up">
                <p className="text-amber-200 text-sm font-medium flex items-center space-x-2">
                  <span>⚠️</span>
                  <span>Please complete the quotation information above to proceed.</span>
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Rate per kg (₹/kg)
                </label>
                <input
                  type="number"
                  value={ratePerKg || ''}
                  onChange={(e) => {
                    setRatePerKg(e.target.value ? parseFloat(e.target.value) : null);
                    setIsCostConfirmed(false);
                    setIsEditingCost(false);
                  }}
                  placeholder="Enter rate per kg"
                  className="input-premium w-full md:w-1/2 px-6 py-4 text-white placeholder-slate-400"
                  disabled={(!isQuotationComplete) || (isCostConfirmed && !isEditingCost)}
                />
              </div>
              <div className="pt-4 border-t border-white/20">
                <label className="flex items-center space-x-3 cursor-pointer group mb-4">
                  <input
                    type="checkbox"
                    checked={includeTransportation}
                    onChange={(e) => {
                      setIncludeTransportation(e.target.checked);
                      if (!e.target.checked) {
                        setTransportCostPerKg(null);
                      }
                      setIsCostConfirmed(false);
                      setIsEditingCost(false);
                    }}
                    disabled={(!isQuotationComplete) || (isCostConfirmed && !isEditingCost)}
                    className="w-5 h-5 rounded border-white/30 bg-white/10 text-premium-gold focus:ring-2 focus:ring-premium-gold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-slate-200 font-semibold group-hover:text-premium-gold transition-colors">Include Transportation Cost?</span>
                </label>
                {includeTransportation && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Transportation Cost per kg (₹/kg)
                    </label>
                    <input
                      type="number"
                      value={transportCostPerKg || ''}
                      onChange={(e) => {
                        setTransportCostPerKg(e.target.value ? parseFloat(e.target.value) : null);
                        setIsCostConfirmed(false);
                        setIsEditingCost(false);
                      }}
                      placeholder="Enter transportation cost per kg"
                      className="input-premium w-full md:w-1/2 px-6 py-4 text-white placeholder-slate-400"
                      disabled={(!isQuotationComplete) || (isCostConfirmed && !isEditingCost)}
                    />
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-white/20">
                <label className="flex items-center space-x-3 cursor-pointer group mb-4">
                  <input
                    type="checkbox"
                    checked={includeInstallation}
                      onChange={(e) => {
                        setIncludeInstallation(e.target.checked);
                        if (!e.target.checked) {
                          setInstallationCostPerRm(null);
                        }
                        setIsCostConfirmed(false);
                        setIsEditingCost(false);
                      }}
                      disabled={(!isQuotationComplete) || (isCostConfirmed && !isEditingCost)}
                      className="w-5 h-5 rounded border-white/30 bg-white/10 text-premium-gold focus:ring-2 focus:ring-premium-gold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  <span className="text-slate-200 font-semibold group-hover:text-premium-gold transition-colors">Include Installation Cost?</span>
                </label>
                {includeInstallation && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Installation Cost per Running Metre (₹/rm)
                    </label>
                    <input
                      type="number"
                      value={installationCostPerRm || ''}
                      onChange={(e) => {
                        setInstallationCostPerRm(e.target.value ? parseFloat(e.target.value) : null);
                        setIsCostConfirmed(false);
                        setIsEditingCost(false);
                      }}
                      placeholder="Enter installation cost per rm"
                      className="input-premium w-full md:w-1/2 px-6 py-4 text-white placeholder-slate-400"
                      disabled={(!isQuotationComplete) || (isCostConfirmed && !isEditingCost)}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Confirm Cost Inputs Button */}
            {(!isCostConfirmed || isEditingCost) && ratePerKg !== null && ratePerKg > 0 && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => {
                    setIsCostConfirmed(true);
                    setIsEditingCost(false);
                  }}
                  className="btn-premium-gold btn-ripple btn-press btn-3d px-8 py-3 text-lg shimmer relative overflow-hidden"
                  style={{
                    boxShadow: '0 0 20px rgba(209, 168, 90, 0.3)',
                  }}
                >
                  ✓ Confirm Cost Inputs
                </button>
              </div>
            )}
            
            {isCostConfirmed && !isEditingCost && (
              <div className="mt-4 p-4 bg-green-500/20 border border-green-400/50 rounded-xl backdrop-blur-sm animate-fade-up flex items-center justify-between">
                <p className="text-green-200 text-sm font-medium flex items-center space-x-2">
                  <span>✓</span>
                  <span>Cost inputs confirmed. You can now proceed with quantity.</span>
                </p>
                <button
                  onClick={() => {
                    setIsEditingCost(true);
                    setIsCostConfirmed(false);
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

        {/* Weight Calculation Breakdown - Only show when quotation is confirmed */}
        {isQuotationConfirmed && ((includeThrieBeam && thrieBeamResult?.found) || (includePost && postResult?.found) || (includeSpacer && spacerResult?.found)) && totalWeight > 0 && (
          <div className="glassmorphic-premium rounded-3xl p-14 border-2 border-premium-gold/50 shadow-2xl slide-up mb-16 card-hover-gold" style={{ animationDelay: '200ms' }}>
            <h3 className="text-3xl font-extrabold text-white mb-8 drop-shadow-lg">Weight Calculation Breakdown</h3>
            
            {/* Individual Part Weights */}
            <div className="mb-8">
              <h4 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2">Individual Part Weights</h4>
              <div className="space-y-3">
                {includeThrieBeam && thrieBeamResult?.found && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Thrie Beam Weight (kg/rm)</span>
                    <span className="text-white font-bold text-lg">{thrieBeamResult.totalWeight?.toFixed(3)} kg/rm</span>
                  </div>
                )}
                {includePost && postResult?.found && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Post Weight (kg/rm)</span>
                    <span className="text-white font-bold text-lg">{postResult.totalWeight?.toFixed(3)} kg/rm</span>
                  </div>
                )}
                {includeSpacer && spacerResult?.found && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Spacer Weight (kg/rm)</span>
                    <span className="text-white font-bold text-lg">{spacerResult.totalWeight?.toFixed(3)} kg/rm</span>
                  </div>
                )}
              </div>
            </div>

            {/* Multipliers per Set */}
            <div className="mb-8 pt-6 border-t border-white/20">
              <h4 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2">Multipliers per Set</h4>
              <div className="space-y-2 text-slate-200">
                {includeThrieBeam && thrieBeamResult?.found && (
                  <p className="font-medium">Thrie Beam × 1</p>
                )}
                {includePost && postResult?.found && (
                  <p className="font-medium">Post × 2</p>
                )}
                {includeSpacer && spacerResult?.found && (
                  <p className="font-medium">Spacer × 2</p>
                )}
                <p className="font-medium text-premium-gold">
                  Fasteners = {fastenerMode === 'default' 
                    ? `${calculateFastenerWeight().toFixed(3)} kg (Default)`
                    : `${calculateFastenerWeight().toFixed(3)} kg (Manual)`}
                </p>
              </div>
            </div>

            {/* Total Weight per Set Calculation */}
            <div className="mb-8 pt-6 border-t border-white/20">
              <h4 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2">Total Weight per Set</h4>
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <div className="text-slate-300 text-sm font-mono space-y-1">
                  {includeThrieBeam && thrieBeamResult?.found && (
                    <div>Thrie Beam: {thrieBeamResult.totalWeight?.toFixed(3)} × 1 = {(thrieBeamResult.totalWeight || 0).toFixed(3)} kg</div>
                  )}
                  {includePost && postResult?.found && (
                    <div>Post: {postResult.totalWeight?.toFixed(3)} × 2 = {((postResult.totalWeight || 0) * 2).toFixed(3)} kg</div>
                  )}
                  {includeSpacer && spacerResult?.found && (
                    <div>Spacer: {spacerResult.totalWeight?.toFixed(3)} × 2 = {((spacerResult.totalWeight || 0) * 2).toFixed(3)} kg</div>
                  )}
                  {fastenerMode === 'default' ? (
                    <div>Fasteners (Default): {calculateFastenerWeight().toFixed(3)} kg</div>
                  ) : (
                    <>
                      <div>Hex Bolts: {hexBoltQty} × 0.135 = {(hexBoltQty * 0.135).toFixed(3)} kg</div>
                      <div>Button Bolts: {buttonBoltQty} × 0.145 = {(buttonBoltQty * 0.145).toFixed(3)} kg</div>
                      <div>Fasteners (Manual): {calculateFastenerWeight().toFixed(3)} kg</div>
                    </>
                  )}
                  <div className="pt-2 border-t border-white/20 mt-2 font-bold text-white">
                    Total Set Weight = {totalSetWeight.toFixed(3)} kg/set
                  </div>
                </div>
              </div>
            </div>

            {/* Weight per Running Metre */}
            <div className="pt-6 border-t border-white/20">
              <h4 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2">Weight per Running Metre</h4>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-slate-300 text-sm font-mono mb-2">
                  Total Weight per Running Metre = {totalSetWeight.toFixed(3)} ÷ 4
                </div>
                <div className="text-2xl font-extrabold text-premium-gold">
                  {totalWeight.toFixed(3)} kg/rm
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overall Totals Section - Only show when quotation is confirmed */}
        {isQuotationConfirmed && ((includeThrieBeam && thrieBeamResult?.found) || (includePost && postResult?.found) || (includeSpacer && spacerResult?.found)) && totalWeight > 0 && (
          <div className="glassmorphic-premium rounded-3xl p-14 border-2 border-premium-gold/50 shadow-2xl slide-up mb-16 card-hover-gold" style={{ animationDelay: '250ms' }}>
            <h3 className="text-3xl font-extrabold text-white mb-8 drop-shadow-lg">Summary</h3>
            <div className="space-y-6">
              <div>
                <p className="text-slate-300 text-sm mb-2 font-medium">Total Black Material Weight</p>
                <p className="text-3xl font-bold text-white">{totalBlackWeight.toFixed(3)} kg/rm</p>
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-2 font-medium">Total Zinc Weight</p>
                <p className="text-3xl font-bold text-white">{totalZincWeight.toFixed(3)} kg/rm</p>
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-2 font-medium">Total Weight per Set</p>
                <p className="text-3xl font-bold text-white">{totalSetWeight.toFixed(3)} kg/set</p>
              </div>
              <div>
                <p className="text-slate-300 text-sm mb-2 font-medium">Total Weight per Running Metre</p>
                <p className="text-4xl font-extrabold text-premium-gold drop-shadow-lg">{totalWeight.toFixed(3)} kg/rm</p>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Card - Different layout for manual vs default mode */}
        {((fastenerMode === 'manual' && calculateFastenerWeight() > 0 && ratePerKg !== null && ratePerKg > 0) || 
          (fastenerMode === 'default' && totalWeight > 0 && ratePerKg !== null && ratePerKg > 0)) && (
          <div className="glassmorphic-premium rounded-3xl p-14 border-2 border-premium-gold/50 shadow-2xl slide-up mb-16 card-hover-gold" style={{ animationDelay: '300ms' }}>
            {fastenerMode === 'manual' ? (
              // Manual Mode: Different layout - Cost per kg and Final Price
              <div>
                <h3 className="text-3xl font-extrabold text-white mb-8 drop-shadow-lg text-center">Fastener Cost Breakdown</h3>
                <div className="space-y-6">
                  {/* Fastener Weight */}
                  <div>
                    <p className="text-slate-300 text-sm mb-2 font-medium">Total Fastener Weight</p>
                    <p className="text-2xl font-bold text-white">{calculateFastenerWeight().toFixed(3)} kg</p>
                  </div>
                  
                  {/* Cost */}
                  <div className="space-y-4 pt-4 border-t border-white/20">
                    <h4 className="text-xl font-bold text-white mb-4">Cost</h4>
                    
                    {materialCostPerRm !== null && materialCostPerRm > 0 && (
                      <div>
                        <p className="text-slate-300 text-sm mb-1">Material Cost</p>
                        <p className="text-lg font-semibold text-white">
                          {calculateFastenerWeight().toFixed(3)} kg × ₹{debouncedRatePerKg?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /kg
                        </p>
                        <p className="text-xl font-bold text-white mt-1">
                          = ₹{materialCostPerRm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                    
                    {transportCostPerRm !== null && transportCostPerRm > 0 && (
                      <div className="pt-4">
                        <p className="text-slate-300 text-sm mb-1">Transportation Cost</p>
                        <p className="text-lg font-semibold text-white">
                          {calculateFastenerWeight().toFixed(3)} kg × ₹{debouncedTransportCostPerKg?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /kg
                        </p>
                        <p className="text-xl font-bold text-white mt-1">
                          = ₹{transportCostPerRm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                    
                    {/* Total Cost */}
                    {(materialCostPerRm !== null && materialCostPerRm > 0) && (
                      <div className="pt-6 border-t border-white/20 mt-4">
                        <p className="text-slate-300 text-sm mb-1">Total Cost</p>
                        <p className="text-2xl font-bold text-premium-gold">
                          ₹{((materialCostPerRm || 0) + (transportCostPerRm || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Final Total */}
                  {finalTotal !== null && finalTotal > 0 && (
                    <div className="pt-6 border-t-2 border-premium-gold/50 mt-6">
                      <p className="text-slate-300 text-sm mb-2 font-medium">Final Total Price</p>
                      <p className="text-4xl font-extrabold text-premium-gold drop-shadow-lg">
                        ₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xl text-premium-gold/90 mt-2">({formatIndianUnits(finalTotal)})</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Default Mode: Original layout - Per rm vs Total
              <div>
                <h3 className="text-3xl font-extrabold text-white mb-8 drop-shadow-lg text-center">Cost Comparison</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Side: Cost Per Running Metre */}
                  <div className="space-y-4">
                    <h4 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2">Cost Per Running Metre</h4>
                    {materialCostPerRm !== null && materialCostPerRm > 0 && (
                      <div>
                        <p className="text-slate-300 text-sm mb-1">Material Cost</p>
                        <p className="text-xl font-bold text-white">
                          ₹{materialCostPerRm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /rm
                        </p>
                      </div>
                    )}
                    {transportCostPerRm !== null && transportCostPerRm > 0 && (
                      <div>
                        <p className="text-slate-300 text-sm mb-1">Transportation Cost</p>
                        <p className="text-xl font-bold text-white">
                          ₹{transportCostPerRm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /rm
                        </p>
                      </div>
                    )}
                    {includeInstallation && installationCostPerRmValue > 0 && (
                      <div>
                        <p className="text-slate-300 text-sm mb-1">Installation Cost</p>
                        <p className="text-xl font-bold text-white">
                          ₹{installationCostPerRmValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /rm
                        </p>
                      </div>
                    )}
                    {totalCostPerRm !== null && (
                    <div className="pt-4 border-t border-white/20 mt-4">
                      <p className="text-slate-300 text-sm mb-2 font-medium">Total Cost per Running Metre</p>
                      <p className="text-3xl font-extrabold text-premium-gold drop-shadow-lg">
                        ₹{totalCostPerRm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /rm
                      </p>
                      <p className="text-lg text-premium-gold/90 mt-1">({formatIndianUnits(totalCostPerRm)})</p>
                    </div>
                    )}
                  </div>

                  {/* Right Side: Total Cost for Given Quantity */}
                  <div className="space-y-4">
                    <h4 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2">Total Cost for Quantity</h4>
                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-2">
                        Quantity (Running Metres Required)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantityRm || ''}
                        onChange={(e) => {
                          setQuantityRm(e.target.value ? parseFloat(e.target.value) : null);
                          setIsQuantityConfirmed(false);
                          setIsEditingQuantity(false);
                        }}
                        placeholder="Enter quantity"
                        className="input-premium input-focus-glow w-full px-4 py-3 text-white placeholder-slate-400"
                        disabled={isQuantityConfirmed && !isEditingQuantity}
                      />
                    </div>
                    {isCostConfirmed && (!isQuantityConfirmed || isEditingQuantity) && quantityRm !== null && quantityRm > 0 && (
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={() => {
                            setIsQuantityConfirmed(true);
                            setIsEditingQuantity(false);
                          }}
                          className="btn-premium-gold btn-ripple btn-press btn-3d px-8 py-3 text-lg shimmer relative overflow-hidden"
                          style={{
                            boxShadow: '0 0 20px rgba(209, 168, 90, 0.3)',
                          }}
                        >
                          ✓ Confirm Quantity
                        </button>
                      </div>
                    )}
                    
                    {isQuantityConfirmed && !isEditingQuantity && (
                      <div className="mt-4 p-4 bg-green-500/20 border border-green-400/50 rounded-xl backdrop-blur-sm animate-fade-up flex items-center justify-between">
                        <p className="text-green-200 text-sm font-medium flex items-center space-x-2">
                          <span>✓</span>
                          <span>Quantity confirmed.</span>
                        </p>
                        <button
                          onClick={() => {
                            setIsEditingQuantity(true);
                            setIsQuantityConfirmed(false);
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
                    
                    {isQuantityConfirmed && finalTotal !== null && finalTotal > 0 && (
                      <div className="pt-4 border-t border-white/20 mt-4">
                        <p className="text-slate-300 text-sm mb-2 font-medium">Final Total</p>
                        <p className="text-3xl font-extrabold text-premium-gold drop-shadow-lg">
                          ₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-lg text-premium-gold/90 mt-1">({formatIndianUnits(finalTotal)})</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save Quotation Button - Only show when quotation, cost, and quantity are confirmed - Hidden for MBCB and Admin users */}
        {!isViewOnlyUser && isQuotationConfirmed && isCostConfirmed && isQuantityConfirmed && ((fastenerMode === 'manual' && calculateFastenerWeight() > 0 && ratePerKg !== null && ratePerKg > 0) || 
          (fastenerMode === 'default' && totalWeight > 0 && ratePerKg !== null && ratePerKg > 0)) && (
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
            <button
              onClick={handleSaveQuotation}
              disabled={isSaving}
              className="btn-premium-gold px-12 py-4 text-lg shimmer relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                boxShadow: '0 0 20px rgba(209, 168, 90, 0.3)',
              }}
            >
              {isSaving ? '⏳ Saving...' : '💾 Save Quotation'}
            </button>
          </div>
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
    </div>
  );
}
