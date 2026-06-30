import React, { useState } from 'react';

interface DifficultySliderProps {
  level: number;
  onChange: (level: number) => void;
  disabled?: boolean;
}

export function DifficultySlider({ level, onChange, disabled }: DifficultySliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onChange(val);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', color: '#ddd' }}>
      <label>Bot Difficulty:</label>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={level}
        onChange={handleChange}
        disabled={disabled}
        style={{ width: '120px' }}
      />
      <span>{level}</span>
    </div>
  );
}
