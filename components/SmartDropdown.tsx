'use client';

import { useState, useEffect, useRef } from 'react';

interface SmartDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  storageKey: 'places' | 'customers'; // Changed to match API route type
  className?: string;
}

export default function SmartDropdown({
  value,
  onChange,
  placeholder,
  storageKey,
  className = '',
}: SmartDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load suggestions from Supabase on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/meta/${storageKey}`);
        if (response.ok) {
          const result = await response.json();
          if (result.data && Array.isArray(result.data)) {
            setSuggestions(result.data);
            setFilteredSuggestions(result.data);
          }
        } else {
          console.error('Error fetching suggestions:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [storageKey]);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter suggestions based on input
  useEffect(() => {
    if (inputValue.trim() === '') {
      setFilteredSuggestions(suggestions);
    } else {
      const filtered = suggestions.filter((item) =>
        item.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredSuggestions(filtered);
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
    setIsOpen(true);
  };

  const handleSelect = (selectedValue: string) => {
    setInputValue(selectedValue);
    onChange(selectedValue);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = async () => {
    // Delay closing to allow click on dropdown item
    setTimeout(async () => {
      setIsOpen(false);
      // Save new value to Supabase when input loses focus and has a value
      const trimmedValue = inputValue.trim();
      if (trimmedValue && !suggestions.includes(trimmedValue)) {
        try {
          const response = await fetch(`/api/meta/${storageKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ value: trimmedValue }),
          });

          if (response.ok) {
            // Refresh suggestions from server
            const fetchResponse = await fetch(`/api/meta/${storageKey}`);
            if (fetchResponse.ok) {
              const result = await fetchResponse.json();
              if (result.data && Array.isArray(result.data)) {
                setSuggestions(result.data);
                setFilteredSuggestions(result.data);
              }
            }
          } else {
            console.error('Error saving to Supabase:', response.statusText);
          }
        } catch (error) {
          console.error('Error saving to Supabase:', error);
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
    <div ref={dropdownRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="input-premium w-full px-6 py-4 text-white placeholder-slate-400"
        required
      />
      
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 glassmorphic-premium rounded-xl shadow-2xl border border-white/20 max-h-60 overflow-y-auto animate-fade-up">
          {filteredSuggestions.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left px-6 py-3 text-white hover:bg-white/10 hover:text-premium-gold transition-colors duration-200 first:rounded-t-xl last:rounded-b-xl"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

