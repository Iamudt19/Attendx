import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
  cursorEnabled: boolean;
  toggleCursor: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
  isDark: true,
  cursorEnabled: false,
  toggleCursor: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("attendx_theme") as Theme) || "dark";
    } catch {
      return "dark";
    }
  });

  const [cursorEnabled, setCursorEnabled] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (theme === "light") {
      root.classList.add("light", "light-mode");
      root.classList.remove("dark", "dark-mode");
      body.classList.add("light", "light-mode");
      body.classList.remove("dark", "dark-mode");
    } else {
      root.classList.add("dark", "dark-mode");
      root.classList.remove("light", "light-mode");
      body.classList.add("dark", "dark-mode");
      body.classList.remove("light", "light-mode");
    }

    try {
      localStorage.setItem("attendx_theme", theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("attendx_cursor", String(cursorEnabled));
    } catch {}
  }, [cursorEnabled]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const toggleCursor = useCallback(() => {
    setCursorEnabled((prev) => !prev);
  }, []);

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        toggleTheme, 
        isDark: theme === "dark",
        cursorEnabled,
        toggleCursor
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

