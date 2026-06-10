const FORM_BORDER = 'border border-gray-200 dark:border-slate-600';

const FORM_FOCUS =
  'outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/40';

const FORM_FOCUS_WITHIN =
  'focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/40';

/** Standard single-line / multiline text field (legacy Pyonea parity). */
export const FORM_INPUT_CLASS = `rounded-xl ${FORM_BORDER} bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:bg-slate-700 dark:text-slate-100 ${FORM_FOCUS}`;

/** Compact quantity field inside line cards. */
export const FORM_QTY_INPUT_CLASS = `rounded-lg ${FORM_BORDER} bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:bg-slate-700 dark:text-slate-100 ${FORM_FOCUS}`;

/** Icon + input search row — ring on wrapper when inner field is focused. */
export const FORM_SEARCH_WRAPPER_CLASS = `flex-row items-center rounded-xl ${FORM_BORDER} bg-gray-50 px-3 dark:bg-slate-700/50 ${FORM_FOCUS_WITHIN}`;

/** Borderless inner search input (border lives on wrapper). */
export const FORM_SEARCH_INPUT_CLASS =
  'min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 font-sans text-sm text-gray-900 outline-none dark:text-slate-100';

/** Bordered date-field shell (web input + native trigger). */
export const FORM_DATE_FIELD_SHELL = `min-h-12 rounded-xl ${FORM_BORDER} bg-white dark:bg-slate-700 ${FORM_FOCUS_WITHIN}`;

export const FORM_DATE_FIELD_CLASS = `${FORM_DATE_FIELD_SHELL} justify-center px-4 py-2`;

export const FORM_DATE_TRIGGER_CLASS = `${FORM_DATE_FIELD_SHELL} flex-row items-center justify-between gap-3 px-4 py-3`;
