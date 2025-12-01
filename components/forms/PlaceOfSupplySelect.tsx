'use client';

import { useState, useEffect } from 'react';

interface PlaceOfSupplySelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function PlaceOfSupplySelect({
  value,
  onChange,
  className = '',
  disabled = false,
}: PlaceOfSupplySelectProps) {
  const [places, setPlaces] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch places from database
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/meta/places?t=${Date.now()}`);
        if (response.ok) {
          const result = await response.json();
          if (result.data && Array.isArray(result.data)) {
            // Sort alphabetically for better UX
            const sortedPlaces = [...result.data].sort((a, b) => a.localeCompare(b));
            setPlaces(sortedPlaces);
          }
        } else {
          console.error('Error fetching places:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching places:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  return (
    <div className={`relative ${className}`}>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isLoading}
        className="input-premium input-focus-glow w-full text-white [&>option]:bg-[#1A103C] [&>option]:text-white cursor-pointer"
        required
      >
        <option value="">Select Place of Supply</option>
        {places.map((place, index) => (
          <option key={index} value={place}>
            {place}
          </option>
        ))}
      </select>
      {isLoading && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <span className="text-slate-400 text-sm">Loading...</span>
        </div>
      )}
    </div>
  );
}

