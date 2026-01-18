import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { Organization, OrganizationMember } from '../../domain/entities/organization';
import type { UserSummary } from '../../domain/entities/user';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import { userService } from '../../application/use-cases/UserUseCase';
import { useToast } from '../context/ToastContext';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Layout } from '../components/Layout';
import { PageLoader } from '../components/PageLoader';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { TextInput } from '../components/TextInput';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { OrganizationLogPanel } from '../components/OrganizationLogPanel';
import { UserAvatar } from '../components/UserAvatar';

interface OrganizationFormState {
  name: string;
  slackWebhookUrl: string;
  emailDomain: string;
  browserstackUsername: string;
  browserstackAccessKey: string;
}

const initialOrganizationForm: OrganizationFormState = {
  name: '',
  slackWebhookUrl: '',
  emailDomain: '',
  browserstackUsername: '',
  browserstackAccessKey: '',
};

export const OrganizationManagePage = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { t: translation } = useTranslation();
  const { showToast } = useToast();
  const { setActiveOrganization } = useOrganizationBranding();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(false);
  const [organizationForm, setOrganizationForm] =
    useState<OrganizationFormState>(initialOrganizationForm);
  const [isSlackSectionOpen, setIsSlackSectionOpen] = useState(false);
  const [isBrowserstackSectionOpen, setIsBrowserstackSectionOpen] = useState(false);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<UserSummary[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    message: string;
    description?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      navigate('/admin', { replace: true });
      return;
    }

    const fetchOrganization = async () => {
      try {
        setIsLoadingOrganization(true);
        const data = await organizationService.getById(organizationId);
        if (!data) {
          showToast({
            type: 'error',
            message: translation('AdminStoresPage.toast-error-load-orgs'),
          });
          navigate('/admin', { replace: true });
          return;
        }

        setOrganization(data);
        setOrganizationForm({
          name: data.name,
          slackWebhookUrl: data.slackWebhookUrl ?? '',
          emailDomain: data.emailDomain ?? '',
          browserstackUsername: data.browserstackCredentials?.username ?? '',
          browserstackAccessKey: data.browserstackCredentials?.accessKey ?? '',
        });
        setIsSlackSectionOpen(Boolean(data.slackWebhookUrl?.trim()));
        setIsBrowserstackSectionOpen(
          Boolean(
            data.browserstackCredentials?.username?.trim() ||
              data.browserstackCredentials?.accessKey?.trim(),
          ),
        );
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: translation('AdminStoresPage.toast-error-load-orgs') });
      } finally {
        setIsLoadingOrganization(false);
      }
    };

    void fetchOrganization();
  }, [navigate, organizationId, showToast, translation]);

  useEffect(() => {
    setActiveOrganization(organization);
    return () => setActiveOrganization(null);
  }, [organization, setActiveOrganization]);

  useEffect(() => {
    const searchTerm = newMemberEmail.trim();

    if (!searchTerm) {
      setUserSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const fetchSuggestions = async () => {
        try {
          setIsSearchingUsers(true);
          const results = await userService.searchByTerm(searchTerm);
          const filteredResults = organization
            ? results.filter((user) => !organization.memberIds.includes(user.id))
            : results;
          setUserSuggestions(filteredResults);
        } catch (error) {
          console.error(error);
          setUserSuggestions([]);
        } finally {
          setIsSearchingUsers(false);
        }
      };

      void fetchSuggestions();
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [newMemberEmail, organization]);

  const toggleSlackSection = () => {
    setIsSlackSectionOpen((previous) => {
      if (previous) {
        setOrganizationForm((form) => ({ ...form, slackWebhookUrl: '' }));
      }
      return !previous;
    });
  };

  const toggleBrowserstackSection = () => {
    setIsBrowserstackSectionOpen((previous) => {
      if (previous) {
        setOrganizationForm((form) => ({
          ...form,
          browserstackUsername: '',
          browserstackAccessKey: '',
        }));
      }
      return !previous;
    });
  };

  const handleOrganizationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOrganizationError(null);

    if (!organization) {
      return;
    }

    const trimmedName = organizationForm.name.trim();
    if (!trimmedName) {
      setOrganizationError(translation('AdminStoresPage.form-error-no-org-name'));
      return;
    }

    try {
      setIsSavingOrganization(true);
      const slackWebhookUrl = isSlackSectionOpen ? organizationForm.slackWebhookUrl.trim() : '';
      const emailDomain = organizationForm.emailDomain.trim();
      const browserstackUsername = isBrowserstackSectionOpen
        ? organizationForm.browserstackUsername.trim()
        : '';
      const browserstackAccessKey = isBrowserstackSectionOpen
        ? organizationForm.browserstackAccessKey.trim()
        : '';

      const updated = await organizationService.update(organization.id, {
        name: trimmedName,
        description: (organization.description ?? '').trim(),
        slackWebhookUrl,
        emailDomain,
        browserstackCredentials:
          browserstackUsername || browserstackAccessKey
            ? {
                username: browserstackUsername,
                accessKey: browserstackAccessKey,
              }
            : null,
      });

      setOrganization(updated);
      showToast({
        type: 'success',
        message: translation('AdminStoresPage.toast-success-org-updated'),
      });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : translation('AdminStoresPage.toast-error-save-org');
      setOrganizationError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingOrganization(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!organization) {
      return;
    }

    try {
      setIsSavingOrganization(true);
      await organizationService.delete(organization.id);
      showToast({
        type: 'success',
        message: translation('AdminStoresPage.toast-success-org-removed'),
      });
      navigate('/admin', { replace: true });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : translation('AdminStoresPage.toast-error-remove-org');
      showToast({ type: 'error', message });
    } finally {
      setIsSavingOrganization(false);
    }
  };

  const handleAddMember = async () => {
    if (!organization) {
      setOrganizationError(translation('AdminStoresPage.member-add-no-organization'));
      return;
    }

    const trimmedEmail = newMemberEmail.trim();
    if (!trimmedEmail) {
      setOrganizationError(translation('AdminStoresPage.member-add-email-required'));
      return;
    }

    const normalizedEmail = trimmedEmail.toLowerCase();
    if (organization.members.some((member) => member.email.toLowerCase() === normalizedEmail)) {
      setOrganizationError(translation('AdminStoresPage.member-add-already-linked'));
      return;
    }

    try {
      setIsManagingMembers(true);
      const member = await organizationService.addUser({
        organizationId: organization.id,
        userEmail: trimmedEmail,
      });

      setOrganization((previous) =>
        previous
          ? {
              ...previous,
              members: [...previous.members, member],
              memberIds: [...previous.memberIds, member.uid],
            }
          : previous,
      );

      setNewMemberEmail('');
      setUserSuggestions([]);
      setOrganizationError(null);
      showToast({
        type: 'success',
        message: translation('AdminStoresPage.toast-success-member-added'),
      });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : translation('AdminStoresPage.toast-error-add-member');
      setOrganizationError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsManagingMembers(false);
    }
  };

  const handleRemoveMember = async (member: OrganizationMember) => {
    if (!organization) {
      return;
    }

    try {
      setIsManagingMembers(true);
      await organizationService.removeUser({
        organizationId: organization.id,
        userId: member.uid,
      });

      setOrganization((previous) =>
        previous
          ? {
              ...previous,
              members: previous.members.filter((item) => item.uid !== member.uid),
              memberIds: previous.memberIds.filter((item) => item !== member.uid),
            }
          : previous,
      );

      showToast({
        type: 'success',
        message: translation('AdminStoresPage.toast-success-member-removed'),
      });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : translation('AdminStoresPage.toast-error-remove-member');
      showToast({ type: 'error', message });
    } finally {
      setIsManagingMembers(false);
    }
  };

  const openDeleteOrganizationModal = () => {
    if (!organization) {
      return;
    }

    setDeleteConfirmation({
      message: translation('AdminStoresPage.confirm-delete-org-message', {
        organizationName: organization.name,
      }),
      description: translation('AdminStoresPage.confirm-delete-org-description'),
      onConfirm: handleDeleteOrganization,
    });
  };

  const openRemoveMemberModal = (member: OrganizationMember) => {
    if (!organization) {
      return;
    }

    setDeleteConfirmation({
      message: translation('AdminStoresPage.confirm-remove-member-message', {
        memberName: member.displayName || member.email,
      }),
      description: translation('AdminStoresPage.confirm-remove-member-description', {
        organizationName: organization.name,
      }),
      onConfirm: () => handleRemoveMember(member),
    });
  };

  const closeDeleteConfirmation = () => {
    if (isConfirmingDelete) {
      return;
    }

    setDeleteConfirmation(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) {
      return;
    }

    try {
      setIsConfirmingDelete(true);
      await deleteConfirmation.onConfirm();
    } finally {
      setIsConfirmingDelete(false);
      setDeleteConfirmation(null);
    }
  };

  if (isLoadingOrganization) {
    return (
      <Layout>
        <section className="page-container">
          <PageLoader message={translation('AdminStoresPage.loading-stores')} />
        </section>
      </Layout>
    );
  }

  if (!organization) {
    return (
      <Layout>
        <section className="page-container">
          <BackButton label={translation('back')} onClick={() => navigate('/admin')} />
          <p className="section-subtitle">
            {translation('AdminStoresPage.stores-title-no-org-selected')}
          </p>
        </section>
      </Layout>
    );
  }

  return (
    <>
      <Layout>
        <section className="page-container">
          <div className="page-header">
            <div>
              <BackButton
                label={translation('back')}
                onClick={() =>
                  navigate(`/admin/organizations?organizationId=${organization.id}`)
                }
              />
              <h1 className="section-title">
                {translation('AdminStoresPage.modal-org-title', {
                  organizationName: organization.name,
                })}
              </h1>
            </div>
            <div className="page-actions">
              <span className="badge">
                {translation('AdminStoresPage.member-count', {
                  count: organization.members.length,
                })}
              </span>
              {organization.emailDomain && (
                <span className="badge badge--muted">{organization.emailDomain}</span>
              )}
            </div>
          </div>

          <div className="page-section">
            <div className="card">
              {organizationError && (
                <p className="form-message form-message--error">{organizationError}</p>
              )}

              <form className="form-grid" onSubmit={handleOrganizationSubmit}>
                <TextInput
                  id="organization-name"
                  label={translation('AdminStoresPage.org-name-label')}
                  value={organizationForm.name}
                  onChange={(event) =>
                    setOrganizationForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder={translation('AdminStoresPage.org-name-placeholder')}
                  required
                />
                <TextInput
                  id="organization-email-domain"
                  label={translation('AdminStoresPage.org-email-domain-label')}
                  value={organizationForm.emailDomain}
                  onChange={(event) =>
                    setOrganizationForm((previous) => ({
                      ...previous,
                      emailDomain: event.target.value,
                    }))
                  }
                  placeholder={translation('AdminStoresPage.org-email-domain-placeholder')}
                />
                <p className="form-hint">{translation('AdminStoresPage.org-email-domain-hint')}</p>

                <div className="collapsible-section">
                  <div className="collapsible-section__header">
                    <div className="collapsible-section__titles">
                      <img
                        className="collapsible-section__icon"
                        src="https://img.icons8.com/color/48/browser-stack.png"
                        alt={translation('AdminStoresPage.org-browserstack-icon-alt')}
                        width={48}
                        height={48}
                      />
                      <p className="collapsible-section__title">
                        {translation('AdminStoresPage.org-browserstack-section-title')}
                      </p>
                      <p className="collapsible-section__description">
                        {translation('AdminStoresPage.org-browserstack-section-description')}
                      </p>
                    </div>
                    <label className="collapsible-section__toggle">
                      <input
                        type="checkbox"
                        checked={isBrowserstackSectionOpen}
                        onChange={toggleBrowserstackSection}
                        aria-expanded={isBrowserstackSectionOpen}
                        aria-controls="organization-settings-browserstack-section"
                      />
                      <span>
                        {isBrowserstackSectionOpen
                          ? translation('AdminStoresPage.org-browserstack-toggle-on')
                          : translation('AdminStoresPage.org-browserstack-toggle-off')}
                      </span>
                    </label>
                  </div>
                  {isBrowserstackSectionOpen && (
                    <div
                      className="collapsible-section__body"
                      id="organization-settings-browserstack-section"
                    >
                      <div className="form-grid">
                        <TextInput
                          id="organization-browserstack-username"
                          label={translation('AdminStoresPage.org-browserstack-username-label')}
                          value={organizationForm.browserstackUsername}
                          onChange={(event) =>
                            setOrganizationForm((previous) => ({
                              ...previous,
                              browserstackUsername: event.target.value,
                            }))
                          }
                          placeholder={translation(
                            'AdminStoresPage.org-browserstack-username-placeholder',
                          )}
                        />
                        <TextInput
                          id="organization-browserstack-access-key"
                          label={translation('AdminStoresPage.org-browserstack-access-key-label')}
                          value={organizationForm.browserstackAccessKey}
                          onChange={(event) =>
                            setOrganizationForm((previous) => ({
                              ...previous,
                              browserstackAccessKey: event.target.value,
                            }))
                          }
                          placeholder={translation(
                            'AdminStoresPage.org-browserstack-access-key-placeholder',
                          )}
                          type="password"
                        />
                      </div>
                      <p className="form-hint">{translation('AdminStoresPage.org-browserstack-hint')}</p>
                    </div>
                  )}
                </div>

                <div className="collapsible-section">
                  <div className="collapsible-section__header">
                    <div className="collapsible-section__titles">
                      <img
                        className="collapsible-section__icon"
                        src="https://img.icons8.com/external-tal-revivo-color-tal-revivo/24/external-slack-replace-email-text-messaging-and-instant-messaging-for-your-team-logo-color-tal-revivo.png"
                        alt={translation('AdminStoresPage.org-slack-icon-alt')}
                        width={24}
                        height={24}
                      />
                      <p className="collapsible-section__title">
                        {translation('AdminStoresPage.org-slack-section-title')}
                      </p>
                      <p className="collapsible-section__description">
                        {translation('AdminStoresPage.org-slack-section-description')}
                      </p>
                    </div>
                    <label className="collapsible-section__toggle">
                      <input
                        type="checkbox"
                        checked={isSlackSectionOpen}
                        onChange={toggleSlackSection}
                        aria-expanded={isSlackSectionOpen}
                        aria-controls="organization-settings-slack-section"
                      />
                      <span>
                        {isSlackSectionOpen
                          ? translation('AdminStoresPage.org-slack-toggle-on')
                          : translation('AdminStoresPage.org-slack-toggle-off')}
                      </span>
                    </label>
                  </div>
                  {isSlackSectionOpen && (
                    <div
                      className="collapsible-section__body"
                      id="organization-settings-slack-section"
                    >
                      <TextInput
                        id="organization-slack-webhook"
                        label={translation('AdminStoresPage.org-slack-webhook-label')}
                        value={organizationForm.slackWebhookUrl}
                        onChange={(event) =>
                          setOrganizationForm((previous) => ({
                            ...previous,
                            slackWebhookUrl: event.target.value,
                          }))
                        }
                        placeholder={translation('AdminStoresPage.org-slack-webhook-placeholder')}
                      />
                      <p className="form-hint">{translation('AdminStoresPage.org-slack-hint')}</p>
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <Button
                    type="submit"
                    isLoading={isSavingOrganization}
                    loadingText={translation('saving')}
                  >
                    {translation('saveChanges')}
                  </Button>
                </div>
              </form>

              <div className="modal-danger-zone">
                <div>
                  <h4>{translation('AdminStoresPage.org-danger-zone')}</h4>
                  <p>{translation('AdminStoresPage.org-remove-org-and-users')}</p>
                </div>
                <button
                  type="button"
                  className="link-danger"
                  onClick={openDeleteOrganizationModal}
                  disabled={isSavingOrganization}
                >
                  {translation('AdminStoresPage.org-remove-organization')}
                </button>
              </div>
            </div>
          </div>

          <div className="page-section">
            <div className="card bg-surface" style={{ padding: '1.5rem' }}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-primary">
                    {translation('AdminStoresPage.org-vinculed-members')}
                  </h3>
                  <p className="section-subtitle">
                    {translation('AdminStoresPage.org-slack-added-user')}
                  </p>
                </div>
                <span className="badge">
                  {translation('AdminStoresPage.member-count', {
                    count: organization.members.length,
                  })}
                </span>
              </div>

              <div className="member-invite-grid">
                <TextInput
                  id="organization-add-member"
                  label={translation('AdminStoresPage.org-added-user-to-email')}
                  value={newMemberEmail}
                  onChange={(event) => setNewMemberEmail(event.target.value)}
                  placeholder={translation('AdminStoresPage.org-email-placeholder')}
                  autoComplete="email"
                />
                <Button
                  type="button"
                  onClick={handleAddMember}
                  isLoading={isManagingMembers}
                  loadingText={translation('AdminStoresPage.org-button-addeding')}
                >
                  {translation('AdminStoresPage.org-added-user')}
                </Button>
              </div>
              <p className="form-hint">{translation('AdminStoresPage.member-add-hint')}</p>

              {isSearchingUsers && (
                <p className="form-hint">{translation('AdminStoresPage.user-search-loading')}</p>
              )}
              {!isSearchingUsers && userSuggestions.length > 0 && (
                <ul
                  className="suggestion-list"
                  role="listbox"
                  aria-label={translation('AdminStoresPage.user-search-suggestions')}
                >
                  {userSuggestions.map((suggestion) => (
                    <li key={suggestion.id}>
                      <button
                        type="button"
                        className="suggestion-option"
                        onClick={() => setNewMemberEmail(suggestion.email)}
                      >
                        <UserAvatar name={suggestion.displayName || suggestion.email} size="sm" />
                        <div className="suggestion-option__details">
                          <span className="suggestion-option__name">
                            {suggestion.displayName || suggestion.email}
                          </span>
                          <span className="suggestion-option__email">{suggestion.email}</span>
                        </div>
                        <span className="suggestion-option__hint">
                          {translation('AdminStoresPage.user-search-email-hint')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {organization.members.length === 0 ? (
                <p className="section-subtitle">{translation('AdminStoresPage.no-members-message')}</p>
              ) : (
                <ul className="member-list">
                  {organization.members.map((member) => (
                    <li key={member.uid} className="member-list-item">
                      <UserAvatar name={member.displayName || member.email} />
                      <div className="member-list-details">
                        <span className="member-list-name">{member.displayName || member.email}</span>
                        <span className="member-list-email">{member.email}</span>
                      </div>
                      <button
                        type="button"
                        className="member-list-remove"
                        onClick={() => openRemoveMemberModal(member)}
                        disabled={isManagingMembers}
                      >
                        {translation('AdminStoresPage.org-remove-user')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="page-section">
            <OrganizationLogPanel organizationId={organization.id} defaultCollapsed={false} />
          </div>
        </section>
      </Layout>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteConfirmation)}
        message={deleteConfirmation?.message}
        description={deleteConfirmation?.description}
        onClose={closeDeleteConfirmation}
        onConfirm={handleConfirmDelete}
        isConfirming={isConfirmingDelete}
      />
    </>
  );
};
