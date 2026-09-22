import React from "react";
import { IconButton, SecondaryButton } from "@sofia/ui";

const ThemeCard = ({ theme }) => {
  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 text-card-foreground group relative overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 hover:border-muted-foreground/30">
      <div className="relative h-44 overflow-hidden">
        <div className="absolute inset-0 flex" style={{ backgroundColor: "rgb(255, 255, 255)" }}>
          <div className="w-12 flex-shrink-0 flex flex-col items-center py-3 gap-1.5" style={{ backgroundColor: "rgb(2, 6, 23)" }}>
            <div className="w-6 h-6 rounded-md opacity-80" style={{ backgroundColor: theme.headerAccent }} />
            <div className="w-6 h-1.5 rounded-full bg-white/15 mt-1" />
            <div className="w-6 h-1.5 rounded-full bg-white/15" />
            <div className="w-6 h-1.5 rounded-full" style={{ backgroundColor: theme.headerAccent, opacity: 0.7 }} />
            <div className="w-6 h-1.5 rounded-full bg-white/15" />
            <div className="w-6 h-1.5 rounded-full bg-white/15" />
          </div>
          <div className="flex-1 flex flex-col">
            <div className="h-8 flex-shrink-0 px-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgb(226, 232, 240)" }}>
              <div className="w-14 h-2 rounded-full" style={{ backgroundColor: "rgb(241, 245, 249)" }} />
              <div className="flex-1" />
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "rgb(241, 245, 249)" }} />
            </div>
            <div className="flex-1 p-3 space-y-2">
              <div className="flex gap-2">
                <div className="h-6 px-3 rounded-md flex items-center" style={{ backgroundColor: theme.colors[0] }}>
                  <div className="w-8 h-1.5 rounded-full bg-white/80" />
                </div>
                <div className="h-6 px-3 rounded-md flex items-center" style={{ backgroundColor: theme.colors[1], border: "1px solid rgb(226, 232, 240)" }}>
                  <div className="w-8 h-1.5 rounded-full opacity-50" style={{ backgroundColor: theme.colors[2] }} />
                </div>
                <div className="h-6 px-3 rounded-md flex items-center" style={{ backgroundColor: theme.colors[3] }}>
                  <div className="w-6 h-1.5 rounded-full bg-white/80" />
                </div>
              </div>
              <div className="rounded-md p-2 space-y-1.5" style={{ backgroundColor: "rgb(255, 255, 255)", border: "1px solid rgb(226, 232, 240)" }}>
                <div className="w-full h-2 rounded-full opacity-30" style={{ backgroundColor: theme.colors[0] }} />
                <div className="w-3/4 h-2 rounded-full opacity-20" style={{ backgroundColor: theme.colors[0] }} />
                <div className="w-1/2 h-2 rounded-full" style={{ backgroundColor: theme.colors[1] }} />
              </div>
              <div className="flex gap-1.5">
                <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: "rgb(255, 255, 255)", border: "1px solid rgb(226, 232, 240)" }} />
                <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: "rgb(255, 255, 255)", border: "1px solid rgb(226, 232, 240)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex gap-2">
          <SecondaryButton
            type="button"
            size="sm"
            className="inline-flex items-center cursor-pointer justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive h-8 rounded-md gap-1.5 px-3 has-[&>svg]:px-2.5 bg-white/90 text-gray-900 dark:text-gray-100 hover:bg-white shadow-lg"
          >
            <svg
              stroke="currentColor"
              fill="none"
              strokeWidth="2"
              viewBox="0 0 24 24"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5 mr-1"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
            Edit
          </SecondaryButton>
        </div>
      </div>

      <div className="absolute top-2 left-2 flex gap-1.5">
        <span
          className={`inline-flex items-center justify-center rounded-md px-2 font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden border-transparent ${theme.badgeClass} shadow-sm text-[10px] py-0`}
        >
          {theme.badge}
        </span>
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconButton
          type="button"
          variant="ghost"
          size="sm"
          iconOnly
          className="inline-flex items-center cursor-pointer justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:text-accent-foreground dark:hover:bg-accent/50 size-9 h-7 w-7 bg-white/80 hover:bg-white shadow-sm backdrop-blur-sm"
        >
          <svg
            stroke="currentColor"
            fill="none"
            strokeWidth="2"
            viewBox="0 0 24 24"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </IconButton>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{theme.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{theme.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex -space-x-1">
            {theme.colors.map((color, idx) => (
              <div
                key={idx}
                className="w-5 h-5 rounded-full border-2 border-background shadow-sm"
                title={color}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate">{theme.font}</span>
        </div>
      </div>
    </div>
  );
};

export default ThemeCard;
