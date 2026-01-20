import { faker } from '@faker-js/faker';
import { Company } from './types';

// European country configurations for realistic company data
const EU_COUNTRIES = [
  { code: 'DE', locale: 'de', suffix: ['GmbH', 'AG', 'KG'], vatPrefix: 'DE', ibanPrefix: 'DE', bankNames: ['Deutsche Bank AG', 'Commerzbank AG', 'DZ Bank AG'] },
  { code: 'NL', locale: 'nl', suffix: ['B.V.', 'N.V.'], vatPrefix: 'NL', ibanPrefix: 'NL', bankNames: ['ING Bank N.V.', 'ABN AMRO', 'Rabobank'] },
  { code: 'GB', locale: 'en_GB', suffix: ['Ltd', 'PLC'], vatPrefix: 'GB', ibanPrefix: 'GB', bankNames: ['Barclays Bank', 'HSBC UK', 'Lloyds Bank'] },
  { code: 'FR', locale: 'fr', suffix: ['S.A.', 'S.A.R.L.', 'SAS'], vatPrefix: 'FR', ibanPrefix: 'FR', bankNames: ['BNP Paribas', 'Crédit Agricole', 'Société Générale'] },
  { code: 'IT', locale: 'it', suffix: ['SpA', 'S.r.l.'], vatPrefix: 'IT', ibanPrefix: 'IT', bankNames: ['UniCredit S.p.A.', 'Intesa Sanpaolo', 'Banca Monte dei Paschi'] },
  { code: 'ES', locale: 'es', suffix: ['S.A.', 'S.L.'], vatPrefix: 'ES', ibanPrefix: 'ES', bankNames: ['Banco Santander', 'BBVA', 'CaixaBank'] },
  { code: 'SE', locale: 'sv', suffix: ['AB', 'AS'], vatPrefix: 'SE', ibanPrefix: 'SE', bankNames: ['Nordea Bank', 'SEB', 'Swedbank'] },
  { code: 'CH', locale: 'de_CH', suffix: ['AG', 'GmbH', 'SA'], vatPrefix: 'CHE', ibanPrefix: 'CH', bankNames: ['UBS AG', 'Credit Suisse', 'Zürcher Kantonalbank'] },
  { code: 'BE', locale: 'nl_BE', suffix: ['S.A.', 'N.V.', 'SPRL'], vatPrefix: 'BE', ibanPrefix: 'BE', bankNames: ['BNP Paribas Fortis', 'KBC Bank', 'Belfius'] },
  { code: 'AT', locale: 'de_AT', suffix: ['GmbH', 'AG'], vatPrefix: 'ATU', ibanPrefix: 'AT', bankNames: ['Erste Bank', 'Raiffeisen Bank', 'Bank Austria'] },
];

// Business word components for company names
const BUSINESS_PREFIXES = [
  'Tech', 'Data', 'Cloud', 'Digital', 'Smart', 'Euro', 'Global', 'Pro', 'Net', 'Sys',
  'Info', 'Cyber', 'Logic', 'Soft', 'Web', 'Auto', 'Bio', 'Eco', 'Med', 'Fin',
];

const BUSINESS_SUFFIXES = [
  'Solutions', 'Systems', 'Services', 'Tech', 'Soft', 'Pro', 'Labs', 'Works', 'Group', 'Corp',
  'Dynamics', 'Logic', 'Ware', 'Net', 'Link', 'Hub', 'Base', 'Core', 'Wave', 'Flow',
];

const BUSINESS_INDUSTRIES = [
  'Software', 'Consulting', 'Logistics', 'Marketing', 'Finance', 'Engineering', 'Supply', 'Print',
  'Medical', 'Office', 'Security', 'Analytics', 'Automation', 'Integration', 'Components',
];

// Generate a realistic business name
function generateBusinessName(): string {
  const style = faker.number.int({ min: 0, max: 3 });

  switch (style) {
    case 0:
      // Prefix + Suffix style: "TechSolutions", "DataPro"
      return faker.helpers.arrayElement(BUSINESS_PREFIXES) + faker.helpers.arrayElement(BUSINESS_SUFFIXES);
    case 1:
      // Industry + descriptor: "Nordic Software", "Digital Marketing"
      return faker.helpers.arrayElement(['Nordic', 'Euro', 'Global', 'Prime', 'Alpha', 'Delta']) + ' ' +
             faker.helpers.arrayElement(BUSINESS_INDUSTRIES);
    case 2:
      // Name + Industry: "Schmidt Logistics", "Mueller Tech"
      return faker.person.lastName() + ' ' + faker.helpers.arrayElement(BUSINESS_INDUSTRIES);
    default:
      // Combined: "CloudServices", "DataPro Solutions"
      return faker.helpers.arrayElement(BUSINESS_PREFIXES) + faker.helpers.arrayElement(BUSINESS_INDUSTRIES);
  }
}

// Generate name variations for a company
function generateNameVariations(baseName: string, legalSuffix: string): string[] {
  const fullName = `${baseName} ${legalSuffix}`;
  const variations: string[] = [];

  // Uppercase full name
  variations.push(fullName.toUpperCase());

  // Without legal suffix
  variations.push(baseName);

  // Uppercase without suffix
  variations.push(baseName.toUpperCase());

  // Abbreviated (first letters of each word + legal suffix)
  const abbrev = baseName.split(/(?=[A-Z])|\s+/).map(w => w[0]).join('').toUpperCase();
  if (abbrev.length >= 2) {
    variations.push(abbrev);
    variations.push(`${abbrev} ${legalSuffix}`);
  }

  // With spaces between camelCase
  const spaced = baseName.replace(/([a-z])([A-Z])/g, '$1 $2');
  if (spaced !== baseName) {
    variations.push(spaced);
    variations.push(`${spaced} ${legalSuffix}`);
  }

  // Remove periods from legal suffix
  const cleanSuffix = legalSuffix.replace(/\./g, '');
  if (cleanSuffix !== legalSuffix) {
    variations.push(`${baseName} ${cleanSuffix}`);
  }

  // Sometimes banks truncate to first N characters
  if (baseName.length > 10) {
    variations.push(baseName.substring(0, 10).toUpperCase());
  }

  return [...new Set(variations)]; // Remove duplicates
}

// Generate a random supplier company
export function generateCompany(): Company & { nameVariations: string[] } {
  const country = faker.helpers.arrayElement(EU_COUNTRIES);
  const baseName = generateBusinessName();
  const legalSuffix = faker.helpers.arrayElement(country.suffix);
  const fullName = `${baseName} ${legalSuffix}`;

  return {
    name: fullName,
    address: `${faker.location.streetAddress()}, ${faker.location.zipCode()} ${faker.location.city()}, ${country.code}`,
    phone: faker.phone.number(),
    email: faker.internet.email({ firstName: 'billing', lastName: baseName.toLowerCase().replace(/\s+/g, '') }),
    website: `www.${baseName.toLowerCase().replace(/\s+/g, '')}.${country.code.toLowerCase()}`,
    bankName: faker.helpers.arrayElement(country.bankNames),
    iban: faker.finance.iban({ countryCode: country.ibanPrefix as any }),
    vatId: `${country.vatPrefix}${faker.string.numeric(9)}`,
    nameVariations: generateNameVariations(baseName, legalSuffix),
  };
}

// Get a random supplier (generates a new one each time for variety)
export function getRandomSupplier(): Company & { nameVariations: string[] } {
  return generateCompany();
}

// Get a random name variation for a company (for bank transaction descriptions)
export function getRandomNameVariation(company: Company & { nameVariations?: string[] }): string {
  // 40% chance to use the original name
  if (Math.random() < 0.4) {
    return company.name;
  }

  // Check if company has variations
  if (company.nameVariations && company.nameVariations.length > 0) {
    return faker.helpers.arrayElement(company.nameVariations);
  }

  // Fallback: generate a simple variation on the fly
  return generateSimpleVariation(company.name);
}

// Generate simple name variations for companies without predefined ones
function generateSimpleVariation(name: string): string {
  const variationType = faker.number.int({ min: 0, max: 4 });

  switch (variationType) {
    case 0:
      return name.toUpperCase();
    case 1:
      return name.split(' ')[0]; // First word only
    case 2:
      return name.replace(/\s+(GmbH|Ltd|AG|B\.V\.|S\.A\.|SpA|KG|Oy|AS|S\.L\.|AB|N\.V\.|PLC|S\.r\.l\.|S\.A\.R\.L\.|SAS|SPRL)$/i, '').trim();
    case 3:
      return name.replace(/\./g, ''); // Remove periods
    default:
      return name.split(' ').slice(0, 2).join(' '); // First two words
  }
}

// Products/Services for invoice items
export const PRODUCTS = [
  { name: 'Software License - Enterprise', basePrice: 5000, category: 'software' },
  { name: 'Cloud Hosting - Monthly', basePrice: 299, category: 'hosting' },
  { name: 'IT Consulting Services', basePrice: 150, category: 'services' },
  { name: 'Hardware Maintenance Contract', basePrice: 1200, category: 'maintenance' },
  { name: 'Data Analytics Platform', basePrice: 2500, category: 'software' },
  { name: 'Cybersecurity Audit', basePrice: 3500, category: 'services' },
  { name: 'API Integration Services', basePrice: 800, category: 'services' },
  { name: 'Office Supplies - Bulk Order', basePrice: 450, category: 'supplies' },
  { name: 'Training Workshop (per person)', basePrice: 350, category: 'training' },
  { name: 'Technical Support - Annual', basePrice: 1800, category: 'support' },
  { name: 'Server Equipment', basePrice: 4500, category: 'hardware' },
  { name: 'Network Infrastructure Setup', basePrice: 2800, category: 'services' },
  { name: 'Database Migration Services', basePrice: 1500, category: 'services' },
  { name: 'SSL Certificate - Wildcard', basePrice: 299, category: 'security' },
  { name: 'Domain Registration (per year)', basePrice: 25, category: 'hosting' },
];

// Generate a random product with faker-enhanced variety
export function generateProduct() {
  // 70% chance to use predefined products, 30% chance to generate new one
  if (Math.random() < 0.7) {
    return faker.helpers.arrayElement(PRODUCTS);
  }

  const categories = ['software', 'services', 'hardware', 'supplies', 'support'];
  const category = faker.helpers.arrayElement(categories);

  const productNames: Record<string, () => string> = {
    software: () => `${faker.hacker.adjective()} ${faker.hacker.noun()} License`,
    services: () => `${faker.company.buzzAdjective()} ${faker.company.buzzNoun()} Services`,
    hardware: () => `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
    supplies: () => `${faker.commerce.productAdjective()} Office ${faker.commerce.product()}`,
    support: () => `${faker.company.buzzAdjective()} Support Package`,
  };

  return {
    name: productNames[category](),
    basePrice: faker.number.int({ min: 50, max: 5000 }),
    category,
  };
}

export function getRandomProducts(count: number = 3) {
  const products = [];
  for (let i = 0; i < count; i++) {
    products.push(generateProduct());
  }
  return products;
}

// Generic transaction descriptions for partial matches
export const GENERIC_DESCRIPTIONS = [
  'Payment',
  'Invoice Payment',
  'Supplier Payment',
  'Wire Transfer',
  'Bank Transfer',
  'Settlement',
  'Account Settlement',
  'Payment Order',
  'SEPA Transfer',
  'International Payment',
];

export function getRandomGenericDescription(): string {
  return faker.helpers.arrayElement(GENERIC_DESCRIPTIONS);
}
