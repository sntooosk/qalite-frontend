import type {
  ActivityLog,
  ActivityLogInput,
  AddUserToOrganizationPayload,
  AuthUser,
  CreateEnvironmentBugInput,
  CreateEnvironmentInput,
  CreateOrganizationPayload,
  CreateScenarioExecutionInput,
  CreateStorePayload,
  Environment,
  EnvironmentBug,
  EnvironmentRealtimeFilters,
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
  ImportScenariosResult,
  ImportSuitesResult,
  Organization,
  OrganizationMember,
  RemoveUserFromOrganizationPayload,
  Role,
  ScenarioAverageMap,
  ScenarioExecution,
  SlackTaskSummaryPayload,
  Store,
  StoreCategory,
  StoreCategoryInput,
  StoreExportPayload,
  StoreScenario,
  StoreScenarioInput,
  StoreSuite,
  StoreSuiteExportPayload,
  StoreSuiteInput,
  TransitionEnvironmentStatusParams,
  UpdateEnvironmentBugInput,
  UpdateEnvironmentInput,
  UpdateOrganizationPayload,
  UpdateStorePayload,
  UserSummary,
} from '../entities/types';

export interface AuthRepository {
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    role?: Role;
  }) => Promise<AuthUser>;
  login: (input: { email: string; password: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  getCurrent: () => Promise<AuthUser | null>;
  onAuthStateChanged: (listener: (user: AuthUser | null) => void) => () => void;
  hasRequiredRole: (user: AuthUser | null, allowedRoles: Role[]) => boolean;
  updateProfile: (payload: {
    firstName: string;
    lastName: string;
    photoFile?: File | null;
  }) => Promise<AuthUser>;
}

export interface EnvironmentRepository {
  create: (input: CreateEnvironmentInput) => Promise<Environment>;
  update: (id: string, input: UpdateEnvironmentInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
  observeEnvironment: (
    id: string,
    onChange: (environment: Environment | null) => void,
  ) => () => void;
  observeAll: (
    filters: EnvironmentRealtimeFilters,
    onChange: (environments: Environment[]) => void,
  ) => () => void;
  addUser: (id: string, userId: string) => Promise<void>;
  removeUser: (id: string, userId: string) => Promise<void>;
  updateScenarioStatus: (
    environmentId: string,
    scenarioId: string,
    status: EnvironmentScenarioStatus,
    platform?: EnvironmentScenarioPlatform,
  ) => Promise<void>;
  uploadScenarioEvidence: (
    environmentId: string,
    scenarioId: string,
    evidence: File,
    platform?: EnvironmentScenarioPlatform,
  ) => Promise<string>;
  observeBugs: (environmentId: string, onChange: (bugs: EnvironmentBug[]) => void) => () => void;
  createBug: (environmentId: string, bug: CreateEnvironmentBugInput) => Promise<EnvironmentBug>;
  updateBug: (
    environmentId: string,
    bugId: string,
    input: UpdateEnvironmentBugInput,
  ) => Promise<void>;
  deleteBug: (environmentId: string, bugId: string) => Promise<void>;
  transitionStatus: (params: TransitionEnvironmentStatusParams) => Promise<void>;
  exportAsPDF: (
    environment: Environment,
    bugs?: EnvironmentBug[],
    participantProfiles?: UserSummary[],
  ) => void;
  copyAsMarkdown: (
    environment: Environment,
    bugs?: EnvironmentBug[],
    participantProfiles?: UserSummary[],
  ) => Promise<void>;
}

export interface OrganizationRepository {
  list: () => Promise<Organization[]>;
  getById: (id: string) => Promise<Organization | null>;
  create: (organization: CreateOrganizationPayload) => Promise<Organization>;
  update: (id: string, organization: UpdateOrganizationPayload) => Promise<Organization>;
  delete: (id: string) => Promise<void>;
  addUser: (payload: AddUserToOrganizationPayload) => Promise<OrganizationMember>;
  removeUser: (payload: RemoveUserFromOrganizationPayload) => Promise<void>;
  getUserOrganizationByUserId: (userId: string) => Promise<Organization | null>;
}

export interface StoreRepository {
  listByOrganization: (organizationId: string) => Promise<Store[]>;
  getById: (id: string) => Promise<Store | null>;
  create: (store: CreateStorePayload) => Promise<Store>;
  update: (id: string, store: UpdateStorePayload) => Promise<Store>;
  delete: (id: string) => Promise<void>;
  listScenarios: (storeId: string) => Promise<StoreScenario[]>;
  createScenario: (scenario: { storeId: string } & StoreScenarioInput) => Promise<StoreScenario>;
  updateScenario: (
    storeId: string,
    scenarioId: string,
    scenario: StoreScenarioInput,
  ) => Promise<StoreScenario>;
  deleteScenario: (storeId: string, scenarioId: string) => Promise<void>;
  listSuites: (storeId: string) => Promise<StoreSuite[]>;
  createSuite: (suite: { storeId: string } & StoreSuiteInput) => Promise<StoreSuite>;
  updateSuite: (storeId: string, suiteId: string, suite: StoreSuiteInput) => Promise<StoreSuite>;
  deleteSuite: (storeId: string, suiteId: string) => Promise<void>;
  listCategories: (storeId: string) => Promise<StoreCategory[]>;
  createCategory: (category: { storeId: string } & StoreCategoryInput) => Promise<StoreCategory>;
  updateCategory: (
    storeId: string,
    categoryId: string,
    category: StoreCategoryInput,
  ) => Promise<StoreCategory>;
  deleteCategory: (storeId: string, categoryId: string) => Promise<void>;
  exportStore: (storeId: string) => Promise<StoreExportPayload>;
  exportSuites: (storeId: string) => Promise<StoreSuiteExportPayload>;
  importScenarios: (
    storeId: string,
    scenarios: StoreScenarioInput[],
    strategy: 'replace' | 'merge',
  ) => Promise<{
    scenarios: StoreScenario[];
    created: number;
    skipped: number;
    strategy: 'replace' | 'merge';
  }>;
  importSuites: (
    storeId: string,
    suites: StoreSuiteInput[],
    strategy: 'replace' | 'merge',
  ) => Promise<{
    suites: StoreSuite[];
    created: number;
    skipped: number;
    strategy: 'replace' | 'merge';
  }>;
  replaceScenarios: (storeId: string, scenarios: StoreScenarioInput[]) => Promise<StoreScenario[]>;
  replaceSuites: (storeId: string, suites: StoreSuiteInput[]) => Promise<StoreSuite[]>;
  mergeScenarios: (
    storeId: string,
    scenarios: StoreScenarioInput[],
  ) => Promise<ImportScenariosResult>;
  mergeSuites: (storeId: string, suites: StoreSuiteInput[]) => Promise<ImportSuitesResult>;
}

export interface UserRepository {
  getSummariesByIds: (ids: string[]) => Promise<UserSummary[]>;
}

export interface ScenarioExecutionRepository {
  logExecution: (input: CreateScenarioExecutionInput) => Promise<void>;
  getStoreScenarioAverages: (storeId: string) => Promise<ScenarioAverageMap>;
  listByStore: (storeId: string) => Promise<ScenarioExecution[]>;
  create: (input: CreateScenarioExecutionInput) => Promise<void>;
}

export interface SlackRepository {
  sendTaskSummary: (payload: SlackTaskSummaryPayload) => Promise<void>;
}

export interface LogRepository {
  record: (input: ActivityLogInput) => Promise<void>;
  listByOrganization: (organizationId: string) => Promise<ActivityLog[]>;
}
