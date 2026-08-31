import { useState } from 'react';
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';

export interface AddressOption {
  id: string | number;
  name: string;
}

interface AddressComboboxProps {
  options: AddressOption[];
  value: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

export default function AddressCombobox({
  options,
  value,
  onChange,
  placeholder = 'Seçiniz...',
  disabled = false,
  loading = false,
}: AddressComboboxProps) {
  const [query, setQuery] = useState('');

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) =>
          option.name
            .toLowerCase()
            .toLocaleLowerCase('tr-TR')
            .replace(/\s+/g, '')
            .includes(query.toLowerCase().toLocaleLowerCase('tr-TR').replace(/\s+/g, ''))
        );

  return (
    <div className="relative">
      <Combobox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <ComboboxInput
            className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-colors ${
              disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'
            }`}
            placeholder={placeholder}
            displayValue={(val: string) => val}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-3">
            {loading ? (
              <Loader2 className="h-5 w-5 text-slate-400 animate-spin" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" aria-hidden="true" />
            )}
          </ComboboxButton>
        </div>
        <ComboboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {filteredOptions.length === 0 && query !== '' ? (
            <div className="relative cursor-default select-none py-2 px-4 text-slate-700">
              Sonuç bulunamadı.
            </div>
          ) : (
            filteredOptions.map((option) => (
              <ComboboxOption
                key={option.id}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors ${
                    active ? 'bg-blue-100 text-blue-900' : 'text-slate-900'
                  }`
                }
                value={option.name}
              >
                {({ selected, active }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      {option.name}
                    </span>
                    {selected ? (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          active ? 'text-blue-600' : 'text-blue-600'
                        }`}
                      >
                        <Check className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </Combobox>
    </div>
  );
}
