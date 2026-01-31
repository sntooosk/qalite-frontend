import type {
  CreateStorePayload,
  Store,
  StoreCategory,
  StoreCategoryInput,
  StoreCategoryCursor,
  StoreExportPayload,
  StoreScenario,
  StoreScenarioInput,
  StoreScenarioCursor,
  StoreSummary,
  StoreSuite,
  StoreSuiteInput,
  StoreSuiteCursor,
  StoreListCursor,
  UpdateStorePayload,
} from '../entities/store';
import type { PaginatedResult, PaginationParams } from '../pagination';

export interface StoreRepository {
  listSummary: (
    organizationId: string,
    pagination: PaginationParams<StoreListCursor>,
  ) => Promise<PaginatedResult<StoreSummary, StoreListCursor>>;
  getDetail: (id: string) => Promise<Store | null>;
  create: (store: CreateStorePayload) => Promise<Store>;
  update: (id: string, store: UpdateStorePayload) => Promise<Store>;
  delete: (id: string) => Promise<void>;
  listScenarios: (
    storeId: string,
    pagination: PaginationParams<StoreScenarioCursor>,
  ) => Promise<PaginatedResult<StoreScenario, StoreScenarioCursor>>;
  createScenario: (scenario: { storeId: string } & StoreScenarioInput) => Promise<StoreScenario>;
  updateScenario: (
    storeId: string,
    scenarioId: string,
    scenario: StoreScenarioInput,
  ) => Promise<StoreScenario>;
  deleteScenario: (storeId: string, scenarioId: string) => Promise<void>;
  listSuites: (
    storeId: string,
    pagination: PaginationParams<StoreSuiteCursor>,
  ) => Promise<PaginatedResult<StoreSuite, StoreSuiteCursor>>;
  createSuite: (suite: { storeId: string } & StoreSuiteInput) => Promise<StoreSuite>;
  updateSuite: (storeId: string, suiteId: string, suite: StoreSuiteInput) => Promise<StoreSuite>;
  deleteSuite: (storeId: string, suiteId: string) => Promise<void>;
  listCategories: (
    storeId: string,
    pagination: PaginationParams<StoreCategoryCursor>,
  ) => Promise<PaginatedResult<StoreCategory, StoreCategoryCursor>>;
  createCategory: (category: { storeId: string } & StoreCategoryInput) => Promise<StoreCategory>;
  updateCategory: (
    storeId: string,
    categoryId: string,
    category: StoreCategoryInput,
  ) => Promise<StoreCategory>;
  deleteCategory: (storeId: string, categoryId: string) => Promise<void>;
  exportStore: (storeId: string) => Promise<StoreExportPayload>;
}
