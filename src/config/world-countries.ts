/**
 * world-countries.ts
 *
 * Master list of countries with default currency and phone validation.
 * Super admin picks a subset; that subset drives all country/currency dropdowns.
 */

export interface WorldCountry {
  /** Display name shown in dropdowns */
  name: string;
  /** ISO 3166-1 alpha-2 */
  code: string;
  /** Calling code e.g. "+92" */
  callingCode: string;
  /** ISO 4217 currency code */
  currencyCode: string;
  /** Human-readable currency name */
  currencyName: string;
  /** Currency symbol */
  currencySymbol: string;
  /** BCP-47 locale (used for number/date formatting) */
  locale: string;
  /**
   * Input mask pattern. `#` = one digit. Literal characters (spaces, dashes,
   * parens) are inserted automatically as the user types.
   * e.g. "+92 3##-#######"
   */
  phoneMask: string;
  /**
   * Tooltip example shown next to the phone label.
   * A real local number in the masked format, e.g. "+92 312-3456789"
   */
  phoneExample: string;
}

export const WORLD_COUNTRIES: WorldCountry[] = [
  {
    name: 'Pakistan', code: 'PK', callingCode: '+92',
    currencyCode: 'PKR', currencyName: 'Pakistani Rupee', currencySymbol: '₨', locale: 'en-PK',
    phoneMask: '+92 3##-#######', phoneExample: '+92 312-3456789',
  },
  {
    name: 'United States', code: 'US', callingCode: '+1',
    currencyCode: 'USD', currencyName: 'US Dollar', currencySymbol: '$', locale: 'en-US',
    phoneMask: '+1 (###) ###-####', phoneExample: '+1 (212) 555-0147',
  },
  {
    name: 'United Kingdom', code: 'GB', callingCode: '+44',
    currencyCode: 'GBP', currencyName: 'Pound Sterling', currencySymbol: '£', locale: 'en-GB',
    phoneMask: '+44 #### ######', phoneExample: '+44 7911 123456',
  },
  {
    name: 'Canada', code: 'CA', callingCode: '+1',
    currencyCode: 'CAD', currencyName: 'Canadian Dollar', currencySymbol: 'CA$', locale: 'en-CA',
    phoneMask: '+1 (###) ###-####', phoneExample: '+1 (416) 555-0182',
  },
  {
    name: 'Australia', code: 'AU', callingCode: '+61',
    currencyCode: 'AUD', currencyName: 'Australian Dollar', currencySymbol: 'A$', locale: 'en-AU',
    phoneMask: '+61 ### ### ###', phoneExample: '+61 412 345 678',
  },
  {
    name: 'Germany', code: 'DE', callingCode: '+49',
    currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€', locale: 'de-DE',
    phoneMask: '+49 ### ########', phoneExample: '+49 151 23456789',
  },
  {
    name: 'France', code: 'FR', callingCode: '+33',
    currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€', locale: 'fr-FR',
    phoneMask: '+33 # ## ## ## ##', phoneExample: '+33 6 12 34 56 78',
  },
  {
    name: 'Spain', code: 'ES', callingCode: '+34',
    currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€', locale: 'es-ES',
    phoneMask: '+34 ### ### ###', phoneExample: '+34 612 345 678',
  },
  {
    name: 'Italy', code: 'IT', callingCode: '+39',
    currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€', locale: 'it-IT',
    phoneMask: '+39 ### ### ####', phoneExample: '+39 312 345 6789',
  },
  {
    name: 'Netherlands', code: 'NL', callingCode: '+31',
    currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€', locale: 'nl-NL',
    phoneMask: '+31 # ########', phoneExample: '+31 6 12345678',
  },
  {
    name: 'India', code: 'IN', callingCode: '+91',
    currencyCode: 'INR', currencyName: 'Indian Rupee', currencySymbol: '₹', locale: 'en-IN',
    phoneMask: '+91 ##### #####', phoneExample: '+91 98765 43210',
  },
  {
    name: 'United Arab Emirates', code: 'AE', callingCode: '+971',
    currencyCode: 'AED', currencyName: 'UAE Dirham', currencySymbol: 'د.إ', locale: 'ar-AE',
    phoneMask: '+971 ## ### ####', phoneExample: '+971 50 123 4567',
  },
  {
    name: 'Saudi Arabia', code: 'SA', callingCode: '+966',
    currencyCode: 'SAR', currencyName: 'Saudi Riyal', currencySymbol: '﷼', locale: 'ar-SA',
    phoneMask: '+966 ## ### ####', phoneExample: '+966 55 123 4567',
  },
  {
    name: 'Qatar', code: 'QA', callingCode: '+974',
    currencyCode: 'QAR', currencyName: 'Qatari Riyal', currencySymbol: 'QR', locale: 'ar-QA',
    phoneMask: '+974 #### ####', phoneExample: '+974 5512 3456',
  },
  {
    name: 'Kuwait', code: 'KW', callingCode: '+965',
    currencyCode: 'KWD', currencyName: 'Kuwaiti Dinar', currencySymbol: 'KD', locale: 'ar-KW',
    phoneMask: '+965 #### ####', phoneExample: '+965 5512 3456',
  },
  {
    name: 'Bahrain', code: 'BH', callingCode: '+973',
    currencyCode: 'BHD', currencyName: 'Bahraini Dinar', currencySymbol: 'BD', locale: 'ar-BH',
    phoneMask: '+973 #### ####', phoneExample: '+973 3312 3456',
  },
  {
    name: 'Oman', code: 'OM', callingCode: '+968',
    currencyCode: 'OMR', currencyName: 'Omani Rial', currencySymbol: 'ر.ع.', locale: 'ar-OM',
    phoneMask: '+968 #### ####', phoneExample: '+968 9212 3456',
  },
  {
    name: 'Egypt', code: 'EG', callingCode: '+20',
    currencyCode: 'EGP', currencyName: 'Egyptian Pound', currencySymbol: 'E£', locale: 'ar-EG',
    phoneMask: '+20 ### #### ####', phoneExample: '+20 101 2345 6789',
  },
  {
    name: 'Turkey', code: 'TR', callingCode: '+90',
    currencyCode: 'TRY', currencyName: 'Turkish Lira', currencySymbol: '₺', locale: 'tr-TR',
    phoneMask: '+90 ### ### ####', phoneExample: '+90 532 123 4567',
  },
  {
    name: 'Bangladesh', code: 'BD', callingCode: '+880',
    currencyCode: 'BDT', currencyName: 'Bangladeshi Taka', currencySymbol: '৳', locale: 'bn-BD',
    phoneMask: '+880 ##-########', phoneExample: '+880 17-12345678',
  },
  {
    name: 'Nigeria', code: 'NG', callingCode: '+234',
    currencyCode: 'NGN', currencyName: 'Nigerian Naira', currencySymbol: '₦', locale: 'en-NG',
    phoneMask: '+234 ### ### ####', phoneExample: '+234 802 123 4567',
  },
  {
    name: 'South Africa', code: 'ZA', callingCode: '+27',
    currencyCode: 'ZAR', currencyName: 'South African Rand', currencySymbol: 'R', locale: 'en-ZA',
    phoneMask: '+27 ## ### ####', phoneExample: '+27 82 123 4567',
  },
  {
    name: 'Kenya', code: 'KE', callingCode: '+254',
    currencyCode: 'KES', currencyName: 'Kenyan Shilling', currencySymbol: 'KSh', locale: 'en-KE',
    phoneMask: '+254 ### ### ###', phoneExample: '+254 712 345 678',
  },
  {
    name: 'Ghana', code: 'GH', callingCode: '+233',
    currencyCode: 'GHS', currencyName: 'Ghanaian Cedi', currencySymbol: '₵', locale: 'en-GH',
    phoneMask: '+233 ## ### ####', phoneExample: '+233 20 123 4567',
  },
  {
    name: 'Malaysia', code: 'MY', callingCode: '+60',
    currencyCode: 'MYR', currencyName: 'Malaysian Ringgit', currencySymbol: 'RM', locale: 'ms-MY',
    phoneMask: '+60 ##-### ####', phoneExample: '+60 12-345 6789',
  },
  {
    name: 'Singapore', code: 'SG', callingCode: '+65',
    currencyCode: 'SGD', currencyName: 'Singapore Dollar', currencySymbol: 'S$', locale: 'en-SG',
    phoneMask: '+65 #### ####', phoneExample: '+65 8123 4567',
  },
  {
    name: 'Indonesia', code: 'ID', callingCode: '+62',
    currencyCode: 'IDR', currencyName: 'Indonesian Rupiah', currencySymbol: 'Rp', locale: 'id-ID',
    phoneMask: '+62 ###-####-####', phoneExample: '+62 812-3456-7890',
  },
  {
    name: 'Philippines', code: 'PH', callingCode: '+63',
    currencyCode: 'PHP', currencyName: 'Philippine Peso', currencySymbol: '₱', locale: 'en-PH',
    phoneMask: '+63 ### ### ####', phoneExample: '+63 912 345 6789',
  },
  {
    name: 'Thailand', code: 'TH', callingCode: '+66',
    currencyCode: 'THB', currencyName: 'Thai Baht', currencySymbol: '฿', locale: 'th-TH',
    phoneMask: '+66 ## ### ####', phoneExample: '+66 81 234 5678',
  },
  {
    name: 'Vietnam', code: 'VN', callingCode: '+84',
    currencyCode: 'VND', currencyName: 'Vietnamese Dong', currencySymbol: '₫', locale: 'vi-VN',
    phoneMask: '+84 ### ### ###', phoneExample: '+84 912 345 678',
  },
  {
    name: 'Japan', code: 'JP', callingCode: '+81',
    currencyCode: 'JPY', currencyName: 'Japanese Yen', currencySymbol: '¥', locale: 'ja-JP',
    phoneMask: '+81 ##-####-####', phoneExample: '+81 90-1234-5678',
  },
  {
    name: 'South Korea', code: 'KR', callingCode: '+82',
    currencyCode: 'KRW', currencyName: 'South Korean Won', currencySymbol: '₩', locale: 'ko-KR',
    phoneMask: '+82 ##-####-####', phoneExample: '+82 10-1234-5678',
  },
  {
    name: 'China', code: 'CN', callingCode: '+86',
    currencyCode: 'CNY', currencyName: 'Chinese Yuan', currencySymbol: '¥', locale: 'zh-CN',
    phoneMask: '+86 ### #### ####', phoneExample: '+86 138 1234 5678',
  },
  {
    name: 'Brazil', code: 'BR', callingCode: '+55',
    currencyCode: 'BRL', currencyName: 'Brazilian Real', currencySymbol: 'R$', locale: 'pt-BR',
    phoneMask: '+55 (##) #####-####', phoneExample: '+55 (11) 91234-5678',
  },
  {
    name: 'Mexico', code: 'MX', callingCode: '+52',
    currencyCode: 'MXN', currencyName: 'Mexican Peso', currencySymbol: 'MX$', locale: 'es-MX',
    phoneMask: '+52 ### ### ####', phoneExample: '+52 555 123 4567',
  },
  {
    name: 'Argentina', code: 'AR', callingCode: '+54',
    currencyCode: 'ARS', currencyName: 'Argentine Peso', currencySymbol: '$', locale: 'es-AR',
    phoneMask: '+54 # ## ####-####', phoneExample: '+54 9 11 1234-5678',
  },
  {
    name: 'Colombia', code: 'CO', callingCode: '+57',
    currencyCode: 'COP', currencyName: 'Colombian Peso', currencySymbol: '$', locale: 'es-CO',
    phoneMask: '+57 ### ### ####', phoneExample: '+57 312 345 6789',
  },
  {
    name: 'Chile', code: 'CL', callingCode: '+56',
    currencyCode: 'CLP', currencyName: 'Chilean Peso', currencySymbol: 'CLP$', locale: 'es-CL',
    phoneMask: '+56 # #### ####', phoneExample: '+56 9 1234 5678',
  },
  {
    name: 'New Zealand', code: 'NZ', callingCode: '+64',
    currencyCode: 'NZD', currencyName: 'New Zealand Dollar', currencySymbol: 'NZ$', locale: 'en-NZ',
    phoneMask: '+64 ## ### ####', phoneExample: '+64 21 234 5678',
  },
  {
    name: 'Sweden', code: 'SE', callingCode: '+46',
    currencyCode: 'SEK', currencyName: 'Swedish Krona', currencySymbol: 'kr', locale: 'sv-SE',
    phoneMask: '+46 ##-### ## ##', phoneExample: '+46 70-123 45 67',
  },
  {
    name: 'Norway', code: 'NO', callingCode: '+47',
    currencyCode: 'NOK', currencyName: 'Norwegian Krone', currencySymbol: 'kr', locale: 'nb-NO',
    phoneMask: '+47 ### ## ###', phoneExample: '+47 412 34 567',
  },
  {
    name: 'Denmark', code: 'DK', callingCode: '+45',
    currencyCode: 'DKK', currencyName: 'Danish Krone', currencySymbol: 'kr', locale: 'da-DK',
    phoneMask: '+45 ## ## ## ##', phoneExample: '+45 20 12 34 56',
  },
  {
    name: 'Switzerland', code: 'CH', callingCode: '+41',
    currencyCode: 'CHF', currencyName: 'Swiss Franc', currencySymbol: 'CHF', locale: 'de-CH',
    phoneMask: '+41 ## ### ## ##', phoneExample: '+41 76 123 45 67',
  },
  {
    name: 'Poland', code: 'PL', callingCode: '+48',
    currencyCode: 'PLN', currencyName: 'Polish Zloty', currencySymbol: 'zł', locale: 'pl-PL',
    phoneMask: '+48 ### ### ###', phoneExample: '+48 512 345 678',
  },
  {
    name: 'Russia', code: 'RU', callingCode: '+7',
    currencyCode: 'RUB', currencyName: 'Russian Ruble', currencySymbol: '₽', locale: 'ru-RU',
    phoneMask: '+7 ### ###-##-##', phoneExample: '+7 912 345-67-89',
  },
  {
    name: 'Ukraine', code: 'UA', callingCode: '+380',
    currencyCode: 'UAH', currencyName: 'Ukrainian Hryvnia', currencySymbol: '₴', locale: 'uk-UA',
    phoneMask: '+380 ## ### ####', phoneExample: '+380 95 123 4567',
  },
  {
    name: 'Israel', code: 'IL', callingCode: '+972',
    currencyCode: 'ILS', currencyName: 'Israeli New Shekel', currencySymbol: '₪', locale: 'he-IL',
    phoneMask: '+972 ##-###-####', phoneExample: '+972 52-123-4567',
  },
  {
    name: 'Jordan', code: 'JO', callingCode: '+962',
    currencyCode: 'JOD', currencyName: 'Jordanian Dinar', currencySymbol: 'JD', locale: 'ar-JO',
    phoneMask: '+962 # #### ####', phoneExample: '+962 7 9012 3456',
  },
  {
    name: 'Morocco', code: 'MA', callingCode: '+212',
    currencyCode: 'MAD', currencyName: 'Moroccan Dirham', currencySymbol: 'MAD', locale: 'ar-MA',
    phoneMask: '+212 ##-######', phoneExample: '+212 61-234567',
  },
  {
    name: 'Sri Lanka', code: 'LK', callingCode: '+94',
    currencyCode: 'LKR', currencyName: 'Sri Lankan Rupee', currencySymbol: 'Rs', locale: 'si-LK',
    phoneMask: '+94 ## ### ####', phoneExample: '+94 77 123 4567',
  },
  {
    name: 'Nepal', code: 'NP', callingCode: '+977',
    currencyCode: 'NPR', currencyName: 'Nepalese Rupee', currencySymbol: 'रू', locale: 'ne-NP',
    phoneMask: '+977 ####-######', phoneExample: '+977 9812-345678',
  },
  {
    name: 'Afghanistan', code: 'AF', callingCode: '+93',
    currencyCode: 'AFN', currencyName: 'Afghan Afghani', currencySymbol: '؋', locale: 'ps-AF',
    phoneMask: '+93 ## ### ####', phoneExample: '+93 70 123 4567',
  },
  {
    name: 'Iraq', code: 'IQ', callingCode: '+964',
    currencyCode: 'IQD', currencyName: 'Iraqi Dinar', currencySymbol: 'ع.د', locale: 'ar-IQ',
    phoneMask: '+964 ### ### ####', phoneExample: '+964 770 123 4567',
  },
  {
    name: 'Iran', code: 'IR', callingCode: '+98',
    currencyCode: 'IRR', currencyName: 'Iranian Rial', currencySymbol: '﷼', locale: 'fa-IR',
    phoneMask: '+98 ### ### ####', phoneExample: '+98 912 345 6789',
  },
  {
    name: 'Ethiopia', code: 'ET', callingCode: '+251',
    currencyCode: 'ETB', currencyName: 'Ethiopian Birr', currencySymbol: 'Br', locale: 'am-ET',
    phoneMask: '+251 ## ### ####', phoneExample: '+251 91 123 4567',
  },
  {
    name: 'Tanzania', code: 'TZ', callingCode: '+255',
    currencyCode: 'TZS', currencyName: 'Tanzanian Shilling', currencySymbol: 'TSh', locale: 'sw-TZ',
    phoneMask: '+255 ### ### ###', phoneExample: '+255 712 345 678',
  },
  {
    name: 'Uganda', code: 'UG', callingCode: '+256',
    currencyCode: 'UGX', currencyName: 'Ugandan Shilling', currencySymbol: 'USh', locale: 'en-UG',
    phoneMask: '+256 ### ### ###', phoneExample: '+256 712 345 678',
  },
  {
    name: 'Zimbabwe', code: 'ZW', callingCode: '+263',
    currencyCode: 'USD', currencyName: 'US Dollar', currencySymbol: '$', locale: 'en-ZW',
    phoneMask: '+263 ## ### ####', phoneExample: '+263 77 123 4567',
  },
];

/** Build a lookup map: country name → WorldCountry */
export const COUNTRY_BY_NAME = new Map<string, WorldCountry>(
  WORLD_COUNTRIES.map((c) => [c.name, c]),
);

/** Build a lookup map: country code → WorldCountry */
export const COUNTRY_BY_CODE = new Map<string, WorldCountry>(
  WORLD_COUNTRIES.map((c) => [c.code, c]),
);
