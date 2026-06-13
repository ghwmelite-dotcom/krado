import { CheckIcon } from "./icons";

export interface StepperProps {
  /** Step labels in order — 3 steps in every Krado flow. */
  steps: readonly string[];
  /** Zero-based index of the current step. */
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="krado-stepper">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li
            key={label}
            className={`krado-stepper__step krado-stepper__step--${state}`}
            aria-current={i === current ? "step" : undefined}
          >
            <span className="krado-stepper__bullet" aria-hidden="true">
              {i < current ? <CheckIcon size={12} /> : i + 1}
            </span>
            <span className="krado-stepper__label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
