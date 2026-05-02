'use client';

import { createContext, useContext } from 'react';

type ThemeContextValue = {
  theme: 'cyber-chef';
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'cyber-chef'
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: 'cyber-chef' }}>
      {children}
    </ThemeContext.Provider>
  );
}
