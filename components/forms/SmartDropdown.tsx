'use client';

import { useState, useEffect, useRef } from 'react';

interface SmartDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  storageKey: 'places' | 'customers'; // Changed to match API route type
  className?: string;
  autoSave?: boolean; // If false, don't auto-save to database on blur
  disabled?: boolean;
}

export default function SmartDropdown({
  value,
  onChange,
  placeholder,
  storageKey,
  className = '',
  autoSave = false, // Default to false - don't auto-save
  disabled = false,
}: SmartDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Function to fetch suggestions from Supabase
  const fetchSuggestions = async () => {
    try {
      setIsLoading(true);
      
      // For customers, we need to pass sales employee info
      let url = `/api/meta/${storageKey}?t=${Date.now()}`;
      if (storageKey === 'customers') {
        // Get current user info from localStorage
        if (typeof window !== 'undefined') {
          const username = localStorage.getItem('username') || '';
          const isAdmin = localStorage.getItem('isAdmin') === 'true';
          
          // Determine sales employee: 
          // - If username is Employee1, Employee2, or Employee3, use that username
          // - If username is Admin, use Admin
          // - Otherwise default to Admin
          let salesEmployee = 'Admin';
          if (username === 'Employee1' || username === 'Employee2' || username === 'Employee3') {
            salesEmployee = username;
          } else if (username === 'Admin') {
            salesEmployee = 'Admin';
          }
          
          url += `&salesEmployee=${encodeURIComponent(salesEmployee)}&isAdmin=${isAdmin}`;
        }
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        if (result.data && Array.isArray(result.data)) {
          const allSuggestions = result.data;
          setSuggestions(allSuggestions);
          // Always show all suggestions when fetched (user can filter by typing)
          setFilteredSuggestions(allSuggestions);
        } else {
          console.warn('No data received or data is not an array:', result);
        }
      } else {
        const errorText = await response.text();
        console.error('Error fetching suggestions:', response.statusText, errorText);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load suggestions from Supabase on mount and when storageKey changes - only once
  useEffect(() => {
    if (suggestions.length === 0) {
      fetchSuggestions();
    }
  }, [storageKey]);
  
  // Only show dropdown when user types at least 1 character
  const handleInputFocus = () => {
    // Don't open dropdown on focus - only when typing
    if (inputValue.trim().length >= 1) {
      setIsOpen(true);
    }
    // Only fetch if we don't have suggestions cached
    if (suggestions.length === 0) {
      fetchSuggestions();
    }
  };

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter suggestions based on input - only show when user has typed at least 1 character
  useEffect(() => {
    if (inputValue.trim().length >= 1) {
      // When user types, filter suggestions
      const filtered = suggestions.filter((item) =>
        item.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      // When input is empty, don't show suggestions
      setFilteredSuggestions([]);
    }
  }, [inputValue, suggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    // Only show dropdown if user has typed at least 1 character
    if (newValue.trim().length >= 1) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = (selectedValue: string) => {
    setInputValue(selectedValue);
    onChange(selectedValue);
    setIsOpen(false);
    inputRef.current?.blur();
  };


  const handleInputBlur = async () => {
    // Delay closing to allow click on dropdown item
    setTimeout(async () => {
      setIsOpen(false);
      // Only auto-save if autoSave prop is true
      if (autoSave) {
        // Save new value to Supabase when input loses focus and has a value
        const trimmedValue = inputValue.trim();
        if (trimmedValue && !suggestions.includes(trimmedValue)) {
          try {
            // For customers, include sales employee info
            const body: any = { value: trimmedValue };
            if (storageKey === 'customers' && typeof window !== 'undefined') {
              const username = localStorage.getItem('username') || '';
              const salesEmployee = (username === 'Employee1' || username === 'Employee2' || username === 'Employee3') 
                ? username 
                : 'Admin';
              body.salesEmployee = salesEmployee;
            }
            
            const response = await fetch(`/api/meta/${storageKey}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            });

            if (response.ok) {
              // Refresh suggestions from server immediately after saving
              await fetchSuggestions();
            } else {
              console.error('Error saving to Supabase:', response.statusText);
            }
          } catch (error) {
            console.error('Error saving to Supabase:', error);
          }
        }
      }
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredSuggestions.length > 0 && isOpen) {
      handleSelect(filteredSuggestions[0]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`} style={{ zIndex: 50, isolation: 'isolate' }}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        disabled={disabled}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="input-premium w-full px-4 py-3 text-white placeholder-slate-400"
        required
      />
      
      {isOpen && filteredSuggestions.length > 0 && inputValue.trim().length >= 1 && (
        <div 
          className="absolute w-full mt-2 glassmorphic-premium rounded-xl shadow-2xl border-2 border-brand-gold/50 max-h-96 overflow-y-auto backdrop-blur-xl" 
          style={{ 
            position: 'absolute',
            zIndex: 99999,
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            marginTop: '8px',
          }}
        >
          <div className="p-3">
            <p className="text-xs text-white mb-3 px-3 font-semibold">Select from suggestions ({filteredSuggestions.length}):</p>
            <div className="space-y-1">
              {filteredSuggestions.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-4 py-2.5 text-white hover:bg-brand-gold/30 hover:text-white transition-colors duration-200 rounded-lg font-medium"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {isOpen && filteredSuggestions.length === 0 && (
        <div 
          className="absolute w-full mt-2 glassmorphic-premium rounded-xl shadow-2xl border-2 border-brand-gold/50 max-h-60 overflow-y-auto p-4 backdrop-blur-xl" 
          style={{ 
            position: 'absolute',
            zIndex: 99999,
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          }}
        >
          <p className="text-sm text-white text-center">No suggestions found. You can type a new value.</p>
        </div>
      )}
    </div>
  );
}

