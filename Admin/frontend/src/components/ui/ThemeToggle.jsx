import React from 'react';
import { Sun, Moon } from 'lucide-react';
import Button from './Button';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <Button variant="ghost" onClick={toggleTheme} className={`p-2 ${className}`} aria-label="Toggle theme">
      {isDark ? <Sun size={18} color='white'/> : <Moon size={18} />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
