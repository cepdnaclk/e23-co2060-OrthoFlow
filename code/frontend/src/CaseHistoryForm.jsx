import { useEffect, useId, useRef, useState } from 'react';
import sections from '../../shared/caseHistoryFields.json';
import './caseHistory.css';

const visible = (field, values) => !field.when || field.when.values.includes(values[field.when.key]);
const answered = value => Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';

export function validateCaseHistory(values) {
  const errors = {};
  for (const section of sections) {
    for (const field of section.fields) {
      if (!visible(field, values) || !answered(values[field.key])) continue;
      const value = values[field.key];
      if (field.type === 'number' && (!Number.isFinite(Number(value)) || Number(value) < field.min)) {
        errors[field.key] = 'Enter a non-negative measurement.';
      }
      if (field.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) {
        errors[field.key] = 'Enter a valid date.';
      }
    }
  }
  return errors;
}

export default function CaseHistoryForm({ value = {}, onChange, errors = {}, readOnly = false }) {
  const prefix = useId();
  const rootRef = useRef(null);
  const [activeSection, setActiveSection] = useState(0);
  useEffect(() => {
    if (readOnly) return;
    const root = rootRef.current;
    const scroller = root.closest('.page-transition');
    if (!scroller) return;
    let frame;
    const update = () => {
      const boundary = scroller.getBoundingClientRect().top + 100;
      let active = 0;
      root.querySelectorAll('.case-history-section').forEach((section, index) => {
        if (section.getBoundingClientRect().top <= boundary) active = index;
      });
      setActiveSection(active);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => { scroller.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, [readOnly]);
  const Grid = readOnly ? 'dl' : 'div';
  const values = value || {};
  const change = (key, answer) => {
    const next = { ...values, [key]: answer };
    // Remove dependent answers when their controlling finding changes.
    for (const section of sections) {
      for (const field of section.fields) {
        if (!visible(field, next)) delete next[field.key];
      }
    }
    onChange(next);
  };
  const toggle = (field, option) => {
    const selected = Array.isArray(values[field.key]) ? values[field.key] : [];
    let next = selected.includes(option) ? selected.filter(item => item !== option) : [...selected, option];
    if (!selected.includes(option)) {
      next = field.exclusive?.includes(option) ? [option] : next.filter(item => !field.exclusive?.includes(item));
    }
    change(field.key, next);
  };

  return (
    <div className="case-history" ref={rootRef}>
      <h2>Orthodontic case history</h2>
      {!readOnly && <nav className="case-history-nav" aria-label="Case history sections">
        {sections.map((section, index) => <a
          key={section.title}
          href={`#${prefix}-section-${index}`}
          aria-current={activeSection === index ? 'location' : undefined}
          onClick={event => {
            event.preventDefault();
            const target = document.getElementById(`${prefix}-section-${index}`);
            setActiveSection(index);
            target.focus({ preventScroll: true });
            target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
          }}
        ><span className="case-history-nav-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span>{section.title}</span></a>)}
      </nav>}
      {sections.map((section, index) => {
        const fields = section.fields.filter(field => visible(field, values));
        const count = fields.filter(field => answered(values[field.key])).length;
        if (readOnly && !count) return null;
        return <section className="case-history-section" id={`${prefix}-section-${index}`} key={section.title} tabIndex={-1}>
          <header><h3><span className="case-history-heading-number">{String(index + 1).padStart(2, '0')}</span><span>{section.title}</span></h3>{!readOnly && <span>{count} / {fields.length} recorded</span>}</header>
          <Grid className="case-history-grid">
            {fields.map(field => {
              const id = `${prefix}-${field.key}`;
              const selected = values[field.key];
              if (readOnly) {
                if (!answered(selected)) return null;
                return <div className="case-history-answer" key={field.key}><dt>{field.label}</dt><dd>{Array.isArray(selected) ? selected.join(', ') : String(selected)}</dd></div>;
              }
              return <fieldset key={field.key} className="case-history-field" aria-describedby={errors[field.key] ? `${id}-error` : undefined}>
                <legend>{field.label}</legend>
                {field.options ? <div className="case-history-options">
                  {field.options.map((option, optionIndex) => <label key={option} htmlFor={`${id}-${optionIndex}`}>
                    <input id={`${id}-${optionIndex}`} name={id} type={field.type === 'multi' ? 'checkbox' : 'radio'}
                      checked={field.type === 'multi' ? Array.isArray(selected) && selected.includes(option) : selected === option}
                      onChange={() => field.type === 'multi' ? toggle(field, option) : change(field.key, option)} />
                    <span>{option}</span>
                  </label>)}
                  {field.type === 'single' && answered(selected) && <button type="button" className="case-history-clear" aria-label={`Clear ${field.label}`} title={`Clear ${field.label}`} onClick={() => change(field.key, '')}>&times;</button>}
                </div> : field.type === 'text' ? <textarea aria-label={field.label} value={selected ?? ''} rows={2} maxLength={5000} onChange={e => change(field.key, e.target.value)} /> :
                  <input aria-label={field.label} aria-invalid={Boolean(errors[field.key])} type={field.type} min={field.min} step={field.type === 'number' ? 'any' : undefined} value={selected ?? ''} onChange={e => change(field.key, e.target.value)} />}
                {errors[field.key] && <p className="case-history-error" id={`${id}-error`} role="alert">{errors[field.key]}</p>}
              </fieldset>;
            })}
          </Grid>
        </section>;
      })}
      {readOnly && !sections.some(section => section.fields.some(field => visible(field, values) && answered(values[field.key]))) && <p className="case-history-empty">No structured examination recorded.</p>}
    </div>
  );
}
