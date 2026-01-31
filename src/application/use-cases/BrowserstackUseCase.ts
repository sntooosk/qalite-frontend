import type {
  BrowserstackBuild,
  BrowserstackCredentials,
} from '../../domain/entities/browserstack';
import type { BrowserstackRepository } from '../../domain/repositories/BrowserstackRepository';

export class BrowserstackUseCases {
  constructor(private readonly browserstackRepository: BrowserstackRepository) {}

  listBuilds(credentials: BrowserstackCredentials): Promise<BrowserstackBuild[]> {
    return this.browserstackRepository.listBuilds(credentials);
  }
}
