'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import DatePicker from 'react-datepicker';
import SmartDropdown from '@/components/forms/SmartDropdown';
import SubAccountSelect from '@/components/forms/SubAccountSelect';
import AccountSelect from '@/components/forms/AccountSelect';
import ContactSelect from '@/components/forms/ContactSelect';
import StateCitySelect from '@/components/forms/StateCitySelect';
import { PortalPopperContainer } from '@/components/ui/PortalPopperContainer';
import Toast from '@/components/ui/Toast';
import { useUser } from '@/contexts/UserContext';
import { findMbcbRow } from '@/lib/utils/mbcbData';
import { calculateWBeamWeights } from '@/lib/calculations/wBeamCalculations';
import { calculatePostWeights } from '@/lib/calculations/postCalculations';
import { calculateSpacerWeights } from '@/lib/calculations/spacerCalculations';
import { useDebounce } from '@/hooks/useDebounce';
import { generateQuotationPDF, getHSNCode as getPDFHSNCode, loadLogoAsBase64 } from '@/lib/utils/quotationPdf';
import { validateQuotationPricing, formatValidationMessage } from '@/lib/services/quotationPricingValidation';
import { useAIPricing } from '@/hooks/useAIPricing';
import AIPricingModal from '@/components/pricing/AIPricingModal';
import { lookupHistoricalMBCBQuote, type HistoricalQuoteMatch } from '@/lib/services/historicalQuoteLookup';
import HistoricalPricingAlert from '@/components/pricing/HistoricalPricingAlert';

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

// Hardcoded dropdown values
const W_BEAM_THICKNESS = [2.0, 2.05, 2.1, 2.15, 2.2, 2.25, 2.3, 2.35, 2.4, 2.45, 2.5, 2.55, 2.6, 2.65, 2.7, 2.75, 2.8, 2.85, 2.9, 2.95, 3.0];
const W_BEAM_COATING = [350, 400, 450, 500, 550];

const POST_THICKNESS = [4.0, 4.05, 4.1, 4.15, 4.2, 4.25, 4.3, 4.35, 4.4, 4.45, 4.5, 4.55, 4.6, 4.65, 4.7, 4.75, 4.8, 4.85, 4.9, 4.95, 5.0];
const POST_LENGTH = [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000];
const POST_COATING = [350, 400, 450, 500, 550];

const SPACER_THICKNESS = [4.0, 4.05, 4.1, 4.15, 4.2, 4.25, 4.3, 4.35, 4.4, 4.45, 4.5, 4.55, 4.6, 4.65, 4.7, 4.75, 4.8, 4.85, 4.9, 4.95, 5.0];
const SPACER_LENGTH = [330, 360];
const SPACER_COATING = [350, 400, 450, 500, 550];

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

export default function DoubleWBeamPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { username } = useUser();
  
  // Edit mode state
  const editId = searchParams?.get('edit');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);
  
  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Load admin status from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    }
  }, []);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Save state to prevent duplicate saves
  const [isSaving, setIsSaving] = useState(false);
  
  // AI Pricing state
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const { isLoading: isAILoading, error: aiError, result: aiResult, analyzePricing, reset: resetAI } = useAIPricing();
  
  // AI Suggestion tracking (for persistence)
  const [aiSuggestedPrice, setAiSuggestedPrice] = useState<number | null>(null);
  const [aiWinProbability, setAiWinProbability] = useState<number | null>(null);
  const [aiPricingInsights, setAiPricingInsights] = useState<Record<string, any> | null>(null);
  const [userAppliedAI, setUserAppliedAI] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [showOverrideReasonField, setShowOverrideReasonField] = useState<boolean>(false);
  
  // Historical pricing recall
  const [historicalMatch, setHistoricalMatch] = useState<HistoricalQuoteMatch | null>(null);
  const [isLookingUpHistory, setIsLookingUpHistory] = useState(false);
  
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
  
  // Address states for PDF
  const [shipToAddress, setShipToAddress] = useState<{
    name: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } | null>(null);
  const [billToAddress, setBillToAddress] = useState<{
    name: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstNumber?: string;
  } | null>(null);
  
  // Check if all quotation fields are filled
  // For admin users, always treat as complete (they don't have quotation information card)
  const isQuotationComplete = isAdmin || (stateId !== null && cityId !== null && 
                               quotationDate.trim() !== '' && 
                               estimateDate !== null && 
                               expiryDate !== null && 
                               accountId !== null &&
                               subAccountId !== null &&
                               termsAndConditions.trim() !== '' && 
                               purpose.trim() !== '' && 
                               customerName.trim() !== '' &&
                               contactId !== null);
  
  // Check if user is MBCB (price checking only, no save)
  // Admin users can save quotes, only MBCB users are view-only
  const isMBCBUser = username === 'MBCB';
  const isViewOnlyUser = isMBCBUser; // Only MBCB users are view-only, admin can save
  
  // Track if quotation information is confirmed
  // For MBCB users and Admin users, always treat as confirmed (they skip quotation details)
  const [isQuotationConfirmed, setIsQuotationConfirmed] = useState<boolean>(isViewOnlyUser);
  const [isEditingQuotation, setIsEditingQuotation] = useState<boolean>(false);
  
  // Auto-confirm quotation for admin users when isAdmin is loaded
  useEffect(() => {
    if (isAdmin) {
      setIsQuotationConfirmed(true);
    }
  }, [isAdmin]);
  
  // Track if cost inputs are confirmed
  const [isCostConfirmed, setIsCostConfirmed] = useState<boolean>(false);
  const [isEditingCost, setIsEditingCost] = useState<boolean>(false);
  
  // Track if pincode inputs are confirmed
  const [isPincodeConfirmed, setIsPincodeConfirmed] = useState<boolean>(false);
  const [isEditingPincode, setIsEditingPincode] = useState<boolean>(false);
  
  // Track if parts are being edited
  const [isEditingWBeam, setIsEditingWBeam] = useState<boolean>(false);
  const [isEditingPost, setIsEditingPost] = useState<boolean>(false);
  const [isEditingSpacer, setIsEditingSpacer] = useState<boolean>(false);
  
  // Track if fasteners are confirmed
  const [isFastenerConfirmed, setIsFastenerConfirmed] = useState<boolean>(false);
  const [isEditingFastener, setIsEditingFastener] = useState<boolean>(false);
  
  // Track if quantity is confirmed
  const [isQuantityConfirmed, setIsQuantityConfirmed] = useState<boolean>(false);
  const [isEditingQuantity, setIsEditingQuantity] = useState<boolean>(false);
  
  // Progressive disclosure steps
  const showDates = stateId !== null && cityId !== null;
  const showAccountSelection = showDates && estimateDate !== null && expiryDate !== null;
  const showCustomerAndPurpose = showAccountSelection && accountId !== null;
  const showTermsAndConditions = showCustomerAndPurpose && subAccountId !== null && contactId !== null && customerName.trim() !== '' && purpose.trim() !== '';
  
  // Fetch sub-account addresses when sub-account is selected
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!accountId || !subAccountId) {
        setShipToAddress(null);
        setBillToAddress(null);
        return;
      }
      
      try {
        const response = await fetch(`/api/subaccounts?account_id=${accountId}`);
        const data = await response.json();
        
        if (data.success && data.subAccounts) {
          const selectedSubAccount = data.subAccounts.find((sa: any) => sa.id === subAccountId);
          if (selectedSubAccount) {
            setShipToAddress({
              name: selectedSubAccount.subAccountName,
              address: selectedSubAccount.address || '',
              city: selectedSubAccount.cityName || '',
              state: selectedSubAccount.stateName || '',
              pincode: selectedSubAccount.pincode || '',
            });
          }
          
          const headquarter = data.subAccounts.find((sa: any) => sa.isHeadquarter === true);
          if (headquarter) {
            setBillToAddress({
              name: headquarter.subAccountName,
              address: headquarter.address || '',
              city: headquarter.cityName || '',
              state: headquarter.stateName || '',
              pincode: headquarter.pincode || '',
              gstNumber: headquarter.gstNumber || '',
            });
          } else if (selectedSubAccount) {
            setBillToAddress({
              name: selectedSubAccount.subAccountName,
              address: selectedSubAccount.address || '',
              city: selectedSubAccount.cityName || '',
              state: selectedSubAccount.stateName || '',
              pincode: selectedSubAccount.pincode || '',
              gstNumber: selectedSubAccount.gstNumber || '',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching sub-account addresses:', error);
      }
    };
    
    fetchAddresses();
  }, [accountId, subAccountId]);
  
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
  
  const [includeWBeam, setIncludeWBeam] = useState<boolean>(true);
  const [includePost, setIncludePost] = useState<boolean>(true);
  const [includeSpacer, setIncludeSpacer] = useState<boolean>(true);
  const [includeTransportation, setIncludeTransportation] = useState<boolean>(false);
  const [includeInstallation, setIncludeInstallation] = useState<boolean>(false);

  // Fasteners state
  const [fastenerMode, setFastenerMode] = useState<'default' | 'manual'>('default');
  const [hexBoltQty, setHexBoltQty] = useState<number>(0);
  const [buttonBoltQty, setButtonBoltQty] = useState<number>(0);

  const [wBeam, setWBeam] = useState<PartInput>({
    thickness: W_BEAM_THICKNESS[0],
    coatingGsm: W_BEAM_COATING[0],
  });
  const [post, setPost] = useState<PartInput>({
    thickness: POST_THICKNESS[0],
    length: POST_LENGTH[0],
    coatingGsm: POST_COATING[0],
  });
  const [spacer, setSpacer] = useState<PartInput>({
    thickness: SPACER_THICKNESS[0],
    length: SPACER_LENGTH[0],
    coatingGsm: SPACER_COATING[0],
  });
  const [ratePerKg, setRatePerKg] = useState<number | null>(null);
  const [transportCostPerKg, setTransportCostPerKg] = useState<number | null>(null);
  const [installationCostPerRm, setInstallationCostPerRm] = useState<number | null>(null);
  const [quantityRm, setQuantityRm] = useState<number | null>(null);
  
  // Transportation pincode and distance state
  const [fromPincode, setFromPincode] = useState<string>('');
  const [toPincode, setToPincode] = useState<string>('');
  const [calculatedDistance, setCalculatedDistance] = useState<{ value: number; text: string } | null>(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState<boolean>(false);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  
  // New AI pricing fields
  const [competitorPricePerUnit, setCompetitorPricePerUnit] = useState<number | null>(null);
  const [clientDemandPricePerUnit, setClientDemandPricePerUnit] = useState<number | null>(null);
  
  // Debounced values for calculations to prevent lag while typing
  const debouncedRatePerKg = useDebounce(ratePerKg, 300);
  const debouncedTransportCostPerKg = useDebounce(transportCostPerKg, 300);
  const debouncedInstallationCostPerRm = useDebounce(installationCostPerRm, 300);
  const debouncedQuantityRm = useDebounce(quantityRm, 300);

  const [wBeamResult, setWBeamResult] = useState<PartResult | null>(null);
  const [postResult, setPostResult] = useState<PartResult | null>(null);
  const [spacerResult, setSpacerResult] = useState<PartResult | null>(null);

  const [totalBlackWeight, setTotalBlackWeight] = useState<number>(0);
  const [totalZincWeight, setTotalZincWeight] = useState<number>(0);
  const [totalWeight, setTotalWeight] = useState<number>(0);
  const [totalSetWeight, setTotalSetWeight] = useState<number>(0);

  // Calculate fastener weight based on mode
  const calculateFastenerWeight = (): number => {
    if (fastenerMode === 'default') {
      return 4; // Default: 4 kg for Double W-Beam
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
      setIncludeWBeam(false);
      setIncludePost(false);
      setIncludeSpacer(false);
      // Clear all part results
      setWBeamResult(null);
      setPostResult(null);
      setSpacerResult(null);
    }
  }, [fastenerMode]);

  // Calculate distance when both pincodes are entered
  useEffect(() => {
    const calculateDistance = async () => {
      if (!fromPincode || !toPincode) {
        setCalculatedDistance(null);
        setDistanceError(null);
        return;
      }

      // Validate pincode format (6 digits)
      const pincodeRegex = /^\d{6}$/;
      if (!pincodeRegex.test(fromPincode) || !pincodeRegex.test(toPincode)) {
        setCalculatedDistance(null);
        setDistanceError(null);
        return;
      }

      // Only calculate if both pincodes are valid 6-digit numbers
      if (fromPincode.length === 6 && toPincode.length === 6) {
        setIsCalculatingDistance(true);
        setDistanceError(null);
        
        try {
          const response = await fetch('/api/distance/calculate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fromPincode,
              toPincode,
            }),
          });

          const data = await response.json();

          if (data.success && data.distance) {
            setCalculatedDistance({
              value: data.distance.value,
              text: data.distance.text,
            });
            setDistanceError(null);
          } else {
            setCalculatedDistance(null);
            setDistanceError(data.error || 'Failed to calculate distance');
          }
        } catch (error) {
          console.error('Error calculating distance:', error);
          setCalculatedDistance(null);
          setDistanceError('Failed to calculate distance. Please try again.');
        } finally {
          setIsCalculatingDistance(false);
        }
      }
    };

    // Debounce the distance calculation
    const timeoutId = setTimeout(calculateDistance, 800);
    return () => clearTimeout(timeoutId);
  }, [fromPincode, toPincode]);

  // Function to update overall totals with multipliers and fasteners (Double W-Beam)
  // Double W-Beam: W-Beam × 2, Post × 2, Spacer × 4, Fasteners (default or manual)
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
    const wBeamWeight = includeWBeam && wBeamResult?.found ? (wBeamResult.totalWeight || 0) : 0;
    const postWeight = includePost && postResult?.found ? (postResult.totalWeight || 0) : 0;
    const spacerWeight = includeSpacer && spacerResult?.found ? (spacerResult.totalWeight || 0) : 0;
    
    // Calculate fastener weight based on mode
    const fastenersWeight = calculateFastenerWeight();
    
    // Calculate total set weight with multipliers
    // totalSetWeightKg = (2 × wBeamWeight) + (2 × postWeight) + (4 × spacerWeight) + fastenersWeight
    const totalSetWeightKg = (2 * wBeamWeight) + (2 * postWeight) + (4 * spacerWeight) + fastenersWeight;
    
    // Total weight per running metre = totalSetWeightKg / 4
    const totalWeightPerRmKg = totalSetWeightKg / 4;
    
    // Calculate black and zinc totals for display (with multipliers)
    const wBeamBlack = includeWBeam && wBeamResult?.found ? (wBeamResult.weightBlackMaterial || 0) * 2 : 0;
    const wBeamZinc = includeWBeam && wBeamResult?.found ? (wBeamResult.weightZincAdded || 0) * 2 : 0;
    const postBlack = includePost && postResult?.found ? (postResult.weightBlackMaterial || 0) * 2 : 0;
    const postZinc = includePost && postResult?.found ? (postResult.weightZincAdded || 0) * 2 : 0;
    const spacerBlack = includeSpacer && spacerResult?.found ? (spacerResult.weightBlackMaterial || 0) * 4 : 0;
    const spacerZinc = includeSpacer && spacerResult?.found ? (spacerResult.weightZincAdded || 0) * 4 : 0;
    
    setTotalBlackWeight(wBeamBlack + postBlack + spacerBlack);
    setTotalZincWeight(wBeamZinc + postZinc + spacerZinc);
    setTotalSetWeight(totalSetWeightKg);
    setTotalWeight(totalWeightPerRmKg); // Store kgPerRm in totalWeight
  };

  // Load quotation data for edit mode
  useEffect(() => {
    if (editId && !isLoadingEditData && !isEditMode) {
      const loadEditData = async () => {
        setIsLoadingEditData(true);
        try {
          const response = await fetch(`/api/quotes/${editId}?product_type=mbcb`);
          if (!response.ok) {
            throw new Error('Failed to load quotation');
          }
          const { data } = await response.json();
          
          if (data) {
            setIsEditMode(true);
            setEditingQuoteId(data.id);
            
            // Load basic quotation info
            setStateId(data.state_id);
            setCityId(data.city_id);
            setPurpose(data.purpose || '');
            setSubAccountId(data.sub_account_id);
            setSubAccountName(data.sub_account_name || '');
            setContactId(data.contact_id);
            setCustomerName(data.customer_name || '');
            
            // Load dates
            if (data.date) {
              const dateParts = data.date.includes('-') 
                ? data.date.split('-')
                : data.date.split('/');
              if (dateParts.length === 3) {
                const [year, month, day] = data.date.includes('-') 
                  ? dateParts 
                  : [dateParts[2], dateParts[1], dateParts[0]];
                setEstimateDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
              }
            }
            
            // Load estimate number
            if (data.pdf_estimate_number) {
              setEstimateNumber(data.pdf_estimate_number);
            }
            
            // Load raw payload
            const payload = data.raw_payload || {};
            
            // Load parts selection
            setIncludeWBeam(payload.includeWBeam ?? true);
            setIncludePost(payload.includePost ?? true);
            setIncludeSpacer(payload.includeSpacer ?? true);
            setIncludeTransportation(payload.includeTransportation ?? false);
            setIncludeInstallation(payload.includeInstallation ?? false);
            
            // Load part specifications
            if (payload.wBeam) {
              setWBeam(payload.wBeam);
            }
            if (payload.post) {
              setPost(payload.post);
            }
            if (payload.spacer) {
              setSpacer(payload.spacer);
            }
            
            // Load fastener mode
            if (payload.fastenerMode) {
              setFastenerMode(payload.fastenerMode);
              if (payload.fastenerMode === 'manual') {
                setHexBoltQty(payload.hexBoltQty || 0);
                setButtonBoltQty(payload.buttonBoltQty || 0);
              }
            }
            
            // Load results (to restore confirmed states)
            if (payload.wBeamResult) {
              setWBeamResult(payload.wBeamResult);
            }
            if (payload.postResult) {
              setPostResult(payload.postResult);
            }
            if (payload.spacerResult) {
              setSpacerResult(payload.spacerResult);
            }
            
            // Load pricing
            setRatePerKg(payload.ratePerKg || null);
            setTransportCostPerKg(payload.transportCostPerKg || null);
            setInstallationCostPerRm(payload.installationCostPerRm || null);
            setQuantityRm(data.quantity_rm || payload.quantityRm || null);
            
            // Note: totalCostPerRm and finalTotal are computed values, not state
            // They will be recalculated automatically based on the loaded inputs
            
            // Load AI pricing if exists
            if (data.ai_suggested_price_per_unit) {
              setAiSuggestedPrice(data.ai_suggested_price_per_unit);
            }
            if (data.ai_win_probability) {
              setAiWinProbability(data.ai_win_probability);
            }
            if (data.ai_pricing_insights) {
              setAiPricingInsights(data.ai_pricing_insights);
              if (data.ai_pricing_insights.overrideReason) {
                setOverrideReason(data.ai_pricing_insights.overrideReason);
                setShowOverrideReasonField(true);
              }
            }
            
            // Auto-confirm quotation and parts if data exists
            setIsQuotationConfirmed(true);
            setIsEditingQuotation(false);
            if (data.total_cost_per_rm) {
              setIsCostConfirmed(true);
            }
            if (data.quantity_rm) {
              setIsQuantityConfirmed(true);
            }
            
            setToast({ message: 'Quotation loaded for editing', type: 'success' });
          }
        } catch (error) {
          console.error('Error loading quotation for edit:', error);
          setToast({ message: 'Failed to load quotation for editing', type: 'error' });
        } finally {
          setIsLoadingEditData(false);
        }
      };
      
      loadEditData();
    }
  }, [editId]);

  // Reset all state when navigating to this page - only on mount
  useEffect(() => {
    // Only reset if we're actually on this page and state hasn't been initialized and not in edit mode
    if (pathname === '/mbcb/double-w-beam' && !wBeamResult && !postResult && !spacerResult && !isEditMode) {
      // Reset all form states to defaults
      setIncludeWBeam(true);
      setIncludePost(true);
      setIncludeSpacer(true);
      setIncludeTransportation(false);
      setIncludeInstallation(false);
      
      setWBeam({
        thickness: W_BEAM_THICKNESS[0],
        coatingGsm: W_BEAM_COATING[0],
      });
      setPost({
        thickness: POST_THICKNESS[0],
        length: POST_LENGTH[0],
        coatingGsm: POST_COATING[0],
      });
      setSpacer({
        thickness: SPACER_THICKNESS[0],
        length: SPACER_LENGTH[0],
        coatingGsm: SPACER_COATING[0],
      });
      
      setRatePerKg(null);
      setTransportCostPerKg(null);
      setInstallationCostPerRm(null);
      setQuantityRm(null);
      
      setFromPincode('');
      setToPincode('');
      setCalculatedDistance(null);
      setDistanceError(null);
      
      setFastenerMode('default');
      setHexBoltQty(0);
      setButtonBoltQty(0);
      
      setWBeamResult(null);
      setPostResult(null);
      setSpacerResult(null);
      
      setTotalBlackWeight(0);
      setTotalZincWeight(0);
      setTotalWeight(0);
      setTotalSetWeight(0);
    }
  }, [isEditMode]); // Only run on mount or when edit mode changes

  // Update totals whenever any result or selection changes
  useEffect(() => {
    updateOverallTotals();
  }, [wBeamResult, postResult, spacerResult, includeWBeam, includePost, includeSpacer, fastenerMode, hexBoltQty, buttonBoltQty]);

  const handleConfirmWBeam = () => {
    if (!wBeam.thickness || !wBeam.coatingGsm) {
      setWBeamResult({ found: false, error: 'Please select thickness and coating GSM' });
      return;
    }

    // Use formula-based calculation for W-Beam
    const weights = calculateWBeamWeights({
      thicknessMm: wBeam.thickness,
      coatingGsm: wBeam.coatingGsm,
    });
    
    setWBeamResult({
      found: true,
      weightBlackMaterial: weights.blackMaterialWeightKg,
      weightZincAdded: weights.zincWeightKg,
      totalWeight: weights.totalWBeamWeightKg,
    });
    // Totals will update automatically via useEffect
  };

  const handleConfirmPost = () => {
    if (!post.thickness || !post.length || !post.coatingGsm) {
      setPostResult({ found: false, error: 'Please select thickness, length, and coating GSM' });
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
    if (!spacer.thickness || !spacer.length || !spacer.coatingGsm) {
      setSpacerResult({ found: false, error: 'Please select thickness, length, and coating GSM' });
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
    
    // If fasteners are in manual mode, calculate fastener cost separately
    let materialCostPerRm: number | null = null;
    let transportCostPerRm: number | null = null;
    let totalCostPerRm: number | null = null;
    let finalTotal: number | null = null;
    let fastenerMaterialCostPerRm: number | null = null;
    let fastenerTransportCostPerRm: number | null = null;
    
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
      
      // Calculate total cost per rm (only for default mode)
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

  // Historical pricing lookup - triggered when key specs are entered
  useEffect(() => {
    const lookupHistoricalPricing = async () => {
      if (historicalMatch || isLookingUpHistory) return;
      
      const hasWBeamSpecs = includeWBeam && wBeam.thickness && wBeam.coatingGsm;
      const hasPostSpecs = includePost && post.thickness && post.length && post.coatingGsm;
      const hasSpacerSpecs = includeSpacer && spacer.thickness && spacer.length && spacer.coatingGsm;
      
      if (!hasWBeamSpecs && !hasPostSpecs && !hasSpacerSpecs) return;
      
      setIsLookingUpHistory(true);
      
      try {
        const match = await lookupHistoricalMBCBQuote({
          wBeamThickness: wBeam.thickness,
          wBeamCoating: wBeam.coatingGsm,
          postThickness: post.thickness,
          postLength: post.length ?? undefined,
          postCoating: post.coatingGsm ?? undefined,
          spacerThickness: spacer.thickness ?? undefined,
          spacerLength: spacer.length ?? undefined,
          spacerCoating: spacer.coatingGsm,
          includeWBeam,
          includePost,
          includeSpacer,
        });
        
        if (match) {
          setHistoricalMatch(match);
        }
      } catch (error) {
        console.error('Error looking up historical pricing:', error);
      } finally {
        setIsLookingUpHistory(false);
      }
    };
    
    lookupHistoricalPricing();
  }, [
    includeWBeam, wBeam.thickness, wBeam.coatingGsm,
    includePost, post.thickness, post.length, post.coatingGsm,
    includeSpacer, spacer.thickness, spacer.length, spacer.coatingGsm,
    historicalMatch, isLookingUpHistory
  ]);
  
  // Detect if user manually changes price after applying AI suggestion
  useEffect(() => {
    if (userAppliedAI && aiSuggestedPrice && totalCostPerRm) {
      if (Math.abs(totalCostPerRm - aiSuggestedPrice) > 0.01) {
        setShowOverrideReasonField(true);
      }
    }
  }, [totalCostPerRm, userAppliedAI, aiSuggestedPrice]);

  // Calculate GST based on place of supply
  // CORRECT: Telangana (intra-state) = SGST + CGST, Other states (inter-state) = IGST
  const gstCalculations = useMemo(() => {
    if (!finalTotal || finalTotal <= 0) return null;
    
    const isTelangana = stateName.toLowerCase().includes('telangana');
    
    if (isTelangana) {
      // For Telangana (intra-state), apply 9% SGST + 9% CGST
      const sgst = finalTotal * 0.09;
      const cgst = finalTotal * 0.09;
      return {
        sgst,
        cgst,
        igst: 0,
        totalWithGST: finalTotal + sgst + cgst,
        isTelangana: true,
      };
    } else {
      // For other states (inter-state), apply 18% IGST
      const igst = finalTotal * 0.18;
      return {
        sgst: 0,
        cgst: 0,
        igst,
        totalWithGST: finalTotal + igst,
        isTelangana: false,
      };
    }
  }, [finalTotal, stateName]);

  // AI Pricing Handlers
  const handleGetAISuggestion = async () => {
    if (!totalCostPerRm || totalCostPerRm <= 0) {
      setToast({ message: 'Please calculate pricing first before getting AI suggestion', type: 'error' });
      return;
    }

    if (!quantityRm || quantityRm <= 0) {
      setToast({ message: 'Please enter quantity before getting AI suggestion', type: 'error' });
      return;
    }

    const productSpecs: Record<string, any> = {
      wBeamThickness: `${wBeam.thickness}mm`,
      wBeamCoating: `${wBeam.coatingGsm} GSM`,
      type: 'Double W-Beam',
    };
    
    if (includePost) {
      productSpecs.postThickness = `${post.thickness}mm`;
      productSpecs.postLength = `${post.length}mm`;
      productSpecs.postCoating = `${post.coatingGsm} GSM`;
    }
    
    if (includeSpacer) {
      productSpecs.spacerThickness = `${spacer.thickness}mm`;
      productSpecs.spacerLength = `${spacer.length}mm`;
      productSpecs.spacerCoating = `${spacer.coatingGsm} GSM`;
    }

    setIsAIModalOpen(true);
    resetAI();

    try {
      await analyzePricing({
        productType: 'mbcb',
        ourPricePerUnit: totalCostPerRm,
        competitorPricePerUnit: competitorPricePerUnit || null,
        clientDemandPricePerUnit: clientDemandPricePerUnit || null,
        quantity: quantityRm,
        productSpecs,
      });
    } catch (error: any) {
      setToast({ message: `AI Analysis Failed: ${error.message}`, type: 'error' });
    }
  };

  const handleApplyAIPrice = (suggestedPrice: number) => {
    if (totalWeight && totalWeight > 0) {
      const currentTransportCost = includeTransportation && transportCostPerKg ? totalWeight * transportCostPerKg : 0;
      const currentInstallationCost = includeInstallation ? (installationCostPerRm || 0) : 0;
      const newRatePerKg = (suggestedPrice - currentTransportCost - currentInstallationCost) / totalWeight;
      
      if (newRatePerKg > 0) {
        setRatePerKg(parseFloat(newRatePerKg.toFixed(2)));
        
        // Store AI suggestion data for persistence
        if (aiResult) {
          setAiSuggestedPrice(aiResult.guaranteedWinPrice);
          setAiWinProbability(aiResult.winProbability);
          setAiPricingInsights({
            reasoning: aiResult.reasoning,
            suggestions: aiResult.suggestions,
            appliedByUser: true,
            appliedAt: new Date().toISOString(),
          });
          setUserAppliedAI(true);
          setShowOverrideReasonField(false);
        }
        
        setToast({ message: `Applied AI suggested price: ₹${suggestedPrice.toFixed(2)}/rm`, type: 'success' });
      } else {
        setToast({ message: 'Cannot apply suggested price - would result in negative rate', type: 'error' });
      }
    }
  };

  const handleCloseAIModal = () => {
    // Store AI suggestion data even if user doesn't apply it
    if (aiResult && !userAppliedAI) {
      setAiSuggestedPrice(aiResult.guaranteedWinPrice);
      setAiWinProbability(aiResult.winProbability);
      setAiPricingInsights({
        reasoning: aiResult.reasoning,
        suggestions: aiResult.suggestions,
        appliedByUser: false,
        viewedAt: new Date().toISOString(),
      });
      setShowOverrideReasonField(true);
    }
    
    setIsAIModalOpen(false);
    resetAI();
  };
  
  // Historical pricing handlers
  const handleApplyHistoricalPrice = (price: number) => {
    const fixedCosts = 
      (includeTransportation ? (transportCostPerRm ?? 0) : 0) +
      (includeInstallation ? (installationCostPerRm ?? 0) : 0);
    
    const targetMaterialCost = price - fixedCosts;
    
    if (targetMaterialCost <= 0) {
      setToast({ 
        message: 'Cannot apply historical price - it is lower than fixed costs', 
        type: 'error' 
      });
      return;
    }
    
    // Use the totalWeight state which already contains weight per running meter
    const weightPerRm = totalWeight;
    
    if (weightPerRm <= 0) {
      setToast({ 
        message: 'Cannot calculate rate - total weight is zero', 
        type: 'error' 
      });
      return;
    }
    
    const newRatePerKg = targetMaterialCost / weightPerRm;
    setRatePerKg(newRatePerKg);
    
    setToast({ 
      message: `Applied historical price of ₹${price.toFixed(2)}/rm`, 
      type: 'success' 
    });
  };
  
  const handleDismissHistoricalMatch = () => {
    setHistoricalMatch(null);
  };

  // Save Quotation and Generate PDF Function (combined for employees)
  const handleSaveQuotation = async () => {
    // Prevent duplicate saves
    if (isSaving) {
      return;
    }

    // Admin should never be allowed to save or generate PDFs
    const currentUsername = username || (typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin');
    if (currentUsername === 'Admin') {
      setToast({ message: 'Admins cannot save quotations', type: 'error' });
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

    if (!finalTotal || !gstCalculations) {
      setToast({ message: 'Please complete all calculations before saving', type: 'error' });
      return;
    }

    // ============================================
    // PRICING VALIDATION
    // ============================================
    if (totalCostPerRm && totalCostPerRm > 0) {
      const validationResult = validateQuotationPricing({
        quoted_price_per_unit: totalCostPerRm,
        cost_per_unit: materialCostPerRm || 0,
        competitor_price_per_unit: competitorPricePerUnit,
        client_demand_price_per_unit: clientDemandPricePerUnit,
      });

      // Show errors (blocking)
      if (validationResult.errors.length > 0) {
        const errorMessages = validationResult.errors
          .map(err => formatValidationMessage(err))
          .join('\n');
        setToast({ message: errorMessages, type: 'error' });
        return; // Required
      }

      // Show warnings (non-blocking, but inform user)
      if (validationResult.warnings.length > 0) {
        const warningMessages = validationResult.warnings
          .map(warn => formatValidationMessage(warn))
          .join('\n\n');
        
        // Show warning toast but allow save to continue
        setToast({ message: `⚠️ Warning:\n${warningMessages}`, type: 'error' });
        
        // Optional: Add a small delay so user can see the warning
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsSaving(true);
    
    try {
      
      let pdfEstimateNumber = estimateNumber;
      // Only fetch new estimate number if NOT in edit mode
      // In edit mode, preserve the existing estimate number
      if (!isEditMode) {
        // If estimate number is empty, fetch a new one
        if (!pdfEstimateNumber) {
          try {
            const estResponse = await fetch('/api/estimate/next-number', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            if (estResponse.ok) {
              const estData = await estResponse.json();
              if (estData.estimateNumber) {
                pdfEstimateNumber = estData.estimateNumber;
                setEstimateNumber(pdfEstimateNumber); // Update display
              }
            }
          } catch (e) {
            console.log('Could not fetch new estimate number, using existing');
          }
        }
      } else {
        // In edit mode, use the existing estimate number (already loaded from data)
        // If for some reason it's empty, keep it empty (don't generate new one)
        pdfEstimateNumber = estimateNumber || '';
      }
      
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
        section: 'Double W-Beam',
        state_id: stateId,
        city_id: cityId,
        account_id: accountId, // Add account ID
        sub_account_id: subAccountId,
        contact_id: contactId, // Add contact ID for merge validation
        customer_name: customerName || subAccountName, // Contact name
        sub_account_name: subAccountName, // Actual sub-account name
        purpose: purpose,
        date: dateForDb,
        quantity_rm: quantityRm || null,
        total_weight_per_rm: totalWeight || null,
        total_cost_per_rm: totalCostPerRm || null,
        final_total_cost: finalTotal || null,
        competitor_price_per_unit: competitorPricePerUnit || null,
        client_demand_price_per_unit: clientDemandPricePerUnit || null,
        // AI Pricing fields
        ai_suggested_price_per_unit: aiSuggestedPrice || null,
        ai_win_probability: aiWinProbability || null,
        ai_pricing_insights: aiPricingInsights ? {
          ...aiPricingInsights,
          overrideReason: overrideReason || null,
        } : null,
        pdf_estimate_number: pdfEstimateNumber, // Save PDF estimate number
        created_by: currentUsername,
        is_saved: true,
        raw_payload: {
          username: currentUsername,
          includeWBeam,
          includePost,
          includeSpacer,
          includeTransportation,
          includeInstallation,
          fastenerMode,
          hexBoltQty,
          buttonBoltQty,
          wBeam,
          post,
          spacer,
          wBeamResult,
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

      // Use PUT to update if in edit mode, POST to create new
      const url = isEditMode && editingQuoteId 
        ? `/api/quotes/${editingQuoteId}?product_type=mbcb`
        : '/api/quotes';
      const method = isEditMode && editingQuoteId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-ynm-username': localStorage.getItem('username') || 'Unknown',
        },
        body: JSON.stringify(quotePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setToast({ message: errorData.error || `Error ${isEditMode ? 'updating' : 'saving'} quotation`, type: 'error' });
        setIsSaving(false);
        return;
      }

      // After saving, generate PDF
      try {
        // Load logo
        const logoBase64 = await loadLogoAsBase64();
        
        const items = [];
        
        // Build description for crash barrier components (clubbed together)
        const components = [];
        if (includeWBeam && wBeamResult?.found) {
          components.push(`Double W-Beam (${wBeam.thickness}mm, ${wBeam.coatingGsm} GSM)`);
        }
        if (includePost && postResult?.found) {
          components.push(`Post (${post.thickness}mm, ${post.length}mm, ${post.coatingGsm} GSM)`);
        }
        if (includeSpacer && spacerResult?.found) {
          components.push(`Spacer (${spacer.thickness}mm, ${spacer.length}mm, ${spacer.coatingGsm} GSM)`);
        }
        if (fastenerMode === 'default') {
          components.push('Fasteners (Standard)');
        } else if (fastenerMode === 'manual' && (hexBoltQty > 0 || buttonBoltQty > 0)) {
          components.push(`Fasteners (Hex: ${hexBoltQty}, Button: ${buttonBoltQty})`);
        }
        
        const materialOnlyCost = (materialCostPerRm || 0) * (quantityRm || 0);
        
        // Add main crash barrier item (clubbed together)
        if (components.length > 0) {
          items.push({
            description: `Metal Beam Crash Barrier (Double W-Beam)\n${components.join(', ')}`,
            quantity: quantityRm || 0,
            unit: 'RM',
            hsnCode: getPDFHSNCode('Crash Barrier', 'MBCB'),
            rate: materialCostPerRm || 0,
            amount: materialOnlyCost,
          });
        }

        // Add Transportation if included (separate line item)
        if (includeTransportation && transportCostPerRm && transportCostPerRm > 0) {
          items.push({
            description: 'Transportation Charges',
            quantity: quantityRm || 0,
            unit: 'RM',
            hsnCode: '9965',
            rate: transportCostPerRm,
            amount: transportCostPerRm * (quantityRm || 0),
          });
        }

        // Add Installation if included (separate line item)
        if (includeInstallation && installationCostPerRm && installationCostPerRm > 0) {
          items.push({
            description: 'Installation Charges',
            quantity: quantityRm || 0,
            unit: 'RM',
            hsnCode: '9954',
            rate: installationCostPerRm,
            amount: installationCostPerRm * (quantityRm || 0),
          });
        }

        const formatDate = (date: Date | null) => {
          if (!date) return '';
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        };

        const pdfData = {
          estimateNumber: pdfEstimateNumber,
          estimateDate: formatDate(estimateDate),
          expiryDate: formatDate(expiryDate),
          placeOfSupply: `${cityName}, ${stateName}`,
          billTo: billToAddress || {
            name: accountName || subAccountName,
            address: '',
            city: cityName,
            state: stateName,
            pincode: '',
            gstNumber: '',
          },
          shipTo: shipToAddress || {
            name: subAccountName,
            address: '',
            city: cityName,
            state: stateName,
            pincode: '',
          },
          items: items,
          subtotal: finalTotal,
          sgst: gstCalculations.sgst,
          cgst: gstCalculations.cgst,
          igst: gstCalculations.igst,
          totalAmount: gstCalculations.totalWithGST,
          termsAndConditions: termsAndConditions,
        };

        const pdf = generateQuotationPDF(pdfData, logoBase64 || undefined);
        pdf.save(`Quotation_${pdfEstimateNumber.replace(/\//g, '-')}_${Date.now()}.pdf`);
        
        setToast({ message: `Quotation ${isEditMode ? 'updated' : 'saved'} and PDF generated successfully`, type: 'success' });
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        setToast({ message: 'Quotation saved but PDF generation failed. Please try generating PDF again.', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving quotation:', error);
      setToast({ message: 'Error saving quotation. Please try again.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Generate PDF Function (Employee Only)
  const handleGeneratePDF = async () => {
    if (!isQuotationComplete) {
      setToast({ message: 'Please complete all mandatory quotation fields', type: 'error' });
      return;
    }

    if (!finalTotal || !gstCalculations) {
      setToast({ message: 'Please complete all calculations before generating PDF', type: 'error' });
      return;
    }

    try {
      // Fetch a NEW estimate number for each PDF generated
      let pdfEstimateNumber = estimateNumber;
      try {
        const estResponse = await fetch('/api/estimate/next-number', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (estResponse.ok) {
          const estData = await estResponse.json();
          if (estData.estimateNumber) {
            pdfEstimateNumber = estData.estimateNumber;
            setEstimateNumber(pdfEstimateNumber);
          }
        }
      } catch (e) {
        console.log('Could not fetch new estimate number, using existing');
      }
      
      // Load logo
      const logoBase64 = await loadLogoAsBase64();
      
      const items = [];
      
      // Build description for crash barrier components (clubbed together)
      const components = [];
      if (includeWBeam && wBeamResult?.found) {
        components.push(`Double W-Beam (${wBeam.thickness}mm, ${wBeam.coatingGsm} GSM)`);
      }
      if (includePost && postResult?.found) {
        components.push(`Post (${post.thickness}mm, ${post.length}mm, ${post.coatingGsm} GSM)`);
      }
      if (includeSpacer && spacerResult?.found) {
        components.push(`Spacer (${spacer.thickness}mm, ${spacer.length}mm, ${spacer.coatingGsm} GSM)`);
      }
      if (fastenerMode === 'default') {
        components.push('Fasteners (Standard)');
      } else if (fastenerMode === 'manual' && (hexBoltQty > 0 || buttonBoltQty > 0)) {
        components.push(`Fasteners (Hex: ${hexBoltQty}, Button: ${buttonBoltQty})`);
      }
      
      const materialOnlyCost = (materialCostPerRm || 0) * (quantityRm || 0);
      
      // Add main crash barrier item (clubbed together)
      if (components.length > 0) {
        items.push({
          description: `Metal Beam Crash Barrier (Double W-Beam)\n${components.join(', ')}`,
          quantity: quantityRm || 0,
          unit: 'RM',
          hsnCode: getPDFHSNCode('Crash Barrier', 'MBCB'),
          rate: materialCostPerRm || 0,
          amount: materialOnlyCost,
        });
      }

      // Add Transportation if included (separate line item)
      if (includeTransportation && transportCostPerRm && transportCostPerRm > 0) {
        items.push({
          description: 'Transportation Charges',
          quantity: quantityRm || 0,
          unit: 'RM',
          hsnCode: '9965',
          rate: transportCostPerRm,
          amount: transportCostPerRm * (quantityRm || 0),
        });
      }

      // Add Installation if included (separate line item)
      if (includeInstallation && installationCostPerRm && installationCostPerRm > 0) {
        items.push({
          description: 'Installation Charges',
          quantity: quantityRm || 0,
          unit: 'RM',
          hsnCode: '9954',
          rate: installationCostPerRm,
          amount: installationCostPerRm * (quantityRm || 0),
        });
      }

      const formatDate = (date: Date | null) => {
        if (!date) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const pdfData = {
        estimateNumber: pdfEstimateNumber,
        estimateDate: formatDate(estimateDate),
        expiryDate: formatDate(expiryDate),
        placeOfSupply: `${cityName}, ${stateName}`,
        billTo: billToAddress || {
          name: accountName || subAccountName,
          address: '',
          city: cityName,
          state: stateName,
          pincode: '',
          gstNumber: '',
        },
        shipTo: shipToAddress || {
          name: subAccountName,
          address: '',
          city: cityName,
          state: stateName,
          pincode: '',
        },
        items: items,
        subtotal: finalTotal,
        sgst: gstCalculations.sgst,
        cgst: gstCalculations.cgst,
        igst: gstCalculations.igst,
        totalAmount: gstCalculations.totalWithGST,
        termsAndConditions: termsAndConditions,
      };

      const pdf = generateQuotationPDF(pdfData, logoBase64 || undefined);
      pdf.save(`Quotation_${pdfEstimateNumber.replace(/\//g, '-')}_${Date.now()}.pdf`);
      
      setToast({ message: 'PDF generated successfully', type: 'success' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      setToast({ message: 'Error generating PDF. Please try again.', type: 'error' });
    }
  };


  return (
    <div className="min-h-screen flex flex-col items-start py-12 pt-16 pb-32 relative">
      <div className="w-full max-w-6xl mx-auto px-4">

        {/* Quotation Information Card - Enhanced */}
        {/* Quotation Information Card - Uniform Style - Hidden for MBCB and Admin users */}
        {!isViewOnlyUser && !isAdmin && (
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
            <div className="mt-8 mb-8 flex justify-center">
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
        )}

        {isQuotationConfirmed && fastenerMode === 'default' && (
        <div className="glassmorphic-premium rounded-3xl p-12 mb-16 slide-up card-hover-gold card-3d card-depth">
          <h3 className="text-2xl font-extrabold text-white mb-8 drop-shadow-lg">Select Parts to Include</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <label className="flex items-center space-x-3 cursor-pointer group toggle-glow">
              <input
                type="checkbox"
                checked={includeWBeam}
                onChange={(e) => {
                  setIncludeWBeam(e.target.checked);
                  if (!e.target.checked) {
                    setWBeamResult(null);
                  }
                }}
                className="w-5 h-5 rounded border-white/30 bg-white/10 text-premium-gold focus:ring-2 focus:ring-premium-gold cursor-pointer transition-all"
              />
              <span className="text-slate-200 font-semibold group-hover:text-premium-gold transition-colors">Include W-Beam?</span>
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
        
        {fastenerMode === 'manual' && (
        <div className="glassmorphic-premium rounded-3xl p-12 mb-16 slide-up card-hover-gold border-2 border-premium-gold/50 card-3d card-depth">
          <h3 className="text-2xl font-extrabold text-white mb-4 drop-shadow-lg">Manual Fastener Mode</h3>
          <p className="text-slate-300 text-sm mb-0">
            When selecting fasteners manually, only fasteners are included in the calculation. Other parts (W-Beam, Post, Spacer) are disabled.
          </p>
        </div>
        )}

        {/* Input Cards - Only show when quotation is confirmed */}
        {isQuotationConfirmed && (
        <div className="space-y-10 mb-10">
          {fastenerMode === 'default' && includeWBeam && (
          <div className="glassmorphic-premium rounded-3xl p-12 animate-fade-up card-hover-gold card-3d card-depth">
            <h2 className="text-3xl font-extrabold text-white mb-3 drop-shadow-lg">W-Beam</h2>
            <p className="text-sm text-slate-300 mb-8">Enter parameters to fetch weights from master data.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Thickness (mm)</label>
                <select
                  value={wBeam.thickness || ''}
                  onChange={(e) => {
                    setWBeam({ ...wBeam, thickness: parseFloat(e.target.value) });
                    setWBeamResult(null);
                    setIsEditingWBeam(false);
                  }}
                  className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                  disabled={wBeamResult?.found && !isEditingWBeam}
                >
                  {W_BEAM_THICKNESS.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Coating GSM (g/sq.m)</label>
                <select
                  value={wBeam.coatingGsm || ''}
                  onChange={(e) => {
                    setWBeam({ ...wBeam, coatingGsm: parseFloat(e.target.value) });
                    setWBeamResult(null);
                    setIsEditingWBeam(false);
                  }}
                  className="input-premium w-full px-6 py-4 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
                  disabled={wBeamResult?.found && !isEditingWBeam}
                >
                  {W_BEAM_COATING.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>
            </div>

            {(!wBeamResult?.found || isEditingWBeam) && (
              <button
                onClick={handleConfirmWBeam}
                className="btn-premium-gold btn-ripple btn-press btn-3d px-8 py-3 text-lg shimmer relative overflow-hidden"
                style={{ boxShadow: '0 0 20px rgba(209, 168, 90, 0.3)' }}
              >
                Confirm
              </button>
            )}

            {wBeamResult?.found && !isEditingWBeam && (
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-2 flex-1">
                    <p className="text-slate-200">
                      <span className="font-semibold">Weight of Black Material (kg/rm):</span>{' '}
                      <span className="text-white font-bold">{wBeamResult.weightBlackMaterial?.toFixed(3)} kg/rm</span>
                    </p>
                    <p className="text-slate-200">
                      <span className="font-semibold">Weight of Zinc Added (kg/rm):</span>{' '}
                      <span className="text-white font-bold">{wBeamResult.weightZincAdded?.toFixed(3)} kg/rm</span>
                    </p>
                    <p className="text-slate-200">
                      <span className="font-semibold">Total part weight (kg/rm):</span>{' '}
                      <span className="text-premium-gold font-extrabold text-xl drop-shadow-lg">{wBeamResult.totalWeight?.toFixed(3)} kg/rm</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditingWBeam(true);
                      setWBeamResult(null);
                    }}
                    className="btn-premium-gold btn-ripple btn-press btn-3d px-4 py-2 text-sm ml-4"
                    style={{
                      boxShadow: '0 0 15px rgba(209, 168, 90, 0.3)',
                    }}
                  >
                    ✏️ Edit
                  </button>
                </div>
              </div>
            )}
            {wBeamResult && !wBeamResult.found && (
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-red-200 text-sm font-medium">{wBeamResult.error}</p>
                </div>
              </div>
            )}
          </div>
          )}

          {fastenerMode === 'default' && includePost && (
          <div className="glassmorphic rounded-3xl p-10 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <h2 className="text-3xl font-extrabold text-white mb-3 drop-shadow-lg">Post</h2>
            <p className="text-sm text-slate-300 mb-8">Enter parameters to fetch weights from master data.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Thickness (mm)</label>
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
                  {POST_THICKNESS.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Length (mm)</label>
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
                  {POST_LENGTH.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Coating GSM (g/sq.m)</label>
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
                  {POST_COATING.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>
            </div>

            {(!postResult?.found || isEditingPost) && (
              <button
                onClick={handleConfirmPost}
                className="btn-premium-gold btn-ripple btn-press btn-3d px-8 py-3 text-lg shimmer relative overflow-hidden"
                style={{ boxShadow: '0 0 20px rgba(209, 168, 90, 0.3)' }}
              >
                Confirm
              </button>
            )}

            {postResult?.found && !isEditingPost && (
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-2 flex-1">
                    <p className="text-slate-200">
                      <span className="font-semibold">Weight of Black Material (kg/rm):</span>{' '}
                      <span className="text-white font-bold">{postResult.weightBlackMaterial?.toFixed(3)} kg/rm</span>
                    </p>
                    <p className="text-slate-200">
                      <span className="font-semibold">Weight of Zinc Added (kg/rm):</span>{' '}
                      <span className="text-white font-bold">{postResult.weightZincAdded?.toFixed(3)} kg/rm</span>
                    </p>
                    <p className="text-slate-200">
                      <span className="font-semibold">Total part weight (kg/rm):</span>{' '}
                      <span className="text-premium-gold font-extrabold text-xl drop-shadow-lg">{postResult.totalWeight?.toFixed(3)} kg/rm</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditingPost(true);
                      setPostResult(null);
                    }}
                    className="btn-premium-gold btn-ripple btn-press btn-3d px-4 py-2 text-sm ml-4"
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
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-red-200 text-sm font-medium">{postResult.error}</p>
                </div>
              </div>
            )}
          </div>
          )}

          {fastenerMode === 'default' && includeSpacer && (
          <div className="glassmorphic rounded-3xl p-10 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <h2 className="text-3xl font-extrabold text-white mb-3 drop-shadow-lg">Spacer</h2>
            <p className="text-sm text-slate-300 mb-8">Enter parameters to fetch weights from master data.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Thickness (mm)</label>
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
                  {SPACER_THICKNESS.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Length (mm)</label>
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
                  {SPACER_LENGTH.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Coating GSM (g/sq.m)</label>
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
                  {SPACER_COATING.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>
            </div>

            {(!spacerResult?.found || isEditingSpacer) && (
              <button
                onClick={handleConfirmSpacer}
                className="btn-premium-gold btn-ripple btn-press btn-3d px-8 py-3 text-lg shimmer relative overflow-hidden"
                style={{ boxShadow: '0 0 20px rgba(209, 168, 90, 0.3)' }}
              >
                Confirm
              </button>
            )}

            {spacerResult?.found && !isEditingSpacer && (
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-2 flex-1">
                    <p className="text-slate-200">
                      <span className="font-semibold">Weight of Black Material (kg/rm):</span>{' '}
                      <span className="text-white font-bold">{spacerResult.weightBlackMaterial?.toFixed(3)} kg/rm</span>
                    </p>
                    <p className="text-slate-200">
                      <span className="font-semibold">Weight of Zinc Added (kg/rm):</span>{' '}
                      <span className="text-white font-bold">{spacerResult.weightZincAdded?.toFixed(3)} kg/rm</span>
                    </p>
                    <p className="text-slate-200">
                      <span className="font-semibold">Total part weight (kg/rm):</span>{' '}
                      <span className="text-premium-gold font-extrabold text-xl drop-shadow-lg">{spacerResult.totalWeight?.toFixed(3)} kg/rm</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditingSpacer(true);
                      setSpacerResult(null);
                    }}
                    className="btn-premium-gold btn-ripple btn-press btn-3d px-4 py-2 text-sm ml-4"
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
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-red-200 text-sm font-medium">{spacerResult.error}</p>
                </div>
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
                      setIncludeWBeam(true);
                      setIncludePost(true);
                      setIncludeSpacer(true);
                    }}
                    className="w-5 h-5 border-white/30 bg-white/10 text-premium-gold focus:ring-2 focus:ring-premium-gold cursor-pointer"
                    disabled={isFastenerConfirmed && !isEditingFastener}
                  />
                  <span className="text-slate-200 font-semibold group-hover:text-premium-gold transition-colors">Use Default Fastener Weight (4 kg)</span>
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
                <label className="block text-sm font-semibold text-slate-200 mb-2">Rate per kg (₹/kg)</label>
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
                            setFromPincode('');
                            setToPincode('');
                            setCalculatedDistance(null);
                            setDistanceError(null);
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
                  <div className="mt-4 space-y-4">
                    {/* Pincode inputs */}
                    {!isPincodeConfirmed && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-200 mb-2">
                            From Pincode
                          </label>
                          <input
                            type="text"
                            value={fromPincode}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setFromPincode(value);
                              setIsCostConfirmed(false);
                              setIsEditingCost(false);
                              setIsPincodeConfirmed(false);
                            }}
                            placeholder="Enter 6-digit pincode"
                            className="input-premium w-full px-6 py-4 text-white placeholder-slate-400"
                            disabled={(!isQuotationComplete) || (isCostConfirmed && !isEditingCost)}
                            maxLength={6}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-200 mb-2">
                            To Pincode
                          </label>
                          <input
                            type="text"
                            value={toPincode}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setToPincode(value);
                              setIsCostConfirmed(false);
                              setIsEditingCost(false);
                              setIsPincodeConfirmed(false);
                            }}
                            placeholder="Enter 6-digit pincode"
                            className="input-premium w-full px-6 py-4 text-white placeholder-slate-400"
                            disabled={(!isQuotationComplete) || (isCostConfirmed && !isEditingCost)}
                            maxLength={6}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Confirm Pincode Button */}
                    {!isPincodeConfirmed && fromPincode.length === 6 && toPincode.length === 6 && (
                      <div className="flex justify-center">
                        <button
                          onClick={() => {
                            setIsPincodeConfirmed(true);
                            setIsEditingPincode(false);
                          }}
                          className="btn-premium-gold px-6 py-2 text-sm shimmer relative overflow-hidden"
                          style={{
                            boxShadow: '0 0 15px rgba(209, 168, 90, 0.3)',
                          }}
                        >
                          ✓ Confirm Pincodes
                        </button>
                      </div>
                    )}
                    
                    {/* Confirmed Pincode Display */}
                    {isPincodeConfirmed && !isEditingPincode && (
                      <div className="mt-4 p-4 bg-green-500/20 border border-green-400/50 rounded-xl backdrop-blur-sm animate-fade-up flex items-center justify-between">
                        <div>
                          <p className="text-green-200 text-sm font-medium flex items-center space-x-2 mb-1">
                            <span>✓</span>
                            <span>Pincodes confirmed.</span>
                          </p>
                          <p className="text-slate-300 text-xs">
                            From: <span className="font-semibold">{fromPincode}</span> → To: <span className="font-semibold">{toPincode}</span>
                          </p>
                          {calculatedDistance && (
                            <p className="text-slate-300 text-xs mt-1">
                              Distance: <span className="font-semibold text-blue-300">{calculatedDistance.text}</span>
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setIsEditingPincode(true);
                            setIsPincodeConfirmed(false);
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
                    
                    {/* Distance display - only show when calculating or if there's an error */}
                    {!isPincodeConfirmed && (
                      <>
                        {isCalculatingDistance && (
                          <div className="text-sm text-slate-300 flex items-center space-x-2">
                            <span className="animate-spin">⏳</span>
                            <span>Calculating distance...</span>
                          </div>
                        )}
                        {calculatedDistance && !isCalculatingDistance && !isPincodeConfirmed && (
                          <div className="p-3 bg-blue-500/20 border border-blue-400/50 rounded-lg">
                            <p className="text-sm text-blue-200 font-medium">
                              Distance: <span className="text-blue-100 font-bold">{calculatedDistance.text}</span>
                            </p>
                          </div>
                        )}
                        {distanceError && !isCalculatingDistance && (
                          <div className="p-3 bg-red-500/20 border border-red-400/50 rounded-lg">
                            <p className="text-sm text-red-200">{distanceError}</p>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Transportation Cost input */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-2">Transportation Cost per kg (₹/kg)</label>
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
                  </div>
                )}
              </div>
              {/* Installation Cost - Only show in default mode */}
              {fastenerMode === 'default' && (
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
                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-2">Installation Cost per running meter (₹/rm)</label>
                      <input
                        type="number"
                        value={installationCostPerRm || ''}
                        onChange={(e) => {
                          setInstallationCostPerRm(e.target.value ? parseFloat(e.target.value) : null);
                          setIsCostConfirmed(false);
                          setIsEditingCost(false);
                        }}
                        placeholder="Enter installation cost per running meter"
                        className="input-premium w-full md:w-1/2 px-6 py-4 text-white placeholder-slate-400"
                        disabled={(!isQuotationComplete) || (isCostConfirmed && !isEditingCost)}
                      />
                    </div>
                  )}
                </div>
              )}
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
        {isQuotationConfirmed && ((includeWBeam && wBeamResult?.found) || (includePost && postResult?.found) || (includeSpacer && spacerResult?.found)) && totalWeight > 0 && (
          <div className="glassmorphic-premium rounded-3xl p-14 border-2 border-premium-gold/50 shadow-2xl slide-up mb-16 card-hover-gold" style={{ animationDelay: '200ms' }}>
            <h3 className="text-3xl font-extrabold text-white mb-8 drop-shadow-lg">Weight Calculation Breakdown</h3>
            
            {/* Individual Part Weights */}
            <div className="mb-8">
              <h4 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2">Individual Part Weights</h4>
              <div className="space-y-3">
                {includeWBeam && wBeamResult?.found && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">W Beam Weight (kg/rm)</span>
                    <span className="text-white font-bold text-lg">{wBeamResult.totalWeight?.toFixed(3)} kg/rm</span>
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
                {includeWBeam && wBeamResult?.found && (
                  <p className="font-medium">W Beam × 2</p>
                )}
                {includePost && postResult?.found && (
                  <p className="font-medium">Post × 2</p>
                )}
                {includeSpacer && spacerResult?.found && (
                  <p className="font-medium">Spacer × 4</p>
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
                  {includeWBeam && wBeamResult?.found && (
                    <div>W Beam: {wBeamResult.totalWeight?.toFixed(3)} × 2 = {((wBeamResult.totalWeight || 0) * 2).toFixed(3)} kg</div>
                  )}
                  {includePost && postResult?.found && (
                    <div>Post: {postResult.totalWeight?.toFixed(3)} × 2 = {((postResult.totalWeight || 0) * 2).toFixed(3)} kg</div>
                  )}
                  {includeSpacer && spacerResult?.found && (
                    <div>Spacer: {spacerResult.totalWeight?.toFixed(3)} × 4 = {((spacerResult.totalWeight || 0) * 4).toFixed(3)} kg</div>
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
        {isQuotationConfirmed && ((includeWBeam && wBeamResult?.found) || (includePost && postResult?.found) || (includeSpacer && spacerResult?.found)) && totalWeight > 0 && (
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
                    <>
                      <div className="pt-6 border-t-2 border-premium-gold/50 mt-6">
                        <p className="text-slate-300 text-sm mb-2 font-medium">Subtotal (Before GST)</p>
                        <p className="text-3xl font-bold text-white">
                          ₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      {gstCalculations && (
                        <>
                          <div className="pt-4 border-t border-white/20 mt-4">
                            <p className="text-slate-300 text-sm mb-3 font-medium">GST Breakdown</p>
                            {gstCalculations.isTelangana ? (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-300 text-sm">SGST (9%)</span>
                                  <span className="text-white font-bold">
                                    ₹{gstCalculations.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-300 text-sm">CGST (9%)</span>
                                  <span className="text-white font-bold">
                                    ₹{gstCalculations.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-300 text-sm">IGST (18%)</span>
                                  <span className="text-white font-bold">
                                    ₹{gstCalculations.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="pt-4 border-t-2 border-premium-gold/50 mt-4">
                            <p className="text-slate-300 text-sm mb-2 font-medium">Final Total (Including GST)</p>
                            <p className="text-4xl font-extrabold text-premium-gold drop-shadow-lg">
                              ₹{gstCalculations.totalWithGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xl text-premium-gold/90 mt-2">({formatIndianUnits(gstCalculations.totalWithGST)})</p>
                          </div>
                        </>
                      )}
                    </>
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
                    
                    {/* Historical Pricing Alert */}
                    {historicalMatch && (
                      <HistoricalPricingAlert
                        match={historicalMatch}
                        priceUnit="₹/rm"
                        onApply={handleApplyHistoricalPrice}
                        onDismiss={handleDismissHistoricalMatch}
                      />
                    )}
                    
                    {/* Competitor and Client Demand Price Inputs */}
                    <div className="pt-6 border-t border-white/20 mt-6 space-y-4">
                      <h5 className="text-lg font-bold text-white mb-4">Market Pricing (Optional)</h5>
                      
                      <div>
                        <label className="block text-sm font-semibold text-slate-200 mb-2">
                          Competitor Price Per Unit (₹/rm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={competitorPricePerUnit || ''}
                          onChange={(e) => setCompetitorPricePerUnit(e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="Enter competitor price per rm"
                          className="input-premium w-full px-4 py-3 text-white placeholder-slate-400"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-slate-200 mb-2">
                          Client Demand Price Per Unit (₹/rm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={clientDemandPricePerUnit || ''}
                          onChange={(e) => setClientDemandPricePerUnit(e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="Enter client demand price per rm"
                          className="input-premium w-full px-4 py-3 text-white placeholder-slate-400"
                        />
                      </div>
                      
                      {/* AI Pricing Button */}
                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={handleGetAISuggestion}
                          disabled={!totalCostPerRm || !quantityRm || isAILoading}
                          className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 
                                   hover:from-purple-700 hover:to-blue-700 
                                   disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed
                                   text-white rounded-lg transition-all duration-200 
                                   font-semibold shadow-lg hover:shadow-xl
                                   flex items-center justify-center gap-2"
                        >
                          {isAILoading ? (
                            <>
                              <span className="animate-spin">⚙️</span>
                              <span>Analyzing...</span>
                            </>
                          ) : (
                            <>
                              <span>🤖</span>
                              <span>Get AI Pricing Suggestion</span>
                            </>
                          )}
                        </button>
                        {!totalCostPerRm || !quantityRm ? (
                          <p className="text-xs text-slate-400 mt-2 text-center">
                            Calculate pricing and enter quantity first
                          </p>
                        ) : null}
                      </div>
                      
                      {/* Override Reason Field - shown when user modifies price after AI suggestion */}
                      {showOverrideReasonField && (
                        <div className="pt-4 border-t border-yellow-500/30 mt-4">
                          <label className="block text-sm font-semibold text-yellow-300 mb-2 flex items-center gap-2">
                            <span>⚠️</span>
                            <span>Reason for Overriding AI Suggestion (Optional)</span>
                          </label>
                          <textarea
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder="e.g., Client negotiated lower price, Market conditions changed, etc."
                            className="input-premium w-full px-4 py-3 text-white placeholder-slate-400 min-h-[80px]"
                            rows={3}
                          />
                          <p className="text-xs text-slate-400 mt-2">
                            This helps us improve AI recommendations in the future
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Total Cost for Given Quantity */}
                  <div className="space-y-4">
                    <h4 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2">Total Cost for Quantity</h4>
                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-2">Quantity (Running Metres Required)</label>
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
                      <>
                        <div className="pt-4 border-t border-white/20 mt-4">
                          <p className="text-slate-300 text-sm mb-2 font-medium">Subtotal (Before GST)</p>
                          <p className="text-2xl font-bold text-white">
                            ₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        
                        {gstCalculations && (
                          <>
                            <div className="pt-4 border-t border-white/20 mt-4">
                              <p className="text-slate-300 text-sm mb-3 font-medium">GST Breakdown</p>
                              {gstCalculations.isTelangana ? (
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-300 text-sm">IGST (18%)</span>
                                    <span className="text-white font-bold">
                                      ₹{gstCalculations.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-300 text-sm">SGST (9%)</span>
                                    <span className="text-white font-bold">
                                      ₹{gstCalculations.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-300 text-sm">CGST (9%)</span>
                                    <span className="text-white font-bold">
                                      ₹{gstCalculations.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="pt-4 border-t-2 border-premium-gold/50 mt-4">
                              <p className="text-slate-300 text-sm mb-2 font-medium">Final Total (Including GST)</p>
                              <p className="text-3xl font-extrabold text-premium-gold drop-shadow-lg">
                                ₹{gstCalculations.totalWithGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <p className="text-lg text-premium-gold/90 mt-1">({formatIndianUnits(gstCalculations.totalWithGST)})</p>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save Quotation and Generate PDF Button - Combined for employees - Only show when quotation, cost, and quantity are confirmed - Hidden for MBCB and Admin users */}
        {!isViewOnlyUser && username !== 'Admin' && isQuotationConfirmed && isCostConfirmed && isQuantityConfirmed && ((fastenerMode === 'manual' && calculateFastenerWeight() > 0 && ratePerKg !== null && ratePerKg > 0) || 
          (fastenerMode === 'default' && totalWeight > 0 && ratePerKg !== null && ratePerKg > 0)) && gstCalculations && (
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
            <button
              onClick={handleSaveQuotation}
              disabled={isSaving}
              className="btn-premium-gold px-12 py-4 text-lg shimmer relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                boxShadow: '0 0 20px rgba(212, 166, 90, 0.3)',
              }}
            >
              {isSaving ? '⏳ Saving & Generating PDF...' : '💾 Save Quotation & Generate PDF'}
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
        
        {/* AI Pricing Modal */}
        <AIPricingModal
          isOpen={isAIModalOpen}
          onClose={handleCloseAIModal}
          result={aiResult}
          isLoading={isAILoading}
          onApplyPrice={handleApplyAIPrice}
          priceUnit="₹/rm"
        />
      </div>
    </div>
  );
}

