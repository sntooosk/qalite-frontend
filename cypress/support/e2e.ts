import './commands';

beforeEach(() => {
  // Permite autenticação simulada em ambientes de desenvolvimento durante os testes.
  localStorage.setItem(
    'QA_TEST_USER',
    JSON.stringify({
      uid: 'test-user',
      email: 'tester@example.com',
      displayName: 'Tester',
      role: 'admin',
      organizationId: 'org-test',
      isEmailVerified: true,
    }),
  );
});
