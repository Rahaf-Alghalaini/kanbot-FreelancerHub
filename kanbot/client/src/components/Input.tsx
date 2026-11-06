import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

/** Label + control + hint/error. The label wraps the control so they are linked for screen readers. */
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error" role="alert">{error}</span>}
    </label>
  );
}

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />;
export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />;
export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} />;
