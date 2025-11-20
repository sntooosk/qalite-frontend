import {
  type AuthRepository,
  type EnvironmentRepository,
  type LogRepository,
  type OrganizationRepository,
  type ScenarioExecutionRepository,
  type SlackRepository,
  type StoreRepository,
  type UserRepository,
} from '../../domain/repositories';
import {
  addEnvironmentUser,
  copyEnvironmentAsMarkdown,
  createEnvironment,
  createEnvironmentBug,
  deleteEnvironment,
  deleteEnvironmentBug,
  observeEnvironment,
  observeEnvironmentBugs,
  observeEnvironments,
  removeEnvironmentUser,
  transitionEnvironmentStatus,
  updateEnvironment,
  updateEnvironmentBug,
  updateScenarioStatus,
  uploadScenarioEvidence,
  exportEnvironmentAsPDF,
} from '../external/environments';
import {
  addUserToOrganization,
  createOrganization,
  deleteOrganization,
  getOrganization,
  getUserOrganization,
  listOrganizations,
  removeUserFromOrganization,
  updateOrganization,
} from '../external/organizations';
import {
  createScenarioExecution,
  getStoreScenarioAverages,
  listScenarioExecutionsByStore,
  logScenarioExecution,
} from '../external/scenarioExecutions';
import {
  createStore,
  createCategory,
  createScenario,
  createSuite,
  deleteCategory,
  deleteScenario,
  deleteStore,
  deleteSuite,
  exportStoreData,
  exportStoreSuites,
  getStore,
  importStoreScenarios,
  importStoreSuites,
  listCategories,
  listScenarios,
  listStores,
  listSuites,
  mergeScenarios,
  mergeSuites,
  replaceScenarios,
  replaceSuites,
  updateCategory,
  updateScenario,
  updateStore,
  updateSuite,
} from '../external/stores';
import {
  getCurrentUser,
  hasRequiredRole,
  loginUser,
  logoutUser,
  onAuthStateChanged,
  registerUser,
  sendPasswordReset,
  updateUserProfile,
} from '../external/auth';
import { getUserSummariesByIds } from '../external/users';
import { sendEnvironmentSummaryToSlack } from '../external/slack';
import { listOrganizationLogs, logActivity } from '../external/logs';

export const firebaseAuthRepository: AuthRepository = {
  register: registerUser,
  login: loginUser,
  logout: logoutUser,
  sendPasswordReset,
  getCurrent: getCurrentUser,
  onAuthStateChanged,
  hasRequiredRole,
  updateProfile: updateUserProfile,
};

export const firebaseEnvironmentRepository: EnvironmentRepository = {
  create: createEnvironment,
  update: updateEnvironment,
  delete: deleteEnvironment,
  observeEnvironment,
  observeAll: observeEnvironments,
  addUser: addEnvironmentUser,
  removeUser: removeEnvironmentUser,
  updateScenarioStatus,
  uploadScenarioEvidence,
  observeBugs: observeEnvironmentBugs,
  createBug: createEnvironmentBug,
  updateBug: updateEnvironmentBug,
  deleteBug: deleteEnvironmentBug,
  transitionStatus: transitionEnvironmentStatus,
  exportAsPDF: exportEnvironmentAsPDF,
  copyAsMarkdown: copyEnvironmentAsMarkdown,
};

export const firebaseOrganizationRepository: OrganizationRepository = {
  list: listOrganizations,
  getById: getOrganization,
  create: createOrganization,
  update: updateOrganization,
  delete: deleteOrganization,
  addUser: addUserToOrganization,
  removeUser: removeUserFromOrganization,
  getUserOrganizationByUserId: getUserOrganization,
};

export const firebaseStoreRepository: StoreRepository = {
  listByOrganization: listStores,
  getById: getStore,
  create: createStore,
  update: updateStore,
  delete: deleteStore,
  listScenarios,
  createScenario,
  updateScenario,
  deleteScenario,
  listSuites,
  createSuite,
  updateSuite,
  deleteSuite,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  exportStore: exportStoreData,
  exportSuites: exportStoreSuites,
  importScenarios: importStoreScenarios,
  importSuites: importStoreSuites,
  replaceScenarios,
  replaceSuites,
  mergeScenarios,
  mergeSuites,
};

export const firebaseUserRepository: UserRepository = {
  getSummariesByIds: getUserSummariesByIds,
};

export const firebaseScenarioExecutionRepository: ScenarioExecutionRepository = {
  logExecution: logScenarioExecution,
  getStoreScenarioAverages,
  listByStore: listScenarioExecutionsByStore,
  create: createScenarioExecution,
};

export const slackIntegrationRepository: SlackRepository = {
  sendTaskSummary: sendEnvironmentSummaryToSlack,
};

export const firebaseLogRepository: LogRepository = {
  record: logActivity,
  listByOrganization: listOrganizationLogs,
};
