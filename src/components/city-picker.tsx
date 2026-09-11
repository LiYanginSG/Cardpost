"use client";
import { useEffect, useRef, useState } from "react";

type Row = { name: string; cc: string };
const countryName = (cc: string) => { try { return new Intl.DisplayNames(["en"], { type: "region" }).of(cc) ?? cc; } catch { return cc; } };

/** Searchable city field. Submits the chosen city key in a hidden input named `name`. */
export function CityPicker({ name = "city", defaultValue = "", id = "city", required = true }: { name?: string; defaultValue?: string; id?: string; required?: boolean }) {
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState(defaultValue);
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!open || query.trim().length < 2 || query === value) { setRows([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/cities?q=${encodeURIComponent(query)}`);
        setRows(await r.json());
        setActive(0);
      } catch { setRows([]); }
    }, 140);
  }, [query, open, value]);

  const choose = (r: Row) => { setValue(r.name); setQuery(r.name); setRows([]); setOpen(false); };

  return (
    <div style={{ position: "relative" }}>
      <input type="hidden" name={name} value={value} />
      <input
        id={id}
        value={query}
        autoComplete="off"
        required={required}
        placeholder="Start typing a city"
        onChange={(e) => { setQuery(e.target.value); setValue(""); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!rows.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, rows.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === "Enter") { e.preventDefault(); choose(rows[active]); }
        }}
        aria-autocomplete="list"
        aria-expanded={open && rows.length > 0}
      />
      {!value && query.length >= 2 && !rows.length && !open && <div className="hint">Pick a city from the list.</div>}
      {open && rows.length > 0 && (
        <ul className="picker-list" role="listbox">
          {rows.map((r, i) => (
            <li key={r.name} role="option" aria-selected={i === active} className={i === active ? "on" : ""} onMouseDown={() => choose(r)}>
              <b>{r.name}</b> <span>{countryName(r.cc)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
