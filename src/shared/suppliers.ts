import { Company } from './types';

// Realistic German/EU supplier data for test cases
export const SUPPLIERS: Company[] = [
  {
    name: 'TechSolutions GmbH',
    address: 'Hauptstraße 42, 80331 München, Germany',
    phone: '+49 89 1234567',
    email: 'billing@techsolutions.de',
    website: 'www.techsolutions.de',
    bankName: 'Deutsche Bank AG',
    iban: 'DE89370400440532013000',
    vatId: 'DE123456789',
  },
  {
    name: 'Nordic Software AS',
    address: 'Storgatan 15, 111 29 Stockholm, Sweden',
    phone: '+46 8 123 456',
    email: 'invoices@nordicsoftware.se',
    website: 'www.nordicsoftware.se',
    bankName: 'Nordea Bank',
    iban: 'SE3550000000054910000003',
    vatId: 'SE556677889901',
  },
  {
    name: 'CloudServices B.V.',
    address: 'Keizersgracht 123, 1015 CJ Amsterdam, Netherlands',
    phone: '+31 20 123 4567',
    email: 'finance@cloudservices.nl',
    website: 'www.cloudservices.nl',
    bankName: 'ING Bank N.V.',
    iban: 'NL91ABNA0417164300',
    vatId: 'NL123456789B01',
  },
  {
    name: 'DataPro Solutions Ltd',
    address: '100 Liverpool Street, London EC2M 2RH, UK',
    phone: '+44 20 7946 0958',
    email: 'accounts@datapro.co.uk',
    website: 'www.datapro.co.uk',
    bankName: 'Barclays Bank',
    iban: 'GB82WEST12345698765432',
    vatId: 'GB123456789',
  },
  {
    name: 'Logistik Express AG',
    address: 'Bahnhofstraße 88, 8001 Zürich, Switzerland',
    phone: '+41 44 123 45 67',
    email: 'billing@logistik-express.ch',
    website: 'www.logistik-express.ch',
    bankName: 'UBS AG',
    iban: 'CH9300762011623852957',
    vatId: 'CHE-123.456.789',
  },
  {
    name: 'MediSupply SpA',
    address: 'Via Roma 45, 20121 Milano, Italy',
    phone: '+39 02 1234 5678',
    email: 'fatture@medisupply.it',
    website: 'www.medisupply.it',
    bankName: 'UniCredit S.p.A.',
    iban: 'IT60X0542811101000000123456',
    vatId: 'IT12345678901',
  },
  {
    name: 'Bürobedarf Schmidt KG',
    address: 'Friedrichstraße 200, 10117 Berlin, Germany',
    phone: '+49 30 987 6543',
    email: 'rechnung@buerobedarf-schmidt.de',
    website: 'www.buerobedarf-schmidt.de',
    bankName: 'Commerzbank AG',
    iban: 'DE75512108001245126199',
    vatId: 'DE234567890',
  },
  {
    name: 'EuroTech Components S.A.',
    address: 'Rue de la Loi 175, 1048 Bruxelles, Belgium',
    phone: '+32 2 123 45 67',
    email: 'comptabilite@eurotech.be',
    website: 'www.eurotech.be',
    bankName: 'BNP Paribas Fortis',
    iban: 'BE68539007547034',
    vatId: 'BE0123456789',
  },
  {
    name: 'Digital Marketing Pro S.L.',
    address: 'Calle Gran Vía 28, 28013 Madrid, Spain',
    phone: '+34 91 123 4567',
    email: 'facturacion@digitalmarketing.es',
    website: 'www.digitalmarketingpro.es',
    bankName: 'Banco Santander',
    iban: 'ES9121000418450200051332',
    vatId: 'ESB12345678',
  },
  {
    name: 'PrintMaster Oy',
    address: 'Mannerheimintie 12, 00100 Helsinki, Finland',
    phone: '+358 9 123 4567',
    email: 'laskutus@printmaster.fi',
    website: 'www.printmaster.fi',
    bankName: 'Nordea Bank Finland',
    iban: 'FI2112345600000785',
    vatId: 'FI12345678',
  },
];

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

export function getRandomSupplier(): Company {
  return SUPPLIERS[Math.floor(Math.random() * SUPPLIERS.length)];
}

export function getRandomProducts(count: number = 3) {
  const shuffled = [...PRODUCTS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, PRODUCTS.length));
}

export function getRandomGenericDescription(): string {
  return GENERIC_DESCRIPTIONS[Math.floor(Math.random() * GENERIC_DESCRIPTIONS.length)];
}
