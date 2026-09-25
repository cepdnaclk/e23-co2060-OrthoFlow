import { useId } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
export function SectionTabs({ items, value, onChange, label }) {
  const id = useId();
  return <div className="section-tabs" role="tablist" aria-label={label}>
    {items.map((item, index) => <button type="button" role="tab" key={item} id={`${id}-${index}`} aria-selected={value === item} tabIndex={value === item ? 0 : -1} onClick={() => onChange(item)} onKeyDown={event => {
      const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!direction && !['Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + direction + items.length) % items.length;
      document.getElementById(`${id}-${target}`).focus(); onChange(items[target]);
    }}>{item}</button>)}
  </div>;
}
export function LoadingState({ label = 'Loading records...' }) {
  return <div className="loading-state" role="status" aria-live="polite"><span className="loading-spinner" aria-hidden="true" />{label}</div>;
}
export function ErrorState({ message, onRetry }) {
  return <div className="error-state" role="alert"><AlertCircle size={18} /><span>{message}</span>{onRetry && <button className="btn" onClick={onRetry}><RotateCw size={15} />Retry</button>}</div>;
}
