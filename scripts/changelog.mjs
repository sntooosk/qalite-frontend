import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');

const readPackageVersion = () => {
  const raw = fs.readFileSync(packageJsonPath, 'utf8');
  const pkg = JSON.parse(raw);
  return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
};

const runGit = (command) => execSync(command, { encoding: 'utf8' }).trim();

const semverCompare = (a, b) => {
  const parse = (version) => version.split('.').map((part) => Number(part));
  const [aMajor, aMinor, aPatch] = parse(a.replace(/^v/, ''));
  const [bMajor, bMinor, bPatch] = parse(b.replace(/^v/, ''));
  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
};

const listTags = () => {
  const tagsOutput = runGit('git tag --list');
  if (!tagsOutput) return [];
  return tagsOutput
    .split('\n')
    .map((tag) => tag.trim())
    .filter((tag) => /^v?\d+\.\d+\.\d+$/.test(tag))
    .sort((a, b) => semverCompare(b, a));
};

const getTagDate = (tag) => {
  try {
    return runGit(`git log -1 --format=%cs ${tag}`);
  } catch {
    return '';
  }
};

const getCommits = (range) => {
  const rangeArg = range ? ` ${range}` : '';
  const output = runGit(`git log --format=%H%x7C%s${rangeArg}`);
  if (!output) return [];
  return output.split('\n').map((line) => {
    const [hash, ...subjectParts] = line.split('|');
    return { hash, subject: subjectParts.join('|').trim() };
  });
};

const classifyCommit = (subject) => {
  const normalized = subject.toLowerCase();
  if (normalized.startsWith('feat') || normalized.startsWith('add')) return 'Added';
  if (normalized.startsWith('fix') || normalized.startsWith('bug')) return 'Fixed';
  if (normalized.startsWith('remove') || normalized.startsWith('delete')) return 'Removed';
  if (normalized.includes('security')) return 'Security';
  return 'Changed';
};

const formatEntry = (subject) => {
  const mergeMatch = subject.match(/^Merge pull request #(\d+)/i);
  if (mergeMatch) {
    return `PR #${mergeMatch[1]}`;
  }

  const prMatch = subject.match(/\(#(\d+)\)/);
  if (prMatch) {
    const cleaned = subject.replace(/\s*\(#\d+\)\s*/, '').trim();
    return `${cleaned} (PR #${prMatch[1]})`;
  }

  return subject;
};

const buildSection = (title, commits) => {
  if (commits.length === 0) {
    return `## ${title}\n\n- (sem alterações)\n`;
  }

  const grouped = commits.reduce((acc, commit) => {
    const section = classifyCommit(commit.subject);
    if (!acc[section]) acc[section] = [];
    acc[section].push(formatEntry(commit.subject));
    return acc;
  }, {});

  const sections = ['Added', 'Changed', 'Fixed', 'Removed', 'Security']
    .filter((section) => grouped[section]?.length)
    .map((section) => {
      const entries = grouped[section].map((entry) => `- ${entry}`).join('\n');
      return `### ${section}\n\n${entries}`;
    })
    .join('\n\n');

  return `## ${title}\n\n${sections}`;
};

const main = () => {
  const tags = listTags();
  const packageVersion = readPackageVersion();
  const latestTag = tags[0] ?? null;
  const currentVersion = latestTag ? latestTag.replace(/^v/, '') : packageVersion;

  const unreleasedRange = latestTag ? `${latestTag}..HEAD` : null;
  const unreleasedCommits = latestTag ? getCommits(unreleasedRange) : [];

  const sections = [buildSection('[Unreleased]', unreleasedCommits)];

  if (tags.length > 0) {
    tags.forEach((tag, index) => {
      const previousTag = tags[index + 1];
      const range = previousTag ? `${previousTag}..${tag}` : tag;
      const commits = getCommits(range);
      const date = getTagDate(tag);
      sections.push(buildSection(`[${tag.replace(/^v/, '')}] - ${date}`, commits));
    });
  } else {
    const commits = getCommits();
    const date = runGit('git log -1 --format=%cs');
    sections.push(buildSection(`[${currentVersion}] - ${date}`, commits));
  }

  const output = [
    '# Changelog',
    '',
    'All notable changes to this project will be documented in this file.',
    '',
    ...sections,
    '',
  ].join('\n');

  fs.writeFileSync(path.join(rootDir, 'CHANGELOG.md'), output, 'utf8');
};

main();
