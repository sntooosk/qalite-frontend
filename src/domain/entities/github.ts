export interface GithubIntegration {
  username: string | null;
  accessToken: string;
  connectedAt: string | null;
  scopes: string[];
}
