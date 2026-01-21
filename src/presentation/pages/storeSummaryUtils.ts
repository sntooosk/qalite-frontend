import type {
  StoreScenario,
  StoreScenarioInput,
  StoreSuiteInput,
} from '../../domain/entities/store';

export const emptyScenarioForm: StoreScenarioInput = {
  title: '',
  category: '',
  automation: '',
  criticality: '',
  observation: '',
  bdd: '',
};

export const emptySuiteForm: StoreSuiteInput = {
  name: '',
  description: '',
  scenarioIds: [],
};

export interface ScenarioFilters {
  search: string;
  category: string;
  criticality: string;
}

export const emptyScenarioFilters: ScenarioFilters = {
  search: '',
  category: '',
  criticality: '',
};

export const PAGE_SIZE = 20;

export const translateBddKeywords = (bdd: string, locale: string) => {
  const normalizedLocale = locale.toLowerCase();
  const target = normalizedLocale.startsWith('pt') ? 'pt' : 'en';

  const keywordMap =
    target === 'pt'
      ? {
          given: 'Dado',
          when: 'Quando',
          then: 'Então',
          and: 'E',
          but: 'Mas',
        }
      : {
          dado: 'Given',
          quando: 'When',
          então: 'Then',
          entao: 'Then',
          e: 'And',
          mas: 'But',
        };

  const sourcePattern =
    target === 'pt'
      ? /^(?<indent>\s*)(?<keyword>Given|When|Then|And|But)\b/i
      : /^(?<indent>\s*)(?<keyword>Dado|Quando|Então|Entao|E|Mas)\b/i;

  return bdd
    .split('\n')
    .map((line) => {
      const match = line.match(sourcePattern);
      if (!match || !match.groups?.keyword) {
        return line;
      }
      const keyword = match.groups.keyword.toLowerCase();
      const translated = keywordMap[keyword as keyof typeof keywordMap];
      if (!translated) {
        return line;
      }
      return `${match.groups.indent}${translated}${line.slice(match[0].length)}`;
    })
    .join('\n');
};

export const filterScenarios = (list: StoreScenario[], filters: ScenarioFilters) => {
  const searchValue = filters.search.trim().toLowerCase();
  const filtered = list.filter((scenario) => {
    const matchesSearch = !searchValue || scenario.title.toLowerCase().includes(searchValue);
    const matchesCategory = !filters.category || scenario.category === filters.category;
    const matchesCriticality = !filters.criticality || scenario.criticality === filters.criticality;
    return matchesSearch && matchesCategory && matchesCriticality;
  });

  return filtered;
};
