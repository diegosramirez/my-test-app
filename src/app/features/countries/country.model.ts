export interface Country {
  name: string;
  capital: string;
  flag: string;
}

// French Guiana (Guayana Francesa) is excluded from this list because it is an
// overseas territory of France, not a sovereign state.
export const SOUTH_AMERICAN_COUNTRIES: readonly Country[] = [
  { name: 'Argentina', capital: 'Buenos Aires', flag: '\u{1F1E6}\u{1F1F7}' },
  // Bolivia: constitutional capital is Sucre; La Paz is seat of government. Using Sucre per constitutional designation. Confirm with PO.
  { name: 'Bolivia', capital: 'Sucre', flag: '\u{1F1E7}\u{1F1F4}' },
  { name: 'Brasil', capital: 'Brasilia', flag: '\u{1F1E7}\u{1F1F7}' },
  { name: 'Chile', capital: 'Santiago', flag: '\u{1F1E8}\u{1F1F1}' },
  { name: 'Colombia', capital: 'Bogot\u00e1', flag: '\u{1F1E8}\u{1F1F4}' },
  { name: 'Ecuador', capital: 'Quito', flag: '\u{1F1EA}\u{1F1E8}' },
  { name: 'Guyana', capital: 'Georgetown', flag: '\u{1F1EC}\u{1F1FE}' },
  { name: 'Paraguay', capital: 'Asunci\u00f3n', flag: '\u{1F1F5}\u{1F1FE}' },
  { name: 'Per\u00fa', capital: 'Lima', flag: '\u{1F1F5}\u{1F1EA}' },
  { name: 'Surinam', capital: 'Paramaribo', flag: '\u{1F1F8}\u{1F1F7}' },
  { name: 'Uruguay', capital: 'Montevideo', flag: '\u{1F1FA}\u{1F1FE}' },
  { name: 'Venezuela', capital: 'Caracas', flag: '\u{1F1FB}\u{1F1EA}' },
];
