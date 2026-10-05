import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeId: string;
  onChange: (id: string) => void;
  label: string;
}

/** Zakładki zgodne z wzorcem WAI-ARIA: strzałki ←/→, Home/End. */
export function Tabs({ tabs, activeId, onChange, label }: TabsProps) {
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    const targets: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const tab = tabs[target];
    if (tab) {
      onChange(tab.id);
      tabRefs.current[target]?.focus();
    }
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className="inline-flex gap-1 rounded-xl border border-border bg-surface-muted p-1"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                onChange(tab.id);
              }}
              onKeyDown={(event) => {
                handleKeyDown(event, index);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-all [&_svg]:size-4 ${
                selected ? 'bg-surface-solid text-text shadow-card' : 'text-muted hover:text-text'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== activeId}
          className="pt-5"
        >
          {tab.id === activeId && tab.content}
        </div>
      ))}
    </div>
  );
}
