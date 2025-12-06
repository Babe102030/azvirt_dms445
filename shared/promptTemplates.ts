/**
 * AI Prompt Templates
 * Pre-built prompts for common DMS tasks to help users get started
 */

export interface PromptTemplate {
  id: string;
  category: TemplateCategory;
  title: string;
  description: string;
  prompt: string;
  icon: string;
  tags: string[];
  usageCount?: number;
}

export type TemplateCategory = 
  | 'inventory'
  | 'deliveries'
  | 'quality'
  | 'reports'
  | 'analysis'
  | 'forecasting';

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { label: string; icon: string; description: string }> = {
  inventory: {
    label: 'Upravljanje zalihama',
    icon: 'Package',
    description: 'Provjera zaliha, narudžbe i materijala',
  },
  deliveries: {
    label: 'Isporuke',
    icon: 'Truck',
    description: 'Praćenje i analiza isporuka',
  },
  quality: {
    label: 'Kontrola kvaliteta',
    icon: 'FlaskConical',
    description: 'Testovi kvaliteta i usklađenost',
  },
  reports: {
    label: 'Izvještaji',
    icon: 'FileText',
    description: 'Generisanje izvještaja i sažetaka',
  },
  analysis: {
    label: 'Analiza',
    icon: 'TrendingUp',
    description: 'Analiza podataka i trendova',
  },
  forecasting: {
    label: 'Prognoze',
    icon: 'LineChart',
    description: 'Predviđanje i planiranje',
  },
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Inventory Management Templates
  {
    id: 'check-low-stock',
    category: 'inventory',
    title: 'Provjeri materijale sa niskim zalihama',
    description: 'Prikaži sve materijale koji su ispod minimalnog nivoa zaliha',
    prompt: 'Koji materijali trenutno imaju niske zalihe? Prikaži mi listu sa trenutnim količinama i minimalnim nivoima.',
    icon: 'AlertTriangle',
    tags: ['zalihe', 'upozorenje', 'materijali'],
  },
  {
    id: 'search-material',
    category: 'inventory',
    title: 'Pretraži specifičan materijal',
    description: 'Pronađi informacije o određenom materijalu',
    prompt: 'Prikaži mi sve informacije o [naziv materijala] - trenutnu količinu, dobavljača, cijenu i historiju potrošnje.',
    icon: 'Search',
    tags: ['pretraga', 'materijal', 'detalji'],
  },
  {
    id: 'inventory-summary',
    category: 'inventory',
    title: 'Sažetak zaliha',
    description: 'Pregled ukupnog stanja zaliha',
    prompt: 'Daj mi sažetak trenutnog stanja zaliha - ukupan broj materijala, kritični nivoi, i ukupna vrijednost.',
    icon: 'ClipboardList',
    tags: ['sažetak', 'pregled', 'zalihe'],
  },
  {
    id: 'order-recommendations',
    category: 'inventory',
    title: 'Preporuke za narudžbe',
    description: 'Dobij preporuke šta treba naručiti',
    prompt: 'Na osnovu trenutnih zaliha i historije potrošnje, koje materijale trebam naručiti i u kojim količinama?',
    icon: 'ShoppingCart',
    tags: ['narudžba', 'preporuke', 'planiranje'],
  },

  // Delivery Management Templates
  {
    id: 'active-deliveries',
    category: 'deliveries',
    title: 'Aktivne isporuke',
    description: 'Prikaži sve trenutno aktivne isporuke',
    prompt: 'Prikaži mi sve aktivne isporuke danas - status, destinaciju, i očekivano vrijeme dolaska.',
    icon: 'Truck',
    tags: ['isporuke', 'aktivno', 'praćenje'],
  },
  {
    id: 'delivery-history',
    category: 'deliveries',
    title: 'Historija isporuka za projekat',
    description: 'Pregled svih isporuka za određeni projekat',
    prompt: 'Prikaži mi sve isporuke za projekat [naziv projekta] - datume, količine, i status.',
    icon: 'History',
    tags: ['historija', 'projekat', 'isporuke'],
  },
  {
    id: 'delivery-performance',
    category: 'deliveries',
    title: 'Performanse isporuka',
    description: 'Analiza efikasnosti isporuka',
    prompt: 'Analiziraj performanse isporuka za posljednjih 30 dana - procenat isporuka na vrijeme, kašnjenja, i prosječno vrijeme.',
    icon: 'BarChart',
    tags: ['performanse', 'analiza', 'metrike'],
  },
  {
    id: 'delayed-deliveries',
    category: 'deliveries',
    title: 'Zakašnjele isporuke',
    description: 'Identifikuj isporuke sa kašnjenjem',
    prompt: 'Koje isporuke kasne ili su imale kašnjenja u posljednje vrijeme? Prikaži razloge i trajanje kašnjenja.',
    icon: 'Clock',
    tags: ['kašnjenje', 'problemi', 'praćenje'],
  },

  // Quality Control Templates
  {
    id: 'recent-tests',
    category: 'quality',
    title: 'Nedavni testovi kvaliteta',
    description: 'Pregled posljednjih testova',
    prompt: 'Prikaži mi rezultate testova kvaliteta iz posljednje sedmice - tip testa, rezultati, i status prolaska.',
    icon: 'FlaskConical',
    tags: ['testovi', 'kvalitet', 'rezultati'],
  },
  {
    id: 'failed-tests',
    category: 'quality',
    title: 'Neuspjeli testovi',
    description: 'Identifikuj testove koji nisu prošli',
    prompt: 'Koji testovi kvaliteta nisu prošli u posljednjih 30 dana? Prikaži detalje i razloge neuspjeha.',
    icon: 'XCircle',
    tags: ['neuspjeh', 'problemi', 'kvalitet'],
  },
  {
    id: 'quality-trends',
    category: 'quality',
    title: 'Trendovi kvaliteta',
    description: 'Analiza trendova u kvalitetu betona',
    prompt: 'Analiziraj trendove u kvalitetu betona tokom posljednjih 3 mjeseca - čvrstoća, slump test, i stopa prolaska.',
    icon: 'TrendingUp',
    tags: ['trendovi', 'analiza', 'kvalitet'],
  },
  {
    id: 'compliance-check',
    category: 'quality',
    title: 'Provjera usklađenosti',
    description: 'Provjeri usklađenost sa standardima',
    prompt: 'Da li su svi testovi kvaliteta u skladu sa standardima EN 206 i ASTM C94? Prikaži eventualna odstupanja.',
    icon: 'CheckCircle',
    tags: ['usklađenost', 'standardi', 'provjera'],
  },

  // Reporting Templates
  {
    id: 'weekly-summary',
    category: 'reports',
    title: 'Sedmični izvještaj',
    description: 'Generiši sažetak sedmice',
    prompt: 'Napravi sažetak aktivnosti za ovu sedmicu - broj isporuka, potrošnja materijala, testovi kvaliteta, i ključni događaji.',
    icon: 'Calendar',
    tags: ['izvještaj', 'sedmično', 'sažetak'],
  },
  {
    id: 'monthly-report',
    category: 'reports',
    title: 'Mjesečni izvještaj',
    description: 'Detaljan mjesečni pregled',
    prompt: 'Generiši detaljan mjesečni izvještaj - ukupne isporuke, potrošnja po materijalu, kvalitet, i finansijski pregled.',
    icon: 'FileText',
    tags: ['izvještaj', 'mjesečno', 'detalji'],
  },
  {
    id: 'project-summary',
    category: 'reports',
    title: 'Sažetak projekta',
    description: 'Pregled specifičnog projekta',
    prompt: 'Napravi sažetak za projekat [naziv projekta] - isporuke, potrošnja materijala, troškovi, i status.',
    icon: 'Folder',
    tags: ['projekat', 'sažetak', 'pregled'],
  },

  // Analysis Templates
  {
    id: 'cost-analysis',
    category: 'analysis',
    title: 'Analiza troškova',
    description: 'Analiziraj troškove materijala i isporuka',
    prompt: 'Analiziraj troškove za posljednjih 30 dana - najskuplji materijali, troškovi isporuka, i mogućnosti uštede.',
    icon: 'DollarSign',
    tags: ['troškovi', 'analiza', 'finansije'],
  },
  {
    id: 'consumption-patterns',
    category: 'analysis',
    title: 'Obrasci potrošnje',
    description: 'Identifikuj obrasce u potrošnji materijala',
    prompt: 'Analiziraj obrasce potrošnje materijala - koji se materijali najčešće koriste, sezonske varijacije, i trendovi.',
    icon: 'PieChart',
    tags: ['potrošnja', 'obrasci', 'trendovi'],
  },
  {
    id: 'efficiency-metrics',
    category: 'analysis',
    title: 'Metrike efikasnosti',
    description: 'Izračunaj ključne metrike performansi',
    prompt: 'Izračunaj ključne metrike efikasnosti - iskorištenost zaliha, vrijeme isporuke, stopa kvaliteta, i produktivnost.',
    icon: 'Activity',
    tags: ['metrike', 'efikasnost', 'KPI'],
  },

  // Forecasting Templates
  {
    id: 'demand-forecast',
    category: 'forecasting',
    title: 'Prognoza potražnje',
    description: 'Predvidi buduću potražnju za materijalom',
    prompt: 'Na osnovu historijskih podataka, predvidi potražnju za [naziv materijala] u narednih 30 dana.',
    icon: 'LineChart',
    tags: ['prognoza', 'potražnja', 'planiranje'],
  },
  {
    id: 'stockout-prediction',
    category: 'forecasting',
    title: 'Predviđanje nestašice',
    description: 'Kada će materijali biti nestašici',
    prompt: 'Koji materijali će biti u nestašici u narednih 14 dana ako se nastavi trenutni tempo potrošnje?',
    icon: 'AlertCircle',
    tags: ['nestašica', 'upozorenje', 'prognoza'],
  },
  {
    id: 'seasonal-planning',
    category: 'forecasting',
    title: 'Sezonsko planiranje',
    description: 'Planiranje za sezonske varijacije',
    prompt: 'Analiziraj sezonske varijacije u potrošnji i daj preporuke za planiranje zaliha za narednu sezonu.',
    icon: 'Sun',
    tags: ['sezonsko', 'planiranje', 'prognoza'],
  },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): PromptTemplate[] {
  return PROMPT_TEMPLATES.filter(t => t.category === category);
}

/**
 * Search templates by query
 */
export function searchTemplates(query: string): PromptTemplate[] {
  const lowerQuery = query.toLowerCase();
  return PROMPT_TEMPLATES.filter(t => 
    t.title.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    t.prompt.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find(t => t.id === id);
}
