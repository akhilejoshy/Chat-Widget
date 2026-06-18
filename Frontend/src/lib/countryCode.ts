const COUNTRY_MAP: Record<string, string> = {
  'Afghanistan': 'af', 'Albania': 'al', 'Algeria': 'dz', 'Andorra': 'ad', 'Angola': 'ao',
  'Argentina': 'ar', 'Armenia': 'am', 'Australia': 'au', 'Austria': 'at', 'Azerbaijan': 'az',
  'Bahamas': 'bs', 'Bahrain': 'bh', 'Bangladesh': 'bd', 'Belarus': 'by', 'Belgium': 'be',
  'Belize': 'bz', 'Benin': 'bj', 'Bolivia': 'bo', 'Bosnia and Herzegovina': 'ba', 'Botswana': 'bw',
  'Brazil': 'br', 'Brunei': 'bn', 'Bulgaria': 'bg', 'Cambodia': 'kh', 'Cameroon': 'cm',
  'Canada': 'ca', 'Chile': 'cl', 'China': 'cn', 'Colombia': 'co', 'Costa Rica': 'cr',
  'Croatia': 'hr', 'Cuba': 'cu', 'Cyprus': 'cy', 'Czechia': 'cz', 'Czech Republic': 'cz',
  'Denmark': 'dk', 'Dominican Republic': 'do', 'Ecuador': 'ec', 'Egypt': 'eg', 'Estonia': 'ee',
  'Ethiopia': 'et', 'Finland': 'fi', 'France': 'fr', 'Georgia': 'ge', 'Germany': 'de',
  'Ghana': 'gh', 'Greece': 'gr', 'Guatemala': 'gt', 'Hungary': 'hu', 'Iceland': 'is',
  'India': 'in', 'Indonesia': 'id', 'Iran': 'ir', 'Iraq': 'iq', 'Ireland': 'ie',
  'Israel': 'il', 'Italy': 'it', 'Jamaica': 'jm', 'Japan': 'jp', 'Jordan': 'jo',
  'Kazakhstan': 'kz', 'Kenya': 'ke', 'Kuwait': 'kw', 'Latvia': 'lv', 'Lebanon': 'lb',
  'Libya': 'ly', 'Lithuania': 'lt', 'Luxembourg': 'lu', 'Malaysia': 'my', 'Malta': 'mt',
  'Mexico': 'mx', 'Moldova': 'md', 'Monaco': 'mc', 'Mongolia': 'mn', 'Montenegro': 'me',
  'Morocco': 'ma', 'Mozambique': 'mz', 'Nepal': 'np', 'Netherlands': 'nl', 'New Zealand': 'nz',
  'Nigeria': 'ng', 'North Korea': 'kp', 'Norway': 'no', 'Oman': 'om', 'Pakistan': 'pk',
  'Panama': 'pa', 'Paraguay': 'py', 'Peru': 'pe', 'Philippines': 'ph', 'Poland': 'pl',
  'Portugal': 'pt', 'Qatar': 'qa', 'Romania': 'ro', 'Russia': 'ru', 'Rwanda': 'rw',
  'Saudi Arabia': 'sa', 'Senegal': 'sn', 'Serbia': 'rs', 'Singapore': 'sg', 'Slovakia': 'sk',
  'Slovenia': 'si', 'Somalia': 'so', 'South Africa': 'za', 'South Korea': 'kr', 'Spain': 'es',
  'Sri Lanka': 'lk', 'Sudan': 'sd', 'Sweden': 'se', 'Switzerland': 'ch', 'Syria': 'sy',
  'Tanzania': 'tz', 'Thailand': 'th', 'Tunisia': 'tn', 'Turkey': 'tr', 'Uganda': 'ug',
  'Ukraine': 'ua', 'United Arab Emirates': 'ae', 'United Kingdom': 'gb', 'United Kingdom (UK)': 'gb',
  'United States': 'us', 'United States of America': 'us', 'USA': 'us', 'Uruguay': 'uy',
  'Venezuela': 've', 'Vietnam': 'vn', 'Yemen': 'ye', 'Zambia': 'zm', 'Zimbabwe': 'zw'
};

export const getCountryShortCode = (countryName: string): string | undefined => {
  if (!countryName) return undefined;
  return COUNTRY_MAP[countryName.trim()];
};
