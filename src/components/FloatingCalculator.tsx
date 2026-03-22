import React, { useState, useCallback, useRef, useEffect } from 'react';
import { LuCalculator, LuX, LuGripHorizontal } from 'react-icons/lu';
import './FloatingCalculator.css';

// ─── Hook calculatrice ───
type Operator = '+' | '-' | '×' | '÷' | null;

function formatDisplay(value: string): string {
  const parts = value.split('.');
  const intPart = parts[0].replace(/\s/g, '').replace(/-/g, '');
  if (!intPart) return value;
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const sign = value.startsWith('-') ? '-' : '';
  return sign + formatted + (parts.length > 1 ? '.' + parts[1] : '');
}

function rawNumber(display: string): string {
  return display.replace(/\s/g, '');
}

function compute(a: number, op: Operator, b: number): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return b !== 0 ? a / b : 0;
    default: return b;
  }
}

function useCalculator() {
  const [display, setDisplay] = useState('0');
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waitingForSecond, setWaitingForSecond] = useState(false);

  const handlePress = useCallback((label: string, type: string) => {
    switch (type) {
      case 'digit': {
        if (label === '00') {
          if (waitingForSecond) { setDisplay('0'); setWaitingForSecond(false); }
          else {
            const raw = rawNumber(display);
            if (raw !== '0') setDisplay(formatDisplay(raw + '00'));
          }
        } else {
          if (waitingForSecond) { setDisplay(label); setWaitingForSecond(false); }
          else {
            const raw = rawNumber(display);
            if (raw === '0' && label !== '.') setDisplay(label);
            else if (label === '.' && raw.includes('.')) return;
            else setDisplay(formatDisplay(raw + label));
          }
        }
        break;
      }
      case 'op': {
        const current = parseFloat(rawNumber(display));
        if (firstOperand !== null && !waitingForSecond) {
          const result = compute(firstOperand, operator, current);
          const resultStr = Number.isInteger(result) ? String(result) : result.toFixed(2);
          setDisplay(formatDisplay(resultStr));
          setFirstOperand(result);
        } else {
          setFirstOperand(current);
        }
        setOperator(label as Operator);
        setWaitingForSecond(true);
        break;
      }
      case 'equal': {
        if (firstOperand === null || operator === null) return;
        const current = parseFloat(rawNumber(display));
        const result = compute(firstOperand, operator, current);
        const resultStr = Number.isInteger(result) ? String(result) : result.toFixed(2);
        setDisplay(formatDisplay(resultStr));
        setFirstOperand(null);
        setOperator(null);
        setWaitingForSecond(true);
        break;
      }
      case 'action': {
        if (label === 'C') {
          setDisplay('0'); setFirstOperand(null); setOperator(null); setWaitingForSecond(false);
        } else if (label === '±') {
          const raw = rawNumber(display);
          if (raw !== '0') setDisplay(formatDisplay(raw.startsWith('-') ? raw.substring(1) : '-' + raw));
        } else if (label === '⌫') {
          const raw = rawNumber(display);
          if (raw.length <= 1 || (raw.length === 2 && raw.startsWith('-'))) setDisplay('0');
          else setDisplay(formatDisplay(raw.slice(0, -1)));
        } else if (label === '%') {
          const current = parseFloat(rawNumber(display));
          const result = current / 100;
          const resultStr = Number.isInteger(result) ? String(result) : result.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
          setDisplay(formatDisplay(resultStr));
        }
        break;
      }
    }
  }, [display, firstOperand, operator, waitingForSecond]);

  return { display, firstOperand, operator, handlePress };
}

// ─── Boutons ───
type ButtonDef = { label: string; type: 'digit' | 'op' | 'action' | 'equal' };

const BUTTONS: ButtonDef[][] = [
  [{ label: 'C', type: 'action' }, { label: '⌫', type: 'action' }, { label: '%', type: 'action' }, { label: '÷', type: 'op' }],
  [{ label: '7', type: 'digit' }, { label: '8', type: 'digit' }, { label: '9', type: 'digit' }, { label: '×', type: 'op' }],
  [{ label: '4', type: 'digit' }, { label: '5', type: 'digit' }, { label: '6', type: 'digit' }, { label: '-', type: 'op' }],
  [{ label: '1', type: 'digit' }, { label: '2', type: 'digit' }, { label: '3', type: 'digit' }, { label: '+', type: 'op' }],
  [{ label: '0', type: 'digit' }, { label: '00', type: 'digit' }, { label: '.', type: 'digit' }, { label: '=', type: 'equal' }],
];

function formatOperand(value: number): string {
  const str = String(value);
  const parts = str.split('.');
  const formatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return formatted + (parts.length > 1 ? '.' + parts[1] : '');
}

// ─── Composant principal ───
export default function FloatingCalculator(): React.ReactElement {
  const [visible, setVisible] = useState(false);
  const { display, firstOperand, operator, handlePress } = useCalculator();

  // Drag state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    const panel = panelRef.current;
    if (panel) {
      const rect = panel.getBoundingClientRect();
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const x = e.clientX - dragOffset.current.x;
      const y = e.clientY - dragOffset.current.y;
      const maxX = window.innerWidth - 340;
      const maxY = window.innerHeight - 100;
      setPos({
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  const panelStyle: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' }
    : {};

  return (
    <>
      {visible && (
        <div className="calc-panel" ref={panelRef} style={panelStyle}>
          <div
            className="calc-header"
            onMouseDown={onMouseDown}
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          >
            <span className="calc-title">
              <LuGripHorizontal size={14} style={{ marginRight: 6, opacity: 0.4, verticalAlign: 'middle' }} />
              Calculatrice
            </span>
            <button className="calc-close" onClick={() => setVisible(false)}><LuX size={18} /></button>
          </div>
          <div className="calc-display">
            {operator && (
              <div className="calc-operator-indicator">
                {formatOperand(firstOperand ?? 0)} {operator}
              </div>
            )}
            <div className="calc-display-text" style={{ fontSize: display.length > 12 ? 22 : 30 }}>
              {display}
            </div>
          </div>
          <div className="calc-keyboard">
            {BUTTONS.map((row, ri) => (
              <div key={ri} className="calc-row">
                {row.map(btn => (
                  <button
                    key={btn.label}
                    className={`calc-btn calc-btn-${btn.type} ${btn.label === 'C' ? 'calc-btn-clear' : ''}`}
                    onClick={() => handlePress(btn.label, btn.type)}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        className="calc-fab"
        onClick={() => setVisible(!visible)}
        title="Calculatrice"
      >
        {visible ? <LuX size={24} /> : <LuCalculator size={24} />}
      </button>
    </>
  );
}
