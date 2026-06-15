import { useMemo } from 'react';

import { SelectPickerNative } from '@/components/ui/select-picker-native';
import { FALLBACK_STATES_EN, FALLBACK_STATES_MM } from '@/data/myanmar-locations';
import { useAppTranslation } from '@/i18n';

export function MyanmarRegionPicker({
  label,
  value,
  onChange,
  disabled,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const { t, language } = useAppTranslation();
  const options = useMemo(() => {
    const regions = language === 'my' ? FALLBACK_STATES_MM : FALLBACK_STATES_EN;
    return [
      {
        value: '',
        label: t('sellerSettings.regions.select', 'Select state / region…'),
      },
      ...regions.map(({ state }) => ({ value: state, label: state })),
    ];
  }, [language, t]);

  return (
    <SelectPickerNative
      label={label}
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled}
      required={required}
      placeholder={t('sellerSettings.regions.select', 'Select state / region…')}
    />
  );
}
