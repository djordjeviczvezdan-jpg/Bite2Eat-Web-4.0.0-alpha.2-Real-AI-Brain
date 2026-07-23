"use client";

import { useEffect, useMemo, useState } from "react";
import type { MenuItem, ModifierGroup } from "@/data/menu";

type SelectionState = Record<string, string[]>;

type Props = {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (item: MenuItem, unitPrice: number, modifiers: string[]) => void;
};

export default function ProductCustomizer({ item, onClose, onAdd }: Props) {
  const [selected, setSelected] = useState<SelectionState>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!item) return;
    const defaults: SelectionState = {};
    for (const group of item.modifierGroups ?? []) {
      defaults[group.id] = group.options.filter(option => option.defaultSelected).map(option => option.id);
    }
    setSelected(defaults);
    setQuantity(1);
    setNotes("");
  }, [item]);

  const priceDelta = useMemo(() => {
    if (!item) return 0;
    return (item.modifierGroups ?? []).reduce((sum, group) => {
      const ids = selected[group.id] ?? [];
      return sum + group.options.filter(option => ids.includes(option.id)).reduce((groupSum, option) => groupSum + option.priceDelta, 0);
    }, 0);
  }, [item, selected]);

  if (!item) return null;
  const product = item;

  function toggle(group: ModifierGroup, optionId: string) {
    setSelected(current => {
      const active = current[group.id] ?? [];
      if (group.maxSelections === 1) return { ...current, [group.id]: [optionId] };
      if (active.includes(optionId)) return { ...current, [group.id]: active.filter(id => id !== optionId) };
      if (active.length >= group.maxSelections) return current;
      return { ...current, [group.id]: [...active, optionId] };
    });
  }

  const invalidGroup = (product.modifierGroups ?? []).find(group => (selected[group.id] ?? []).length < group.minSelections);
  const unitPrice = item.price + priceDelta;

  function submit() {
    if (invalidGroup) return;
    const modifiers = (product.modifierGroups ?? []).flatMap(group => {
      const ids = selected[group.id] ?? [];
      return group.options.filter(option => ids.includes(option.id)).map(option => `${group.name}: ${option.name}${option.priceDelta ? ` (+€${option.priceDelta.toFixed(2)})` : ""}`);
    });
    if (notes.trim()) modifiers.push(`Note: ${notes.trim()}`);
    for (let index = 0; index < quantity; index++) onAdd(product, unitPrice, modifiers);
    onClose();
  }

  return (
    <div className="modalBackdrop productModalBackdrop" onClick={onClose}>
      <section className="productCustomizer" onClick={event => event.stopPropagation()}>
        <div className="productCustomizerHero">
          <button className="closeButton" onClick={onClose} aria-label="Close">×</button>
          {item.imageUrl ? <img className="productCustomizerPhoto" src={item.imageUrl} alt={item.name} /> : <span className="productCustomizerEmoji">{item.emoji}</span>}
          {item.badge && <span className="menuBadge">{item.badge}</span>}
        </div>
        <div className="productCustomizerBody">
          <div className="productCustomizerTitle">
            <div><span className="sectionLabel">Customise your order</span><h2>{item.name}</h2><p>{item.description}</p></div>
            <strong>€{item.price.toFixed(2)}</strong>
          </div>

          {(product.modifierGroups ?? []).map(group => {
            const count = (selected[group.id] ?? []).length;
            return (
              <fieldset className="modifierGroup" key={group.id}>
                <legend><span>{group.name}</span><small>{group.required ? "Required" : "Optional"} · choose {group.maxSelections === 1 ? "1" : `up to ${group.maxSelections}`}</small></legend>
                <div className="modifierOptions">
                  {group.options.map(option => {
                    const checked = (selected[group.id] ?? []).includes(option.id);
                    return (
                      <label className={checked ? "selected" : ""} key={option.id}>
                        <input type={group.maxSelections === 1 ? "radio" : "checkbox"} name={group.id} checked={checked} onChange={() => toggle(group, option.id)} />
                        <span>{option.name}</span>
                        <strong>{option.priceDelta ? `+€${option.priceDelta.toFixed(2)}` : "Included"}</strong>
                      </label>
                    );
                  })}
                </div>
                {group.required && count < group.minSelections && <small className="modifierWarning">Please choose at least {group.minSelections} option.</small>}
              </fieldset>
            );
          })}

          <label className="orderNotes"><span>Special instructions</span><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="e.g. sauce on the side" maxLength={160} /></label>
          <div className="productCustomizerFooter">
            <div className="quantityControl large"><button onClick={() => setQuantity(value => Math.max(1, value - 1))}>−</button><span>{quantity}</span><button onClick={() => setQuantity(value => Math.min(20, value + 1))}>+</button></div>
            <button className="checkoutButton" disabled={Boolean(invalidGroup)} onClick={submit}>Add to basket · €{(unitPrice * quantity).toFixed(2)}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
