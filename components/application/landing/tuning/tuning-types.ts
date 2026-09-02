/**
 * The tuning panel's control shapes, on their own so a config module can name
 * them without pulling the panel (dev tooling) into whatever ships that config.
 */
export type TuningControl =
  | {
      key: string;
      label: string;
      type: "range";
      min: number;
      max: number;
      step: number;
      hint: string;
    }
  | { key: string; label: string; type: "color"; hint: string }
  | {
      key: string;
      label: string;
      type: "select";
      options: { value: number; label: string }[];
      hint: string;
    };

export type TuningGroup = { title: string; controls: TuningControl[] };
