'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TimePickerProps {
  value: string; // Format: "HH:MM" (24-hour) or empty
  onChange: (time: string) => void;
  className?: string;
  placeholder?: string;
}

export default function TimePicker({ value, onChange, className = '', placeholder = 'Select time' }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState<number>(12);
  const [minutes, setMinutes] = useState<number>(0);
  const [isAM, setIsAM] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const pickerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        if (h === 0) {
          setHours(12);
          setIsAM(true);
        } else if (h === 12) {
          setHours(12);
          setIsAM(false);
        } else if (h > 12) {
          setHours(h - 12);
          setIsAM(false);
        } else {
          setHours(h);
          setIsAM(true);
        }
        setMinutes(m);
      }
    } else {
      setHours(12);
      setMinutes(0);
      setIsAM(true);
    }
  }, [value]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const formatTime = (h: number, m: number, am: boolean): string => {
    const hour24 = am ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
    return `${hour24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleTimeChange = (newHours: number, newMinutes: number, newIsAM: boolean) => {
    setHours(newHours);
    setMinutes(newMinutes);
    setIsAM(newIsAM);
    onChange(formatTime(newHours, newMinutes, newIsAM));
  };

  const displayValue = value
    ? (() => {
        const [h, m] = value.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return '';
        const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const ampm = h < 12 ? 'AM' : 'PM';
        return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
      })()
    : '';

  // Calculate position for clock numbers
  const getClockPosition = (number: number, total: number, radius: number) => {
    const angle = (number / total) * 2 * Math.PI - Math.PI / 2; // Start from top
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  // Hour numbers for clock (1-12)
  const hourNumbers = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Minute numbers for clock (0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
  const minuteNumbers = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleClockClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clockRef.current) return;
    
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clickX = e.clientX - centerX;
    const clickY = e.clientY - centerY;
    
    const distance = Math.sqrt(clickX * clickX + clickY * clickY);
    const innerRadius = 40;
    const outerRadius = 90;
    
    if (distance >= innerRadius && distance <= outerRadius) {
      // Calculate angle
      let angle = Math.atan2(clickY, clickX);
      angle = (angle + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI); // Normalize to start from top
      
      if (mode === 'hour') {
        const selectedHour = Math.round((angle / (2 * Math.PI)) * 12);
        const hour = selectedHour === 0 ? 12 : selectedHour;
        handleTimeChange(hour, minutes, isAM);
        setMode('minute');
      } else {
        const selectedMinute = Math.round((angle / (2 * Math.PI)) * 60);
        const minute = Math.round(selectedMinute / 5) * 5; // Round to nearest 5
        handleTimeChange(hours, minute, isAM);
      }
    }
  };

  if (!mounted) return null;

  return (
    <>
      <div ref={containerRef} className="relative">
        <input
          type="text"
          readOnly
          value={displayValue}
          onClick={() => setIsOpen(!isOpen)}
          className={`${className} cursor-pointer`}
          placeholder={placeholder}
        />
      </div>

      {isOpen && mounted && createPortal(
        <div
          ref={pickerRef}
          className="fixed z-[10004] bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-premium-gold/50 shadow-2xl p-6"
          style={{
            top: containerRef.current
              ? `${Math.min(containerRef.current.getBoundingClientRect().bottom + 10, window.innerHeight - 400)}px`
              : '50%',
            left: containerRef.current
              ? `${Math.max(10, Math.min(containerRef.current.getBoundingClientRect().left, window.innerWidth - 350))}px`
              : '50%',
            transform: containerRef.current ? 'none' : 'translate(-50%, -50%)',
          }}
        >
          {/* Clock Display */}
          <div className="flex flex-col items-center mb-4">
            <div className="text-4xl font-bold text-white mb-2">
              {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')} {isAM ? 'AM' : 'PM'}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsAM(true)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  isAM
                    ? 'bg-premium-gold text-white shadow-lg'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                AM
              </button>
              <button
                onClick={() => setIsAM(false)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  !isAM
                    ? 'bg-premium-gold text-white shadow-lg'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Clock Face */}
          <div className="relative mb-4">
            <div
              ref={clockRef}
              onClick={handleClockClick}
              className="relative w-64 h-64 mx-auto cursor-pointer select-none"
            >
              {/* Clock Circle Background */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-2 border-premium-gold/30"></div>
              
              {/* Hour numbers positioned around clock */}
              {mode === 'hour' && hourNumbers.map((num) => {
                const { x, y } = getClockPosition(num, 12, 75);
                const isSelected = num === hours;
                return (
                  <div
                    key={num}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTimeChange(num, minutes, isAM);
                      setMode('minute');
                    }}
                    className={`absolute w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-premium-gold text-white shadow-lg scale-110 z-10'
                        : 'bg-slate-600/70 text-slate-200 hover:bg-premium-gold/50 hover:scale-105'
                    }`}
                    style={{
                      left: `calc(50% + ${x}px - 20px)`,
                      top: `calc(50% + ${y}px - 20px)`,
                    }}
                  >
                    {num}
                  </div>
                );
              })}
              
              {/* Minute numbers positioned around clock */}
              {mode === 'minute' && minuteNumbers.map((num) => {
                const { x, y } = getClockPosition(num, 60, 75);
                const isSelected = num === minutes;
                const isMajor = num % 15 === 0;
                return (
                  <div
                    key={num}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTimeChange(hours, num, isAM);
                    }}
                    className={`absolute rounded-full flex items-center justify-center text-xs font-semibold transition-all cursor-pointer ${
                      isMajor ? 'w-8 h-8' : 'w-6 h-6'
                    } ${
                      isSelected
                        ? 'bg-premium-gold text-white shadow-lg scale-110 z-10'
                        : isMajor
                        ? 'bg-slate-600/60 text-slate-200 hover:bg-premium-gold/50 hover:scale-105'
                        : 'bg-slate-600/40 text-slate-300 hover:bg-premium-gold/40'
                    }`}
                    style={{
                      left: `calc(50% + ${x}px - ${isMajor ? 16 : 12}px)`,
                      top: `calc(50% + ${y}px - ${isMajor ? 16 : 12}px)`,
                    }}
                  >
                    {isMajor ? num : ''}
                  </div>
                );
              })}
              
              {/* Clock hands */}
              <div className="absolute inset-0 pointer-events-none">
                {mode === 'hour' && (
                  <div
                    className="absolute w-1 bg-premium-gold origin-bottom transition-transform"
                    style={{
                      height: '50px',
                      left: 'calc(50% - 2px)',
                      top: 'calc(50% - 50px)',
                      transform: `rotate(${(hours / 12) * 360}deg)`,
                      transformOrigin: 'bottom center',
                    }}
                  />
                )}
                {mode === 'minute' && (
                  <div
                    className="absolute w-0.5 bg-premium-gold origin-bottom transition-transform"
                    style={{
                      height: '60px',
                      left: 'calc(50% - 1px)',
                      top: 'calc(50% - 60px)',
                      transform: `rotate(${(minutes / 60) * 360}deg)`,
                      transformOrigin: 'bottom center',
                    }}
                  />
                )}
                {/* Center dot */}
                <div className="absolute w-3 h-3 bg-premium-gold rounded-full" style={{
                  left: 'calc(50% - 6px)',
                  top: 'calc(50% - 6px)',
                }} />
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('hour')}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                mode === 'hour'
                  ? 'bg-premium-gold text-white shadow-lg'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Hour
            </button>
            <button
              onClick={() => setMode('minute')}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                mode === 'minute'
                  ? 'bg-premium-gold text-white shadow-lg'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Minute
            </button>
          </div>

          {/* Quick time buttons */}
          <div className="mb-4 pt-4 border-t border-slate-700">
            <div className="grid grid-cols-4 gap-2">
              {['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM'].map((quickTime) => {
                const [time, period] = quickTime.split(' ');
                const [h, m] = time.split(':').map(Number);
                const isQuickAM = period === 'AM';
                const quickHour24 = isQuickAM ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
                const quickTimeValue = `${quickHour24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                
                return (
                  <button
                    key={quickTime}
                    onClick={() => {
                      handleTimeChange(h, m, isQuickAM);
                      setIsOpen(false);
                    }}
                    className="px-2 py-2 text-xs font-semibold text-slate-200 bg-slate-700/50 hover:bg-premium-gold/50 rounded-lg transition-all"
                  >
                    {quickTime}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Done button */}
          <button
            onClick={() => setIsOpen(false)}
            className="w-full py-3 px-4 text-sm font-bold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-lg transition-all shadow-lg"
          >
            Done
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

