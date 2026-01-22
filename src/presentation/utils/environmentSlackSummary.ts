import type { TOptions } from 'i18next';

import type { Environment } from '../../domain/entities/environment';
import type { UserSummary } from '../../domain/entities/user';
import type { SlackTaskSummaryPayload } from '../../infrastructure/external/slack';
import {
  SCENARIO_COMPLETED_STATUSES,
  getScenarioPlatformStatuses,
} from '../../infrastructure/external/environments';

export interface SlackSummaryBuilderOptions {
  formattedTime: string;
  totalTimeMs: number;
  scenarioCount: number;
  executedScenariosCount: number;
  progressLabel: string;
  publicLink: string;
  urls: string[];
  bugsCount: number;
  participantProfiles: UserSummary[];
}

const formatExecutedScenariosMessage = (
  count: number,
  translation: (key: string, opts?: TOptions) => string,
) => {
  if (count === 0) {
    return translation('dynamic.executedScenarios.none');
  }

  if (count === 1) {
    return translation('dynamic.executedScenarios.one');
  }

  return translation('dynamic.executedScenarios.many', { count });
};

const buildSuiteDetails = (
  count: number,
  translation: (key: string, opts?: TOptions) => string,
) => {
  if (count === 0) {
    return translation('dynamic.suite.none');
  }

  return translation('dynamic.suite.many', { count });
};

const mapProfileToAttendee = (
  profile: UserSummary | undefined,
  fallbackId: string | null,
  index: number,
  translation: (key: string, opts?: TOptions) => string,
) => {
  const fallbackName = fallbackId
    ? translation('dynamic.fallbackParticipant', { id: fallbackId })
    : translation('dynamic.fallbackParticipant', { id: index + 1 });
  const trimmedName = profile?.displayName?.trim();

  return {
    name: trimmedName || profile?.email || fallbackName,
    email: profile?.email ?? translation('dynamic.noEmail'),
  };
};

const buildAttendeesList = (
  environment: Environment,
  participantProfiles: UserSummary[],
  translation: (key: string, opts?: TOptions) => string,
): SlackTaskSummaryPayload['environmentSummary']['attendees'] => {
  const participantIds = Array.from(new Set(environment.participants ?? []));
  const profileMap = new Map(participantProfiles.map((profile) => [profile.id, profile]));
  const attendees = participantIds.map((participantId, index) =>
    mapProfileToAttendee(profileMap.get(participantId), participantId, index, translation),
  );

  const knownParticipants = new Set(participantIds);
  participantProfiles
    .filter((profile) => !knownParticipants.has(profile.id))
    .forEach((profile, index) => {
      attendees.push(
        mapProfileToAttendee(profile, profile.id, participantIds.length + index, translation),
      );
    });

  return attendees;
};

export const getEnvironmentScenarioProgress = (environment: Environment) => {
  const scenarioEntries = Object.values(environment.scenarios ?? {});
  const total = scenarioEntries.length * 2;
  let executed = 0;

  scenarioEntries.forEach((scenario) => {
    const statuses = getScenarioPlatformStatuses(scenario);
    (['mobile', 'desktop'] as const).forEach((platform) => {
      const status = statuses[platform];
      if (SCENARIO_COMPLETED_STATUSES.includes(status)) {
        executed += 1;
      }
    });
  });

  return { total, executed };
};

export const buildSlackTaskSummaryPayload = (
  environment: Environment,
  options: SlackSummaryBuilderOptions,
  translation: (key: string, opts?: TOptions) => string,
): SlackTaskSummaryPayload => {
  const suiteName = environment.suiteName?.trim() || translation('dynamic.suiteNameFallback');
  const attendees = buildAttendeesList(environment, options.participantProfiles, translation);
  const attendeeList = attendees ?? [];
  const uniqueParticipantsCount = new Set(environment.participants ?? []).size;
  const participantsCount = uniqueParticipantsCount || attendeeList.length;
  const monitoredUrls = (options.urls ?? []).filter(
    (url) => typeof url === 'string' && url.trim().length > 0,
  );
  const taskIdentifier =
    environment.identificador?.trim() || translation('dynamic.identifierFallback');
  const normalizedEnvironmentType = environment.tipoAmbiente?.trim().toUpperCase();
  const isWorkspaceEnvironment = normalizedEnvironmentType === 'WS';
  const fix = {
    type: isWorkspaceEnvironment ? 'storyfixes' : 'bug',
    value: options.bugsCount,
  } as const;
  const monitoredUrlsList =
    monitoredUrls.length > 0
      ? monitoredUrls.map((url) => `  - ${url}`)
      : [`  - ${translation('environment.slack.emptyList')}`];
  const attendeesList =
    attendeeList.length > 0
      ? attendeeList.map((attendee) => `• ${attendee.name} (${attendee.email})`)
      : [`• ${translation('environment.slack.emptyParticipants')}`];
  const summaryMessage = [
    translation('environment.slack.summaryHeader'),
    `• ${translation('environment.slack.fields.environment')}: ${taskIdentifier}`,
    `• ${translation('environment.slack.fields.totalTime')}: ${options.formattedTime || '00:00:00'}`,
    `• ${translation('environment.slack.fields.scenarios')}: ${options.scenarioCount}`,
    `• ${translation('environment.slack.fields.execution')}: ${formatExecutedScenariosMessage(
      options.executedScenariosCount,
      translation,
    )}`,
    `• ${translation('environment.slack.fields.bugs')}: ${fix.value}`,
    `• ${translation('environment.slack.fields.jira')}: ${
      environment.jiraTask?.trim() || translation('dynamic.identifierFallback')
    }`,
    `• ${translation('environment.slack.fields.suite')}: ${suiteName} — ${buildSuiteDetails(
      options.scenarioCount,
      translation,
    )}`,
    `• ${translation('environment.slack.fields.participants')}: ${participantsCount}`,
    `${translation('environment.slack.fields.monitoredUrls')}:`,
    ...monitoredUrlsList,
    translation('environment.slack.participantsTitle'),
    ...attendeesList,
    `${translation('environment.slack.fields.environmentLink')}: ${options.publicLink || '-'}`,
  ].join('\n');

  return {
    environmentSummary: {
      identifier: taskIdentifier,
      totalTime: options.formattedTime || '00:00:00',
      totalTimeMs: options.totalTimeMs,
      scenariosCount: options.scenarioCount,
      executedScenariosCount: options.executedScenariosCount,
      executedScenariosMessage: formatExecutedScenariosMessage(
        options.executedScenariosCount,
        translation,
      ),
      fix,
      jira: environment.jiraTask?.trim() || translation('dynamic.identifierFallback'),
      suiteName,
      suiteDetails: buildSuiteDetails(options.scenarioCount, translation),
      participantsCount,
      monitoredUrls,
      attendees: attendeeList,
    },
    message: summaryMessage,
  };
};
