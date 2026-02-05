import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import useThemeStore from "../stores/useThemeStore";

export const ThemeToggle = () => {
  const { theme, setTheme, effectiveTheme } = useThemeStore(
    useShallow((state) => ({
      theme: state.theme,
      setTheme: state.setTheme,
      effectiveTheme: state.effectiveTheme,
    })),
  );

  const themes = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "system" as const, label: "System", icon: Monitor },
  ];

  const CurrentIcon = effectiveTheme === "dark" ? Moon : Sun;

  return (
    <div className="absolute top-0 right-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Toggle theme"
            className="h-9 w-9"
          >
            <CurrentIcon className="h-4 w-4" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {themes.map(({ value, label, icon: Icon }) => {
            const isActive = theme === value;
            return (
              <DropdownMenuItem
                key={value}
                onClick={() => setTheme(value)}
                className="cursor-pointer"
              >
                <Icon className="mr-2 h-4 w-4" />
                <span className="flex-1">{label}</span>
                {isActive && <Check className="ml-2 h-4 w-4" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
