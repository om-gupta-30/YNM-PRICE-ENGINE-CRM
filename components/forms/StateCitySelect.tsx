'use client';

import { useState, useEffect } from 'react';

interface State {
  id: number;
  name: string;
}

interface City {
  id: number;
  name: string;
  state_id: number;
}

interface StateCitySelectProps {
  stateId: number | null;
  cityId: number | null;
  onStateChange: (stateId: number | null, stateName: string) => void;
  onCityChange: (cityId: number | null, cityName: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function StateCitySelect({ 
  stateId, 
  cityId, 
  onStateChange, 
  onCityChange, 
  required = false,
  disabled = false 
}: StateCitySelectProps) {
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  // Fetch states on mount
  useEffect(() => {
    fetchStates();
  }, []);

  // Fetch cities when state changes
  useEffect(() => {
    if (stateId) {
      fetchCities(stateId);
    } else {
      setCities([]);
      onCityChange(null, '');
    }
  }, [stateId]);

  const fetchStates = async () => {
    try {
      setLoadingStates(true);
      const response = await fetch('/api/states');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('States API response:', data); // Debug log
      if (data.success && Array.isArray(data.states)) {
        console.log('Setting states:', data.states.length, 'states found');
        setStates(data.states);
      } else {
        console.error('Failed to fetch states:', data.error || 'Invalid response format', data);
        setStates([]);
      }
    } catch (error) {
      console.error('Error fetching states:', error);
      setStates([]);
    } finally {
      setLoadingStates(false);
    }
  };

  const fetchCities = async (selectedStateId: number) => {
    setLoadingCities(true);
    try {
      const response = await fetch(`/api/cities?state_id=${selectedStateId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Cities API response for state', selectedStateId, ':', data); // Debug log
      if (data.success && Array.isArray(data.cities)) {
        console.log('Setting cities:', data.cities.length, 'cities found');
        setCities(data.cities);
      } else {
        console.error('Failed to fetch cities:', data.error || 'Invalid response format', data);
        setCities([]);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-2">
          State {required && <span className="text-red-400">*</span>}
        </label>
        <select
          value={stateId || ''}
          onChange={(e) => {
            const newStateId = e.target.value ? parseInt(e.target.value) : null;
            const selectedState = states.find(s => s.id === newStateId);
            onStateChange(newStateId, selectedState?.name || '');
          }}
          required={required}
          disabled={disabled || loadingStates}
          className="input-premium w-full px-4 py-3 text-white bg-white/10 border-2 border-white/30 hover:border-premium-gold/50 focus:border-premium-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold/50 transition-all duration-200 cursor-pointer [&>option]:bg-[#1A103C] [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {loadingStates ? 'Loading states...' : 'Select State'}
          </option>
          {states.length > 0 ? (
            states.map((state) => (
              <option key={state.id} value={state.id}>
                {state.name}
              </option>
            ))
          ) : (
            !loadingStates && <option value="" disabled>No states available</option>
          )}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-2">
          City {required && <span className="text-red-400">*</span>}
        </label>
        <select
          value={cityId || ''}
          onChange={(e) => {
            const newCityId = e.target.value ? parseInt(e.target.value) : null;
            const selectedCity = cities.find(c => c.id === newCityId);
            onCityChange(newCityId, selectedCity?.name || '');
          }}
          required={required}
          disabled={disabled || !stateId || loadingCities}
          className="input-premium w-full px-4 py-3 text-white bg-white/10 border-2 border-white/30 hover:border-premium-gold/50 focus:border-premium-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold/50 transition-all duration-200 cursor-pointer [&>option]:bg-[#1A103C] [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {loadingCities ? 'Loading cities...' : stateId ? 'Select City' : 'Select State first'}
          </option>
          {cities.length > 0 ? (
            cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))
          ) : (
            !loadingCities && stateId && <option value="" disabled>No cities available</option>
          )}
        </select>
      </div>
    </div>
  );
}

