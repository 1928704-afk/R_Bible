import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const textDefaultProps = Text as unknown as { defaultProps?: Record<string, unknown> };
textDefaultProps.defaultProps = {
  ...textDefaultProps.defaultProps,
  allowFontScaling: false,
};

const inputDefaultProps = TextInput as unknown as { defaultProps?: Record<string, unknown> };
inputDefaultProps.defaultProps = {
  ...inputDefaultProps.defaultProps,
  allowFontScaling: false,
};

type Tab = 'dashboard' | 'check' | 'departments' | 'records' | 'admin' | 'superAdmin';

type OrganizationId = string;
type DepartmentId = string;
type MemberId = string;
type TargetMetric = 'members' | 'chapters';

type Department = {
  id: DepartmentId;
  name: string;
  monthlyTargetMembers: number;
};

type Organization = {
  id: OrganizationId;
  name: string;
  inviteCode: string;
  ownerName: string;
  createdAt: string;
  targetMetric: TargetMetric;
  departments: Department[];
};

type Member = {
  id: MemberId;
  organizationId: OrganizationId;
  departmentId: DepartmentId;
  name: string;
  role: 'owner' | 'member';
};

type ReadingLog = {
  id: string;
  date: string;
  organizationId: OrganizationId;
  departmentId: DepartmentId;
  memberId: MemberId;
  memberName: string;
  readChapters?: number;
  passage?: string;
  reflection?: string;
};

type Announcement = {
  id: string;
  organizationId: OrganizationId;
  title: string;
  body: string;
  updatedAt: string;
};

type AppState = {
  organizations: Organization[];
  currentOrganizationId?: OrganizationId;
  currentMember?: Member;
  members: Member[];
  logs: ReadingLog[];
  announcements: Announcement[];
  reminders: {
    daily: boolean;
    streak: boolean;
    department: boolean;
    count: number;
    times: string[];
  };
};

const STORAGE_KEY = 'bible-reading-challenge-app-v2';
const LEGACY_WEB_STORAGE_KEY = 'bible-reading-challenge-web-v1';
const MONTH_LABEL = '7월';
const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
const DEFAULT_REMINDER_TIMES = ['21:00', '08:00', '12:00'];
const REMINDER_COUNT_OPTIONS = [1, 2, 3];

const sampleOrganization: Organization = {
  id: 'org-busan-youth',
  name: '부산교회 청년회',
  inviteCode: 'BUSAN-YOUTH-2026',
  ownerName: '단체장',
  createdAt: '2026-07-01',
  targetMetric: 'members',
  departments: [
    { id: 'dept-covenant', name: '언약부', monthlyTargetMembers: 300 },
    { id: 'dept-wheat', name: '밀알부', monthlyTargetMembers: 300 },
    { id: 'dept-ireh', name: '이례부', monthlyTargetMembers: 300 },
  ],
};

const initialState: AppState = {
  organizations: [sampleOrganization],
  members: [],
  logs: [],
  announcements: [],
  reminders: {
    daily: true,
    streak: true,
    department: true,
    count: 1,
    times: ['21:00'],
  },
};

type OrganizationRow = {
  id: string;
  name: string;
  invite_code: string;
  owner_name: string;
  created_at: string;
  target_metric?: string | null;
};

type DepartmentRow = {
  id: string;
  organization_id: string;
  name: string;
  monthly_target_members: number;
};

type MemberRow = {
  id: string;
  organization_id: string;
  department_id: string;
  name: string;
  role: 'owner' | 'member';
};

type ReadingLogRow = {
  id: string;
  date: string;
  organization_id: string;
  department_id: string;
  member_id: string;
  member_name: string;
  read_chapters?: number | null;
  passage?: string | null;
  reflection?: string | null;
};

type AnnouncementRow = {
  id: string;
  organization_id: string;
  title: string;
  body: string;
  updated_at: string;
};

type NotificationState = 'unsupported' | 'default' | 'granted' | 'denied' | 'subscribed' | 'missing-key';

const bibleBooks = [
  { name: '창세기', chapters: 50 },
  { name: '출애굽기', chapters: 40 },
  { name: '레위기', chapters: 27 },
  { name: '민수기', chapters: 36 },
  { name: '신명기', chapters: 34 },
  { name: '여호수아', chapters: 24 },
  { name: '사사기', chapters: 21 },
  { name: '룻기', chapters: 4 },
  { name: '사무엘상', chapters: 31 },
  { name: '사무엘하', chapters: 24 },
  { name: '열왕기상', chapters: 22 },
  { name: '열왕기하', chapters: 25 },
  { name: '역대상', chapters: 29 },
  { name: '역대하', chapters: 36 },
  { name: '에스라', chapters: 10 },
  { name: '느헤미야', chapters: 13 },
  { name: '에스더', chapters: 10 },
  { name: '욥기', chapters: 42 },
  { name: '시편', chapters: 150 },
  { name: '잠언', chapters: 31 },
  { name: '전도서', chapters: 12 },
  { name: '아가서', chapters: 8 },
  { name: '이사야', chapters: 66 },
  { name: '예레미야', chapters: 52 },
  { name: '예레미야 애가', chapters: 5 },
  { name: '에스겔', chapters: 48 },
  { name: '다니엘', chapters: 12 },
  { name: '호세아', chapters: 14 },
  { name: '요엘', chapters: 3 },
  { name: '아모스', chapters: 9 },
  { name: '오바댜', chapters: 1 },
  { name: '요나', chapters: 4 },
  { name: '미가', chapters: 7 },
  { name: '나훔', chapters: 3 },
  { name: '하박국', chapters: 3 },
  { name: '스바냐', chapters: 3 },
  { name: '학개', chapters: 2 },
  { name: '스가랴', chapters: 14 },
  { name: '말라기', chapters: 4 },
  { name: '마태복음', chapters: 28 },
  { name: '마가복음', chapters: 16 },
  { name: '누가복음', chapters: 24 },
  { name: '요한복음', chapters: 21 },
  { name: '사도행전', chapters: 28 },
  { name: '로마서', chapters: 16 },
  { name: '고린도전서', chapters: 16 },
  { name: '고린도후서', chapters: 13 },
  { name: '갈라디아서', chapters: 6 },
  { name: '에베소서', chapters: 6 },
  { name: '빌립보서', chapters: 4 },
  { name: '골로새서', chapters: 4 },
  { name: '데살로니가전서', chapters: 5 },
  { name: '데살로니가후서', chapters: 3 },
  { name: '디모데전서', chapters: 6 },
  { name: '디모데후서', chapters: 4 },
  { name: '디도서', chapters: 3 },
  { name: '빌레몬서', chapters: 1 },
  { name: '히브리서', chapters: 13 },
  { name: '야고보서', chapters: 5 },
  { name: '베드로전서', chapters: 5 },
  { name: '베드로후서', chapters: 3 },
  { name: '요한일서', chapters: 5 },
  { name: '요한이서', chapters: 1 },
  { name: '요한삼서', chapters: 1 },
  { name: '유다서', chapters: 1 },
  { name: '요한계시록', chapters: 22 },
];

function todayKey() {
  const date = new Date();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDate(dateKey: string) {
  const [, month, day] = dateKey.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = globalThis.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function normalizeTargetMetric(value: unknown): TargetMetric {
  return value === 'chapters' ? 'chapters' : 'members';
}

function normalizeReminderTime(value: unknown, fallback = '21:00') {
  if (typeof value !== 'string') return fallback;

  const match = value.trim().match(/^([0-2]?\d):([0-5]\d)$/);
  if (!match) return fallback;

  const hour = Math.min(23, Number(match[1]));
  const minute = Number(match[2]);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizeReminderCount(value: unknown) {
  const count = Math.round(Number(value));
  if (!Number.isFinite(count)) return 1;
  return Math.min(3, Math.max(1, count));
}

function normalizeReminderTimes(value: unknown, count = 1) {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: count }, (_, index) => normalizeReminderTime(source[index], DEFAULT_REMINDER_TIMES[index] ?? '21:00'));
}

function normalizeReadChapters(value: unknown) {
  return Math.max(1, Math.min(200, Number(value) || 1));
}

function hasBrokenText(value: unknown) {
  if (typeof value !== 'string') return true;
  return /�|Ã|Â|ì|ë|ê|ð/.test(value);
}

function cleanText(value: unknown, fallback = '') {
  if (hasBrokenText(value)) return fallback;
  return String(value).trim() || fallback;
}

function cleanDepartmentName(id: string, name: unknown) {
  if (id === 'dept-covenant') return '언약부';
  if (id === 'dept-wheat') return '밀알부';
  if (id === 'dept-ireh') return '이례부';
  const cleaned = cleanText(name, '부서');
  return cleaned === '이레부' ? '이례부' : cleaned;
}

function normalizeState(parsed: Partial<AppState>): AppState {
  const organizations = Array.isArray(parsed.organizations) && parsed.organizations.length > 0
    ? parsed.organizations.map((organization) => ({
      ...organization,
      name: cleanText(organization.name, organization.id === sampleOrganization.id ? sampleOrganization.name : '성경읽기 챌린지'),
      inviteCode: cleanText(organization.inviteCode, sampleOrganization.inviteCode),
      ownerName: cleanText(organization.ownerName, '단체장'),
      targetMetric: normalizeTargetMetric(organization.targetMetric),
      departments: Array.isArray(organization.departments)
        ? organization.departments.map((department) => ({
          ...department,
          name: cleanDepartmentName(department.id, department.name),
          monthlyTargetMembers: organization.name === '부산교회 청년회' && ['언약부', '밀알부', '이레부', '이례부'].includes(department.name)
            ? 300
            : Math.max(1, Number(department.monthlyTargetMembers ?? (department as unknown as { monthlyTargetChapters?: number }).monthlyTargetChapters ?? 300)),
        }))
        : sampleOrganization.departments,
    }))
    : initialState.organizations;
  const fallbackOrganization = organizations[0];
  const currentOrganizationId = organizations.some((organization) => organization.id === parsed.currentOrganizationId)
    ? parsed.currentOrganizationId
    : parsed.currentMember?.organizationId ?? undefined;
  const currentMember = parsed.currentMember && organizations.some((organization) => organization.id === parsed.currentMember?.organizationId)
    ? { ...parsed.currentMember, name: cleanText(parsed.currentMember.name, '이름 없음') }
    : undefined;

  return {
    ...initialState,
    ...parsed,
    organizations,
    currentOrganizationId: currentOrganizationId && organizations.some((organization) => organization.id === currentOrganizationId) ? currentOrganizationId : currentMember?.organizationId,
    currentMember,
    reminders: {
      ...initialState.reminders,
      ...parsed.reminders,
      count: normalizeReminderCount(parsed.reminders?.count),
      times: normalizeReminderTimes(parsed.reminders?.times, normalizeReminderCount(parsed.reminders?.count)),
    },
    logs: Array.isArray(parsed.logs)
      ? parsed.logs.map((log) => ({
        ...log,
        organizationId: log.organizationId ?? fallbackOrganization.id,
        memberId: log.memberId ?? makeId(),
        memberName: cleanText(log.memberName, '이름 없음'),
        passage: hasBrokenText(log.passage) ? undefined : log.passage,
        reflection: hasBrokenText(log.reflection) ? undefined : log.reflection,
        readChapters: normalizeReadChapters(log.readChapters),
      }))
      : initialState.logs,
    members: Array.isArray(parsed.members)
      ? parsed.members
        .filter((member) => organizations.some((organization) => organization.id === member.organizationId))
        .map((member) => ({ ...member, name: cleanText(member.name, '이름 없음') }))
      : initialState.members,
    announcements: Array.isArray(parsed.announcements)
      ? parsed.announcements
        .filter((announcement) => organizations.some((organization) => organization.id === announcement.organizationId))
        .map((announcement) => ({
          ...announcement,
          title: cleanText(announcement.title, '오늘 공지'),
          body: hasBrokenText(announcement.body) ? '' : announcement.body,
        }))
      : initialState.announcements,
  };
}

function organizationToRow(organization: Organization): OrganizationRow {
  return {
    id: organization.id,
    name: organization.name,
    invite_code: organization.inviteCode,
    owner_name: organization.ownerName,
    created_at: organization.createdAt,
    target_metric: organization.targetMetric,
  };
}

function departmentToRow(organizationId: string, department: Department): DepartmentRow {
  return {
    id: department.id,
    organization_id: organizationId,
    name: department.name,
    monthly_target_members: department.monthlyTargetMembers,
  };
}

function memberToRow(member: Member): MemberRow {
  return {
    id: member.id,
    organization_id: member.organizationId,
    department_id: member.departmentId,
    name: member.name,
    role: member.role,
  };
}

function readingLogToRow(log: ReadingLog): ReadingLogRow {
  return {
    id: log.id,
    date: log.date,
    organization_id: log.organizationId,
    department_id: log.departmentId,
    member_id: log.memberId,
    member_name: log.memberName,
    read_chapters: normalizeReadChapters(log.readChapters),
    passage: log.passage?.trim() || '성경 읽기 인증',
    reflection: log.reflection?.trim() || '',
  };
}

function announcementToRow(announcement: Announcement): AnnouncementRow {
  return {
    id: announcement.id,
    organization_id: announcement.organizationId,
    title: announcement.title,
    body: announcement.body,
    updated_at: announcement.updatedAt,
  };
}

async function ensureDefaultRemoteOrganization() {
  if (!supabase) return;

  const organizationRow = organizationToRow(sampleOrganization);
  const { error: organizationError } = await supabase.from('organizations').upsert(organizationRow, { onConflict: 'id' });
  if (organizationError && String(organizationError.message ?? '').includes('target_metric')) {
    const fallbackRow = { ...organizationRow };
    delete fallbackRow.target_metric;
    await supabase.from('organizations').upsert(fallbackRow, { onConflict: 'id' });
  }
  await supabase.from('departments').upsert(
    sampleOrganization.departments.map((department) => departmentToRow(sampleOrganization.id, department)),
    { onConflict: 'id' },
  );
}

async function loadRemoteState(localState: AppState): Promise<AppState> {
  if (!isSupabaseConfigured || !supabase) return localState;

  let { data: organizationRows, error: organizationError }: { data: OrganizationRow[] | null; error: unknown } = await supabase
    .from('organizations')
    .select('id,name,invite_code,owner_name,created_at,target_metric')
    .order('created_at', { ascending: true });

  if (organizationError) {
    const fallback = await supabase
      .from('organizations')
      .select('id,name,invite_code,owner_name,created_at')
      .order('created_at', { ascending: true });
    organizationRows = fallback.data;
    organizationError = fallback.error;
  }

  if (organizationError) return localState;

  if (!organizationRows || organizationRows.length === 0) {
    await ensureDefaultRemoteOrganization();
  }

  let refreshedOrganizations = organizationRows;
  const [{ data: organizationRowsWithTarget, error: refreshedOrganizationError }, { data: departmentRows }, { data: memberRows }, logResult] = await Promise.all([
    supabase.from('organizations').select('id,name,invite_code,owner_name,created_at,target_metric').order('created_at', { ascending: true }),
    supabase.from('departments').select('id,organization_id,name,monthly_target_members'),
    supabase.from('members').select('id,organization_id,department_id,name,role'),
    supabase.from('reading_logs').select('id,date,organization_id,department_id,member_id,member_name,read_chapters,passage,reflection').order('date', { ascending: false }),
  ]);

  if (!refreshedOrganizationError && organizationRowsWithTarget) {
    refreshedOrganizations = organizationRowsWithTarget;
  }

  let logRows = (logResult.data ?? null) as ReadingLogRow[] | null;
  if (logResult.error) {
    const fallback = await supabase
      .from('reading_logs')
      .select('id,date,organization_id,department_id,member_id,member_name,passage,reflection')
      .order('date', { ascending: false });
    logRows = (fallback.data ?? null) as ReadingLogRow[] | null;
  }

  const announcementResult = await supabase
    .from('announcements')
    .select('id,organization_id,title,body,updated_at')
    .order('updated_at', { ascending: false });
  const announcementRows = announcementResult.error ? null : ((announcementResult.data ?? null) as AnnouncementRow[] | null);

  const remoteOrganizations = (refreshedOrganizations ?? organizationRows ?? []).map((organization) => ({
    id: organization.id,
    name: organization.name,
    inviteCode: organization.invite_code,
    ownerName: organization.owner_name,
    createdAt: organization.created_at,
    targetMetric: normalizeTargetMetric(organization.target_metric),
    departments: (departmentRows ?? [])
      .filter((department) => department.organization_id === organization.id)
      .map((department) => ({
        id: department.id,
        name: department.name,
        monthlyTargetMembers: department.monthly_target_members,
      })),
  }));

  return normalizeState({
    ...localState,
    organizations: remoteOrganizations.length > 0 ? remoteOrganizations : localState.organizations,
    members: (memberRows ?? []).map((member) => ({
      id: member.id,
      organizationId: member.organization_id,
      departmentId: member.department_id,
      name: member.name,
      role: member.role,
    })),
    logs: (logRows ?? []).map((log) => ({
      id: log.id,
      date: log.date,
      organizationId: log.organization_id,
      departmentId: log.department_id,
      memberId: log.member_id,
      memberName: log.member_name,
      readChapters: normalizeReadChapters(log.read_chapters),
      passage: log.passage ?? undefined,
      reflection: log.reflection ?? undefined,
    })),
    announcements: (announcementRows ?? []).map((announcement) => ({
      id: announcement.id,
      organizationId: announcement.organization_id,
      title: announcement.title,
      body: announcement.body,
      updatedAt: announcement.updated_at,
    })),
  });
}

async function saveRemoteOrganization(organization: Organization) {
  if (!supabase) return;

  const organizationRow = organizationToRow(organization);
  let { error: organizationError } = await supabase.from('organizations').insert(organizationRow);
  if (organizationError && String(organizationError.message ?? '').includes('target_metric')) {
    const fallbackRow = { ...organizationRow };
    delete fallbackRow.target_metric;
    const fallback = await supabase.from('organizations').insert(fallbackRow);
    organizationError = fallback.error;
  }
  if (organizationError) throw organizationError;

  const { error: departmentError } = await supabase
    .from('departments')
    .insert(organization.departments.map((department) => departmentToRow(organization.id, department)));
  if (departmentError) throw departmentError;
}

async function saveRemoteMember(member: Member) {
  if (!supabase) return;

  const { error } = await supabase.from('members').insert(memberToRow(member));
  if (error) throw error;
}

async function saveRemoteReadingLog(log: ReadingLog) {
  if (!supabase) return;

  const logRow = readingLogToRow(log);
  let { error } = await supabase.from('reading_logs').insert(logRow);
  if (error && String(error.message ?? '').includes('read_chapters')) {
    const fallbackRow = { ...logRow };
    delete fallbackRow.read_chapters;
    const fallback = await supabase.from('reading_logs').insert(fallbackRow);
    error = fallback.error;
  }
  if (error) throw error;
}

async function deleteRemoteReadingLog(id: string) {
  if (!supabase) return;

  const { error } = await supabase.from('reading_logs').delete().eq('id', id);
  if (error) throw error;
}

async function deleteRemoteOrganization(id: string, adminDeleteCode: string) {
  if (!supabase) return;

  const { error } = await supabase.functions.invoke('delete-organization', {
    body: { action: 'deleteOrganization', organizationId: id },
    headers: { 'x-admin-delete-secret': adminDeleteCode },
  });
  if (error) throw error;
}

async function runRemoteAdminAction(action: string, payload: Record<string, unknown>, adminDeleteCode: string) {
  if (!supabase) return;

  const { error } = await supabase.functions.invoke('delete-organization', {
    body: { action, ...payload },
    headers: { 'x-admin-delete-secret': adminDeleteCode },
  });
  if (error) throw error;
}

async function saveRemotePushSubscription(member: Member, subscription: PushSubscription, reminders: AppState['reminders']) {
  if (!supabase) return;

  const subscriptionJson = subscription.toJSON();
  const p256dh = subscriptionJson.keys?.p256dh;
  const auth = subscriptionJson.keys?.auth;

  if (!p256dh || !auth) {
    throw new Error('Push subscription keys are missing.');
  }

  const webNavigator = (globalThis as unknown as { navigator?: Navigator }).navigator;
  const reminderCount = normalizeReminderCount(reminders.count);
  const reminderTimes = normalizeReminderTimes(reminders.times, reminderCount);
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      id: makeId(),
      organization_id: member.organizationId,
      member_id: member.id,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      user_agent: webNavigator?.userAgent ?? null,
      reminder_enabled: reminders.daily,
      reminder_count: reminderCount,
      reminder_times: reminderTimes,
      reminder_timezone: 'Asia/Seoul',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  );

  if (error) throw error;
}

async function loadLocalState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeState(JSON.parse(raw) as Partial<AppState>);

    if (Platform.OS === 'web') {
      const legacyRaw = (globalThis as unknown as { localStorage?: Storage }).localStorage?.getItem(LEGACY_WEB_STORAGE_KEY);
      if (legacyRaw) return normalizeState(JSON.parse(legacyRaw) as Partial<AppState>);
    }
  } catch {
    // Keep the app usable even when stored data is malformed.
  }

  return initialState;
}

async function loadState(): Promise<AppState> {
  const localState = await loadLocalState();
  return loadRemoteState(localState);
}

async function saveState(state: AppState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clampPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function ProgressBar({ value, total, light = false }: { value: number; total: number; light?: boolean }) {
  const percent = clampPercent(value, total);

  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressTrack, light && styles.progressTrackLight]}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
      <Text style={[styles.progressPct, light && styles.progressPctLight]}>{percent}%</Text>
    </View>
  );
}

function StatTile({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {helper ? <Text style={styles.statHelper}>{helper}</Text> : null}
    </View>
  );
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const isCompact = width < 430;
  const [tab, setTab] = useState<Tab>('dashboard');
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [passage, setPassage] = useState('');
  const [readChapters, setReadChapters] = useState('1');
  const [reflection, setReflection] = useState('');
  const [completedModal, setCompletedModal] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ReadingLog | null>(null);
  const [onboardingMode, setOnboardingMode] = useState<'create' | 'join'>('join');
  const [organizationName, setOrganizationName] = useState('부산교회 청년회');
  const [ownerName, setOwnerName] = useState('');
  const [targetMetric, setTargetMetric] = useState<TargetMetric>('members');
  const [departmentDrafts, setDepartmentDrafts] = useState([
    { id: makeId(), name: '언약부', monthlyTargetMembers: '300' },
    { id: makeId(), name: '밀알부', monthlyTargetMembers: '300' },
    { id: makeId(), name: '이례부', monthlyTargetMembers: '300' },
  ]);
  const [joinOrganizationId, setJoinOrganizationId] = useState(sampleOrganization.id);
  const [joinDepartmentId, setJoinDepartmentId] = useState(sampleOrganization.departments[0].id);
  const [joinMemberName, setJoinMemberName] = useState('');
  const [joinSelectionTouched, setJoinSelectionTouched] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationState>('default');
  const [adminDeleteCode, setAdminDeleteCode] = useState('');
  const [adminOrgName, setAdminOrgName] = useState('');
  const [adminInviteCode, setAdminInviteCode] = useState('');
  const [adminOwnerName, setAdminOwnerName] = useState('');
  const [adminTargetMetric, setAdminTargetMetric] = useState<TargetMetric>('members');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newDepartmentTarget, setNewDepartmentTarget] = useState('300');

  useEffect(() => {
    let mounted = true;

    loadState().then((storedState) => {
      if (!mounted) return;
      setState(storedState);
      setHydrated(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const webDocument = (globalThis as unknown as { document?: Document }).document;
    const webNavigator = (globalThis as unknown as { navigator?: Navigator & { serviceWorker?: ServiceWorkerContainer } }).navigator;
    const webGlobal = globalThis as unknown as { Notification?: { permission: NotificationPermission }; PushManager?: unknown };

    if (webDocument && !webDocument.querySelector('link[rel="manifest"]')) {
      const manifestLink = webDocument.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.webmanifest';
      webDocument.head.appendChild(manifestLink);
    }

    if (webDocument && !webDocument.querySelector('link[rel="apple-touch-icon"]')) {
      const appleIconLink = webDocument.createElement('link');
      appleIconLink.rel = 'apple-touch-icon';
      appleIconLink.href = '/icon-v2.png';
      webDocument.head.appendChild(appleIconLink);
    }

    if (webDocument && !webDocument.querySelector('link[rel="icon"]')) {
      const iconLink = webDocument.createElement('link');
      iconLink.rel = 'icon';
      iconLink.type = 'image/png';
      iconLink.href = '/icon-v2.png';
      webDocument.head.appendChild(iconLink);
    }

    if (webDocument && !webDocument.querySelector('meta[name="theme-color"]')) {
      const themeMeta = webDocument.createElement('meta');
      themeMeta.name = 'theme-color';
      themeMeta.content = '#2F9FDB';
      webDocument.head.appendChild(themeMeta);
    }

    if (webDocument && !webDocument.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      const appleMeta = webDocument.createElement('meta');
      appleMeta.name = 'apple-mobile-web-app-capable';
      appleMeta.content = 'yes';
      webDocument.head.appendChild(appleMeta);
    }

    if (!webGlobal.Notification || !webNavigator?.serviceWorker || !webGlobal.PushManager) {
      setNotificationStatus('unsupported');
    } else if (!VAPID_PUBLIC_KEY) {
      setNotificationStatus('missing-key');
    } else if (webGlobal.Notification.permission === 'denied') {
      setNotificationStatus('denied');
    } else if (webGlobal.Notification.permission === 'granted') {
      setNotificationStatus('granted');
    }

    if (webNavigator?.serviceWorker) {
      webNavigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState(state).catch(() => {
      Alert.alert('저장 오류', '기록을 저장하지 못했습니다. 저장 공간을 확인해 주세요.');
    });
  }, [hydrated, state]);

  useEffect(() => {
    if (state.organizations.some((organization) => organization.id === joinOrganizationId)) return;
    const fallbackOrganization = state.organizations[0];
    if (!fallbackOrganization) return;
    setJoinOrganizationId(fallbackOrganization.id);
    setJoinDepartmentId(fallbackOrganization.departments[0]?.id ?? '');
  }, [joinOrganizationId, state.organizations]);

  useEffect(() => {
    if (!hydrated || state.currentMember || joinSelectionTouched || !state.currentOrganizationId) return;
    const preferredOrganization = state.organizations.find((organization) => organization.id === state.currentOrganizationId);
    if (!preferredOrganization || preferredOrganization.id === joinOrganizationId) return;
    setJoinOrganizationId(preferredOrganization.id);
    setJoinDepartmentId(preferredOrganization.departments[0]?.id ?? '');
  }, [hydrated, joinOrganizationId, joinSelectionTouched, state.currentMember, state.currentOrganizationId, state.organizations]);

  const currentOrganization = state.organizations.find((organization) => organization.id === state.currentOrganizationId) ?? state.organizations[0] ?? sampleOrganization;
  const departments = currentOrganization.departments;
  const targetUnit = currentOrganization.targetMetric === 'chapters' ? '장' : '명';
  const targetNoun = currentOrganization.targetMetric === 'chapters' ? '장수' : '인원수';
  const targetCountLabel = currentOrganization.targetMetric === 'chapters' ? '장' : '명';
  const activeMember = state.currentMember;
  const myDepartment = departments.find((department) => department.id === activeMember?.departmentId) ?? departments[0];
  const today = todayKey();
  const organizationLogs = state.logs.filter((log) => log.organizationId === currentOrganization.id);
  const organizationMembers = state.members.filter((member) => member.organizationId === currentOrganization.id);
  const currentAnnouncement = state.announcements.find((announcement) => announcement.organizationId === currentOrganization.id);
  const myLogs = activeMember ? organizationLogs.filter((log) => log.memberId === activeMember.id) : [];
  const checkedToday = activeMember ? organizationLogs.some((log) => log.date === today && log.memberId === activeMember.id) : false;
  const todayLog = activeMember ? organizationLogs.find((log) => log.date === today && log.memberId === activeMember.id) : undefined;
  const isReflectionAdmin = activeMember?.name.trim() === '권진호';
  const isAppAdmin = isReflectionAdmin;
  const selectedBibleBook = bibleBooks.find((book) => passage.startsWith(book.name));
  const selectedChapter = Number(passage.match(/(\d+)장/)?.[1] ?? 0) || null;
  const totalTarget = departments.reduce((sum, department) => sum + department.monthlyTargetMembers, 0);

  const departmentStats = useMemo(
    () =>
      departments.map((department) => {
        const departmentLogs = organizationLogs.filter((log) => log.departmentId === department.id);
        const count = currentOrganization.targetMetric === 'chapters'
          ? departmentLogs.reduce((sum, log) => sum + normalizeReadChapters(log.readChapters), 0)
          : departmentLogs.length;
        return {
          ...department,
          count,
          percent: clampPercent(count, department.monthlyTargetMembers),
          remaining: Math.max(0, department.monthlyTargetMembers - count),
          participants: new Set(departmentLogs.map((log) => log.memberId)).size,
        };
      }),
    [currentOrganization.targetMetric, departments, organizationLogs],
  );

  const currentDepartmentStats = departmentStats.find((department) => department.id === myDepartment.id) ?? departmentStats[0];
  const totalCount = departmentStats.reduce((sum, department) => sum + department.count, 0);
  const weeklyLogs = organizationLogs.filter((log) => {
    const time = new Date(log.date).getTime();
    const diff = Date.now() - time;
    return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 7;
  });
  const weeklyCount = currentOrganization.targetMetric === 'chapters'
    ? weeklyLogs.reduce((sum, log) => sum + normalizeReadChapters(log.readChapters), 0)
    : weeklyLogs.length;

  const currentStreak = useMemo(() => {
    const dateSet = new Set(myLogs.map((log) => log.date));
    let streak = 0;
    const cursor = new Date();

    for (let i = 0; i < 31; i += 1) {
      const key = `${cursor.getFullYear()}-${`${cursor.getMonth() + 1}`.padStart(2, '0')}-${`${cursor.getDate()}`.padStart(2, '0')}`;
      if (!dateSet.has(key)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak || (checkedToday ? 1 : 0);
  }, [checkedToday, myLogs]);

  const recentLogs = [...organizationLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const adminRecentLogs = [...organizationLogs].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 20);
  const todayReflections = organizationLogs
    .filter((log) => log.date === today && log.reflection?.trim())
    .sort((a, b) => b.id.localeCompare(a.id));
  const canDeleteSelectedLog = !!selectedLog && (selectedLog.memberId === activeMember?.id || (isReflectionAdmin && selectedLog.date === today && !!selectedLog.reflection?.trim()));

  const shareText = `[${MONTH_LABEL} 성경읽기 챌린지]\n${currentOrganization.name} ${myDepartment.name}는 현재 ${currentDepartmentStats.count} / ${myDepartment.monthlyTargetMembers}${targetUnit}입니다.\n전체는 ${totalCount} / ${totalTarget}${targetUnit}까지 채워졌어요.\n오늘도 말씀 읽기 인증으로 함께해요.`;

  useEffect(() => {
    setAdminOrgName(currentOrganization.name);
    setAdminInviteCode(currentOrganization.inviteCode);
    setAdminOwnerName(currentOrganization.ownerName);
    setAdminTargetMetric(currentOrganization.targetMetric);
    setAnnouncementTitle(currentAnnouncement?.title ?? '');
    setAnnouncementBody(currentAnnouncement?.body ?? '');
  }, [currentAnnouncement?.body, currentAnnouncement?.title, currentOrganization.id, currentOrganization.inviteCode, currentOrganization.name, currentOrganization.ownerName, currentOrganization.targetMetric]);

  const updateState = (next: Partial<AppState>) => setState((prev) => ({ ...prev, ...next }));

  const updateDepartmentDraft = (id: string, next: Partial<{ name: string; monthlyTargetMembers: string }>) => {
    setDepartmentDrafts((prev) => prev.map((department) => (department.id === id ? { ...department, ...next } : department)));
  };

  const addDepartmentDraft = () => {
    setDepartmentDrafts((prev) => [...prev, { id: makeId(), name: '', monthlyTargetMembers: '300' }]);
  };

  const removeDepartmentDraft = (id: string) => {
    setDepartmentDrafts((prev) => (prev.length <= 1 ? prev : prev.filter((department) => department.id !== id)));
  };

  const createOrganization = async () => {
    const name = organizationName.trim();
    const owner = ownerName.trim();
    const departmentsToCreate = departmentDrafts
      .map((department) => ({
        id: makeId(),
        name: department.name.trim(),
        monthlyTargetMembers: Math.max(1, Number(department.monthlyTargetMembers) || 0),
      }))
      .filter((department) => department.name.length > 0);

    if (!name || !owner || departmentsToCreate.length === 0) {
      Alert.alert('입력 확인', '단체명, 단체장 이름, 부서를 입력해 주세요.');
      return;
    }

    const organization: Organization = {
      id: makeId(),
      name,
      ownerName: owner,
      inviteCode: `${name.replace(/\s/g, '').slice(0, 6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: today,
      targetMetric,
      departments: departmentsToCreate,
    };

    try {
      await saveRemoteOrganization(organization);
    } catch {
      Alert.alert('단체 생성 실패', 'Supabase 테이블 설정을 확인해 주세요. SQL 스키마를 먼저 실행해야 합니다.');
      return;
    }

    setState((prev) => ({
      ...prev,
      organizations: [organization, ...prev.organizations],
      currentOrganizationId: organization.id,
      currentMember: undefined,
    }));
    setJoinOrganizationId(organization.id);
    setJoinDepartmentId(organization.departments[0].id);
    setJoinMemberName(owner);
    setJoinSelectionTouched(false);
    setOnboardingMode('join');
    Alert.alert('단체 생성 완료', '단체 선택 목록에 추가했습니다. 부서와 이름을 확인한 뒤 가입해 주세요.');
  };

  const joinOrganization = async () => {
    const organization = state.organizations.find((item) => item.id === joinOrganizationId);
    const department = organization?.departments.find((item) => item.id === joinDepartmentId) ?? organization?.departments[0];
    const memberName = joinMemberName.trim();

    if (!organization || !department || !memberName) {
      Alert.alert('입력 확인', '단체, 부서, 이름을 모두 입력해 주세요.');
      return;
    }

    const member: Member = {
      id: makeId(),
      organizationId: organization.id,
      departmentId: department.id,
      name: memberName,
      role: 'member',
    };

    try {
      await saveRemoteMember(member);
    } catch {
      Alert.alert('가입 실패', 'Supabase 연결 또는 members 테이블 설정을 확인해 주세요.');
      return;
    }

    setState((prev) => ({
      ...prev,
      members: [member, ...prev.members.filter((item) => item.id !== member.id)],
      currentOrganizationId: organization.id,
      currentMember: member,
    }));
    setTab('dashboard');
  };

  const checkToday = async () => {
    if (!activeMember) return;

    if (checkedToday) {
      Alert.alert('오늘 인증 완료', '하루 1회 인증으로 기록됩니다. 내일 다시 함께해요.');
      return;
    }

    const trimmedPassage = passage.trim();
    const trimmedReflection = reflection.trim();
    const nextReadChapters = currentOrganization.targetMetric === 'chapters' ? normalizeReadChapters(readChapters) : 1;
    const nextLog: ReadingLog = {
      id: makeId(),
      date: today,
      organizationId: activeMember.organizationId,
      departmentId: activeMember.departmentId,
      memberId: activeMember.id,
      memberName: activeMember.name.trim() || '이름 없음',
      readChapters: nextReadChapters,
      passage: trimmedPassage || undefined,
      reflection: trimmedReflection,
    };

    try {
      await saveRemoteReadingLog(nextLog);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Supabase 연결 또는 reading_logs 테이블 설정을 확인해 주세요.';
      Alert.alert('인증 저장 실패', message);
      return;
    }

    setState((prev) => ({
      ...prev,
      logs: [
        nextLog,
        ...prev.logs,
      ],
    }));
    setPassage('');
    setReadChapters('1');
    setReflection('');
    setCompletedModal(true);
  };

  const removeLog = async (id: string) => {
    try {
      await deleteRemoteReadingLog(id);
    } catch {
      Alert.alert('삭제 실패', 'Supabase 인증 기록 삭제에 실패했습니다.');
      return;
    }

    setSelectedLog((current) => (current?.id === id ? null : current));
    setState((prev) => ({ ...prev, logs: prev.logs.filter((log) => log.id !== id) }));
  };

  const confirmRemoveLog = (log: ReadingLog) => {
    const message = `${log.memberName}님의 오늘 묵상글을 삭제할까요?`;

    if (Platform.OS === 'web') {
      const confirmed = (globalThis as unknown as { confirm?: (text: string) => boolean }).confirm?.(message) ?? true;
      if (confirmed) {
        void removeLog(log.id);
      }
      return;
    }

    Alert.alert(
      '묵상글 삭제',
      message,
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => removeLog(log.id) },
      ],
    );
  };

  const removeOrganization = async (organization: Organization) => {
    if (!isAppAdmin) return;
    const deleteCode = adminDeleteCode.trim();

    if (!deleteCode) {
      Alert.alert('삭제 코드 필요', '관리자 삭제 코드를 입력해 주세요.');
      return;
    }

    try {
      await deleteRemoteOrganization(organization.id, deleteCode);
    } catch {
      Alert.alert('단체 삭제 실패', '관리자 삭제 코드 또는 delete-organization Edge Function 설정을 확인해 주세요.');
      return;
    }

    setState((prev) => {
      const nextOrganizations = prev.organizations.filter((item) => item.id !== organization.id);
      const nextCurrentOrganization = nextOrganizations[0];
      const shouldClearMember = prev.currentMember?.organizationId === organization.id;

      return {
        ...prev,
        organizations: nextOrganizations,
        currentOrganizationId: shouldClearMember
          ? nextCurrentOrganization?.id
          : prev.currentOrganizationId === organization.id
            ? nextCurrentOrganization?.id
            : prev.currentOrganizationId,
        currentMember: shouldClearMember ? undefined : prev.currentMember,
        logs: prev.logs.filter((log) => log.organizationId !== organization.id),
      };
    });

    if (currentOrganization.id === organization.id) {
      setTab('dashboard');
    }
  };

  const confirmRemoveOrganization = (organization: Organization) => {
    if (!isAppAdmin) return;

    const message = `${organization.name} 단체와 연결된 부서, 멤버, 인증 기록을 모두 삭제할까요?`;

    if (Platform.OS === 'web') {
      const confirmed = (globalThis as unknown as { confirm?: (text: string) => boolean }).confirm?.(message) ?? false;
      if (confirmed) {
        void removeOrganization(organization);
      }
      return;
    }

    Alert.alert(
      '단체 삭제',
      message,
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => removeOrganization(organization) },
      ],
    );
  };

  const requireAdminCode = () => {
    const code = adminDeleteCode.trim();
    if (!code) {
      Alert.alert('관리자 코드 필요', '관리자 코드를 입력해 주세요.');
      return '';
    }
    return code;
  };

  const saveOrganizationSettings = async () => {
    const code = requireAdminCode();
    const name = adminOrgName.trim();
    const inviteCode = adminInviteCode.trim();
    const ownerName = adminOwnerName.trim();
    if (!code || !name || !inviteCode || !ownerName) return;

    const nextOrganization = {
      ...currentOrganization,
      name,
      inviteCode,
      ownerName,
      targetMetric: adminTargetMetric,
    };

    try {
      await runRemoteAdminAction('updateOrganization', { organization: organizationToRow(nextOrganization) }, code);
    } catch {
      Alert.alert('저장 실패', '단체 기본정보 저장에 실패했습니다.');
      return;
    }

    setState((prev) => ({
      ...prev,
      organizations: prev.organizations.map((organization) => (organization.id === nextOrganization.id ? nextOrganization : organization)),
    }));
    Alert.alert('저장 완료', '단체 기본정보를 저장했습니다.');
  };

  const saveAnnouncement = async () => {
    const code = requireAdminCode();
    if (!code) return;

    const announcement: Announcement = {
      id: currentAnnouncement?.id ?? `${currentOrganization.id}-announcement`,
      organizationId: currentOrganization.id,
      title: announcementTitle.trim() || '오늘 공지',
      body: announcementBody.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await runRemoteAdminAction('upsertAnnouncement', { announcement: announcementToRow(announcement) }, code);
    } catch {
      Alert.alert('공지 저장 실패', '공지 저장에 실패했습니다.');
      return;
    }

    setState((prev) => ({
      ...prev,
      announcements: [announcement, ...prev.announcements.filter((item) => item.organizationId !== currentOrganization.id)],
    }));
    Alert.alert('저장 완료', '홈 공지를 저장했습니다.');
  };

  const saveDepartment = async (department: Department) => {
    const code = requireAdminCode();
    if (!code) return;

    try {
      await runRemoteAdminAction('upsertDepartment', { department: departmentToRow(currentOrganization.id, department) }, code);
    } catch {
      Alert.alert('부서 저장 실패', '부서 정보를 저장하지 못했습니다.');
      return;
    }

    Alert.alert('저장 완료', '부서 정보를 저장했습니다.');
  };

  const addAdminDepartment = async () => {
    const code = requireAdminCode();
    const name = newDepartmentName.trim();
    const target = Math.max(1, Number(newDepartmentTarget) || 0);
    if (!code || !name) return;

    const department: Department = { id: makeId(), name, monthlyTargetMembers: target };

    try {
      await runRemoteAdminAction('upsertDepartment', { department: departmentToRow(currentOrganization.id, department) }, code);
    } catch {
      Alert.alert('부서 추가 실패', '부서를 추가하지 못했습니다.');
      return;
    }

    setState((prev) => ({
      ...prev,
      organizations: prev.organizations.map((organization) => (
        organization.id === currentOrganization.id
          ? { ...organization, departments: [...organization.departments, department] }
          : organization
      )),
    }));
    setNewDepartmentName('');
    setNewDepartmentTarget('300');
  };

  const removeDepartment = async (department: Department) => {
    const code = requireAdminCode();
    if (!code) return;
    if (departments.length <= 1) {
      Alert.alert('삭제 불가', '단체에는 최소 1개의 부서가 필요합니다.');
      return;
    }

    try {
      await runRemoteAdminAction('deleteDepartment', { departmentId: department.id }, code);
    } catch {
      Alert.alert('부서 삭제 실패', '부서를 삭제하지 못했습니다.');
      return;
    }

    setState((prev) => ({
      ...prev,
      organizations: prev.organizations.map((organization) => (
        organization.id === currentOrganization.id
          ? { ...organization, departments: organization.departments.filter((item) => item.id !== department.id) }
          : organization
      )),
      members: prev.members.filter((member) => member.departmentId !== department.id),
      logs: prev.logs.filter((log) => log.departmentId !== department.id),
      currentMember: prev.currentMember?.departmentId === department.id ? undefined : prev.currentMember,
    }));
  };

  const saveMember = async (member: Member) => {
    const code = requireAdminCode();
    if (!code) return;

    try {
      await runRemoteAdminAction('updateMember', { member: memberToRow(member) }, code);
    } catch {
      Alert.alert('멤버 저장 실패', '멤버 정보를 저장하지 못했습니다.');
      return;
    }

    setState((prev) => ({
      ...prev,
      logs: prev.logs.map((log) => (
        log.memberId === member.id ? { ...log, memberName: member.name, departmentId: member.departmentId } : log
      )),
    }));
    Alert.alert('저장 완료', '멤버 정보를 저장했습니다.');
  };

  const removeMember = async (member: Member) => {
    const code = requireAdminCode();
    if (!code) return;

    try {
      await runRemoteAdminAction('deleteMember', { memberId: member.id }, code);
    } catch {
      Alert.alert('멤버 삭제 실패', '멤버를 삭제하지 못했습니다.');
      return;
    }

    setState((prev) => ({
      ...prev,
      members: prev.members.filter((item) => item.id !== member.id),
      logs: prev.logs.filter((log) => log.memberId !== member.id),
      currentMember: prev.currentMember?.id === member.id ? undefined : prev.currentMember,
    }));
  };

  const saveAdminLog = async (log: ReadingLog) => {
    const code = requireAdminCode();
    if (!code) return;

    try {
      await runRemoteAdminAction('updateLog', { log: readingLogToRow(log) }, code);
    } catch {
      Alert.alert('인증 저장 실패', '인증 기록을 저장하지 못했습니다.');
      return;
    }

    Alert.alert('저장 완료', '인증 기록을 저장했습니다.');
  };

  const removeAdminLog = async (log: ReadingLog) => {
    const code = requireAdminCode();
    if (!code) return;

    try {
      await runRemoteAdminAction('deleteLog', { logId: log.id }, code);
    } catch {
      Alert.alert('인증 삭제 실패', '인증 기록을 삭제하지 못했습니다.');
      return;
    }

    setState((prev) => ({ ...prev, logs: prev.logs.filter((item) => item.id !== log.id) }));
  };

  const selectBibleBook = (book: { name: string; chapters: number }) => {
    setPassage((prev) => {
      const chapterPart = prev.match(/\d.*$/)?.[0]?.trim();
      return chapterPart ? `${book.name} ${chapterPart}` : book.name;
    });
    setBookPickerOpen(false);
  };

  const selectBibleChapter = (chapter: number) => {
    if (!selectedBibleBook) return;
    setPassage(`${selectedBibleBook.name} ${chapter}장`);
  };

  const requestNotifications = async () => {
    if (!activeMember) {
      Alert.alert('가입 필요', '단체와 부서를 선택해 가입한 뒤 알림을 설정할 수 있습니다.');
      return;
    }

    if (Platform.OS !== 'web') {
      setNotificationStatus('unsupported');
      Alert.alert('웹앱 알림', '현재 알림 설정은 PWA 웹앱 배포 환경에서 사용할 수 있습니다.');
      return;
    }

    const webNavigator = (globalThis as unknown as { navigator?: Navigator & { serviceWorker?: ServiceWorkerContainer } }).navigator;
    const webGlobal = globalThis as unknown as {
      Notification?: {
        permission: NotificationPermission;
        requestPermission: () => Promise<NotificationPermission>;
      };
      PushManager?: unknown;
    };

    if (!webGlobal.Notification || !webNavigator?.serviceWorker || !webGlobal.PushManager) {
      setNotificationStatus('unsupported');
      Alert.alert('알림 미지원', '이 브라우저는 웹 푸시 알림을 지원하지 않습니다. iPhone은 홈 화면에 추가한 웹앱에서 다시 시도해 주세요.');
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      setNotificationStatus('missing-key');
      Alert.alert('VAPID 키 필요', 'Cloudflare Pages 환경 변수에 EXPO_PUBLIC_VAPID_PUBLIC_KEY를 먼저 추가해야 합니다.');
      return;
    }

    try {
      const permission = await webGlobal.Notification.requestPermission();
      setNotificationStatus(permission === 'granted' ? 'granted' : permission);

      if (permission !== 'granted') {
        Alert.alert('알림 권한 필요', '브라우저 알림 권한을 허용해야 리마인드를 받을 수 있습니다.');
        return;
      }

      const registration = await webNavigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription = existingSubscription ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });

      await saveRemotePushSubscription(activeMember, subscription, state.reminders);
      setNotificationStatus('subscribed');
      Alert.alert('알림 설정 완료', `이 기기에서 하루 ${normalizeReminderCount(state.reminders.count)}회 리마인드를 받을 수 있습니다.`);
    } catch {
      Alert.alert('알림 설정 실패', '브라우저 권한, VAPID 키, Supabase push_subscriptions 테이블 설정을 확인해 주세요.');
    }
  };

  const updateReminderCount = (count: number) => {
    setState((prev) => ({
      ...prev,
      reminders: {
        ...prev.reminders,
        count,
        times: normalizeReminderTimes(prev.reminders.times, count),
      },
    }));
  };

  const updateReminderTime = (index: number, value: string) => {
    setState((prev) => {
      const times = normalizeReminderTimes(prev.reminders.times, normalizeReminderCount(prev.reminders.count));
      times[index] = value.replace(/[^0-9:]/g, '').slice(0, 5);
      return { ...prev, reminders: { ...prev.reminders, times } };
    });
  };

  const commitReminderTime = (index: number) => {
    setState((prev) => {
      const times = normalizeReminderTimes(prev.reminders.times, normalizeReminderCount(prev.reminders.count));
      times[index] = normalizeReminderTime(times[index], DEFAULT_REMINDER_TIMES[index] ?? '21:00');
      return { ...prev, reminders: { ...prev.reminders, times } };
    });
  };

  const share = async () => {
    try {
      if (Platform.OS === 'web') {
        const clipboard = (globalThis as unknown as { navigator?: { clipboard?: { writeText: (text: string) => Promise<void> } } }).navigator?.clipboard;
        if (clipboard) {
          await clipboard.writeText(shareText);
          Alert.alert('공유 문구 복사 완료', '카카오톡이나 단체 채팅방에 붙여넣을 수 있어요.');
          return;
        }
      }
      await Share.share({ message: shareText });
    } catch {
      Alert.alert('공유를 열 수 없어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  const resetDemo = () => {
    setState(initialState);
    setPassage('');
    setReflection('');
    setTab('dashboard');
  };

  const notificationStatusText = {
    unsupported: '현재 브라우저에서는 웹 푸시 알림을 지원하지 않습니다.',
    default: '알림 받기를 누르면 이 기기의 브라우저 권한 요청이 열립니다.',
    granted: '브라우저 알림 권한이 허용되었습니다. 구독 저장을 완료하려면 알림 받기를 눌러 주세요.',
    denied: '브라우저에서 알림이 차단되어 있습니다. 사이트 설정에서 알림 허용으로 변경해 주세요.',
    subscribed: '이 기기는 리마인드 알림 수신 대상으로 저장되었습니다.',
    'missing-key': 'Cloudflare Pages에 EXPO_PUBLIC_VAPID_PUBLIC_KEY 환경 변수를 추가해야 합니다.',
  }[notificationStatus];

  useEffect(() => {
    if (tab === 'superAdmin' && !isAppAdmin) {
      setTab('dashboard');
    }
  }, [isAppAdmin, tab]);

  const Onboarding = () => {
    const selectedJoinOrganization = state.organizations.find((organization) => organization.id === joinOrganizationId) ?? state.organizations[0];
    const joinDepartments = selectedJoinOrganization?.departments ?? [];

    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={[styles.onboardingScroll, isWide && styles.onboardingScrollWide]}>
          <View style={styles.onboardingHeader}>
            <Text style={styles.eyebrow}>성경읽기 챌린지 시작</Text>
            <Text style={[styles.title, isCompact && styles.titleCompact]}>단체를 만들거나{`\n`}소속 단체에 참여하세요.</Text>
          </View>

          <View style={styles.onboardingCard}>
            <View style={styles.segmented}>
              <Pressable style={[styles.segment, onboardingMode === 'join' && styles.segmentActive]} onPress={() => setOnboardingMode('join')}>
                <Text style={[styles.segmentText, onboardingMode === 'join' && styles.segmentTextActive]}>단체 참여</Text>
              </Pressable>
              <Pressable style={[styles.segment, onboardingMode === 'create' && styles.segmentActive]} onPress={() => setOnboardingMode('create')}>
                <Text style={[styles.segmentText, onboardingMode === 'create' && styles.segmentTextActive]}>단체 생성</Text>
              </Pressable>
            </View>

            {onboardingMode === 'create' ? (
              <View>
                <Text style={styles.fieldLabel}>단체명</Text>
                <TextInput value={organizationName} onChangeText={setOrganizationName} placeholder="예) 부산교회 청년회" placeholderTextColor="#8A969D" style={styles.input} />
                <Text style={styles.fieldLabel}>단체장 이름</Text>
                <TextInput value={ownerName} onChangeText={setOwnerName} placeholder="이름 입력" placeholderTextColor="#8A969D" style={styles.input} />

                <Text style={styles.fieldLabel}>월 목표 기준</Text>
                <View style={styles.segmented}>
                  <Pressable style={[styles.segment, targetMetric === 'members' && styles.segmentActive]} onPress={() => setTargetMetric('members')}>
                    <Text style={[styles.segmentText, targetMetric === 'members' && styles.segmentTextActive]}>월 목표 인원수</Text>
                  </Pressable>
                  <Pressable style={[styles.segment, targetMetric === 'chapters' && styles.segmentActive]} onPress={() => setTargetMetric('chapters')}>
                    <Text style={[styles.segmentText, targetMetric === 'chapters' && styles.segmentTextActive]}>월 목표 장수</Text>
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>부서 및 월 목표 {targetMetric === 'chapters' ? '장수' : '인원수'}</Text>
                {departmentDrafts.map((department) => (
                  <View key={department.id} style={styles.departmentDraftRow}>
                    <TextInput
                      value={department.name}
                      onChangeText={(name) => updateDepartmentDraft(department.id, { name })}
                      placeholder="부서명"
                      placeholderTextColor="#8A969D"
                      style={[styles.input, styles.departmentNameInput]}
                    />
                    <TextInput
                      value={department.monthlyTargetMembers}
                      onChangeText={(monthlyTargetMembers) => updateDepartmentDraft(department.id, { monthlyTargetMembers: monthlyTargetMembers.replace(/[^0-9]/g, '') })}
                      placeholder={targetMetric === 'chapters' ? '300' : '30'}
                      placeholderTextColor="#8A969D"
                      keyboardType="number-pad"
                      style={[styles.input, styles.departmentTargetInput]}
                    />
                    <Pressable style={styles.smallDangerButton} onPress={() => removeDepartmentDraft(department.id)}>
                      <Text style={styles.deleteButtonText}>삭제</Text>
                    </Pressable>
                  </View>
                ))}
                <Pressable style={styles.secondaryButton} onPress={addDepartmentDraft}>
                  <Text style={styles.secondaryButtonText}>부서 추가</Text>
                </Pressable>
                <Pressable style={styles.primaryButton} onPress={createOrganization}>
                  <Text style={styles.primaryButtonText}>단체 생성하기</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <Text style={styles.fieldLabel}>단체 선택</Text>
                <View style={styles.optionList}>
                  {state.organizations.map((organization) => (
                    <Pressable
                      key={organization.id}
                      style={[styles.optionRow, joinOrganizationId === organization.id && styles.optionRowActive]}
                      onPress={() => {
                        setJoinSelectionTouched(true);
                        setJoinOrganizationId(organization.id);
                        setJoinDepartmentId(organization.departments[0]?.id ?? '');
                      }}
                    >
                      <View>
                        <Text style={[styles.optionTitle, joinOrganizationId === organization.id && styles.optionTitleActive]}>{organization.name}</Text>
                        <Text style={styles.mutedText}>초대코드 {organization.inviteCode}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>부서 선택</Text>
                <View style={styles.segmentedWrap}>
                  {joinDepartments.map((department) => (
                    <Pressable
                      key={department.id}
                      style={[styles.segment, styles.segmentWrapItem, joinDepartmentId === department.id && styles.segmentActive]}
                      onPress={() => setJoinDepartmentId(department.id)}
                    >
                      <Text style={[styles.segmentText, joinDepartmentId === department.id && styles.segmentTextActive]}>{department.name}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>이름</Text>
                <TextInput value={joinMemberName} onChangeText={setJoinMemberName} placeholder="이름 입력" placeholderTextColor="#8A969D" style={styles.input} />
                <Pressable style={styles.primaryButton} onPress={joinOrganization}>
                  <Text style={styles.primaryButtonText}>가입하기</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  if (hydrated && !activeMember) {
    return Onboarding();
  }

  const Dashboard = () => (
    <ScrollView contentContainerStyle={[styles.scrollContent, isWide && styles.wideScroll]}>
      <View style={[styles.hero, isWide && styles.heroWide, isWide && styles.heroFocused]}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>{MONTH_LABEL} {currentOrganization.name} 성경읽기</Text>
        </View>
        <View style={styles.heroPanel}>
          <Text style={styles.panelKicker}>{myDepartment.name}</Text>
          <Text style={styles.heroNumber}>
            {currentDepartmentStats.count}
            <Text style={styles.heroUnit}> / {myDepartment.monthlyTargetMembers}{targetUnit}</Text>
          </Text>
          <ProgressBar value={currentDepartmentStats.count} total={myDepartment.monthlyTargetMembers} light />
          <Text style={styles.heroHelp}>목표까지 {currentDepartmentStats.remaining}{targetUnit} 남았습니다.</Text>
          <View style={styles.heroActions}>
            <Pressable
              hitSlop={8}
              style={({ pressed }) => [styles.heroCheckButton, pressed && styles.pressedButton]}
              onPress={() => setTab('check')}
            >
              <Text style={styles.heroCheckButtonText}>인증하기</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {currentAnnouncement?.body.trim() ? (
        <View style={styles.noticeBand}>
          <Text style={styles.noticeTitle}>{currentAnnouncement.title || '오늘 공지'}</Text>
          <Text style={styles.noticeBody}>{currentAnnouncement.body}</Text>
        </View>
      ) : null}

      <View style={styles.summaryBand}>
        <StatTile label="내 이번 달 인증" value={`${myLogs.length}회`} helper={checkedToday ? '오늘 인증 완료' : '오늘 인증 전'} />
        <StatTile label="연속 기록" value={`${currentStreak}일`} helper="매일 1회 기준" />
        <StatTile label={`이번 주 전체 ${targetCountLabel}`} value={`${weeklyCount}${targetUnit}`} helper="최근 7일 집계" />
        <StatTile label="단체 전체" value={`${totalCount}${targetUnit}`} helper={`${Math.max(0, totalTarget - totalCount)}${targetUnit} 남음`} />
      </View>

      <View style={[styles.twoColumn, isWide && styles.twoColumnWide]}>
        <View style={[styles.panel, isWide && styles.panelWide]}>
          <SectionHeader title="부서 진행률" action={`${MONTH_LABEL} ${targetNoun} 목표`} />
          {departmentStats.map((department, index) => (
            <Pressable
              key={department.id}
              style={[styles.departmentItem, index === departmentStats.length - 1 && styles.departmentItemLast]}
              onPress={() => setState((prev) => (prev.currentMember ? { ...prev, currentMember: { ...prev.currentMember, departmentId: department.id } } : prev))}
            >
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.departmentName}>{department.name}</Text>
                  <Text style={styles.mutedText}>월 목표 {department.monthlyTargetMembers}{targetUnit} · {department.participants}명 참여</Text>
                </View>
                <Text style={styles.cardValue}>{department.count}{targetUnit}</Text>
              </View>
              <ProgressBar value={department.count} total={department.monthlyTargetMembers} />
            </Pressable>
          ))}
        </View>

        <View style={[styles.panel, isWide && styles.panelWide]}>
          <SectionHeader title="최근 인증" action="최근순" />
          {recentLogs.length === 0 ? (
            <Text style={styles.emptyText}>아직 인증 기록이 없습니다.</Text>
          ) : (
            recentLogs.map((log) => (
              <View key={log.id} style={styles.feedItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{log.memberName.slice(0, 1)}</Text>
                </View>
                <View style={styles.feedBody}>
                  <Text style={styles.feedTitle}>{log.memberName} · {departments.find((department) => department.id === log.departmentId)?.name}</Text>
                  <Text style={styles.feedMeta}>
                    {formatDate(log.date)} · {log.passage ?? '성경 읽기 인증'}
                    {currentOrganization.targetMetric === 'chapters' ? ` · ${normalizeReadChapters(log.readChapters)}장` : ''}
                  </Text>
                </View>
                <Text style={styles.logBadge}>
                  +{currentOrganization.targetMetric === 'chapters' ? normalizeReadChapters(log.readChapters) : 1}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );

  const Check = () => (
    <ScrollView contentContainerStyle={[styles.scrollContent, isWide && styles.formScroll]}>
      <Text style={styles.eyebrow}>오늘 읽기 인증</Text>
      <View style={styles.checkCard}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>오늘 상태</Text>
            <Text style={styles.mutedText}>{formatDate(today)} · {activeMember?.name} · {myDepartment.name}</Text>
          </View>
          <Text style={[styles.statusPill, checkedToday && styles.statusPillDone]}>{checkedToday ? '완료' : '대기'}</Text>
        </View>

        {checkedToday && todayLog ? (
          <View style={styles.doneBox}>
            <Text style={styles.doneTitle}>오늘 인증이 저장되어 있습니다.</Text>
            <Text style={styles.doneText}>
              {todayLog.passage ?? '성경 읽기 인증'}
              {currentOrganization.targetMetric === 'chapters' ? ` · ${normalizeReadChapters(todayLog.readChapters)}장` : ''}
              {todayLog.reflection ? ` · ${todayLog.reflection}` : ''}
            </Text>
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>읽은 본문</Text>
        <Pressable
          hitSlop={8}
          style={({ pressed }) => [styles.bookSelectButton, pressed && styles.pressedSurface]}
          onPress={() => setBookPickerOpen(true)}
        >
          <View>
            <Text style={styles.bookSelectLabel}>성경 권 선택</Text>
            <Text style={styles.bookSelectValue}>{selectedBibleBook?.name ?? '목록에서 선택하세요'}</Text>
          </View>
          <Text style={styles.bookSelectArrow}>⌄</Text>
        </Pressable>
        <View style={styles.chapterSelectBlock}>
          <View style={styles.chapterSelectHeader}>
            <Text style={styles.chapterSelectTitle}>장 선택</Text>
            <Text style={styles.chapterSelectHint}>
              {selectedBibleBook ? `1장 - ${selectedBibleBook.chapters}장` : '성경 권을 먼저 선택하세요'}
            </Text>
          </View>
          {selectedBibleBook ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chapterList}>
              {Array.from({ length: selectedBibleBook.chapters }, (_, index) => index + 1).map((chapter) => (
                <Pressable
                  key={`${selectedBibleBook.name}-${chapter}`}
                  style={[styles.chapterChip, selectedChapter === chapter && styles.chapterChipActive]}
                  onPress={() => selectBibleChapter(chapter)}
                >
                  <Text style={[styles.chapterChipText, selectedChapter === chapter && styles.chapterChipTextActive]}>{chapter}장</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.chapterEmptyBox}>
              <Text style={styles.chapterEmptyText}>권을 선택하면 장 목록이 표시됩니다.</Text>
            </View>
          )}
        </View>
        <TextInput value={passage} onChangeText={setPassage} placeholder="예) 요한복음 3장" placeholderTextColor="#8A969D" style={styles.input} />

        {currentOrganization.targetMetric === 'chapters' ? (
          <View>
            <Text style={styles.fieldLabel}>오늘 읽은 장수</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chapterList}>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                <Pressable
                  key={`read-chapters-${count}`}
                  style={[styles.chapterChip, Number(readChapters) === count && styles.chapterChipActive]}
                  onPress={() => setReadChapters(String(count))}
                >
                  <Text style={[styles.chapterChipText, Number(readChapters) === count && styles.chapterChipTextActive]}>{count}장</Text>
                </Pressable>
              ))}
            </ScrollView>
            <TextInput
              value={readChapters}
              onChangeText={(value) => setReadChapters(value.replace(/[^0-9]/g, ''))}
              placeholder="오늘 읽은 장수 입력"
              placeholderTextColor="#8A969D"
              keyboardType="number-pad"
              style={[styles.input, styles.readChaptersInput]}
            />
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>한 줄 묵상(선택)</Text>
        <TextInput
          value={reflection}
          onChangeText={setReflection}
          placeholder="오늘 마음에 남은 말씀이나 결심"
          placeholderTextColor="#8A969D"
          style={[styles.input, styles.textArea]}
          multiline
        />

        <Pressable
          hitSlop={8}
          style={({ pressed }) => [styles.primaryButton, checkedToday && styles.disabledButton, pressed && styles.pressedButton]}
          onPress={checkToday}
        >
          <Text style={styles.primaryButtonText}>{checkedToday ? '오늘 인증 완료' : '읽었습니다 저장'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const TodayReflections = () => (
    <ScrollView contentContainerStyle={[styles.scrollContent, isWide && styles.wideScroll]}>
      <Text style={styles.eyebrow}>오늘의 묵상글</Text>
      <Text style={styles.subtitle}>오늘 인증할 때 작성한 묵상글만 표시됩니다. 자정이 지나면 다음 날 목록으로 자동 초기화됩니다.</Text>

      <View style={styles.panel}>
        <SectionHeader title="오늘 올라온 묵상" action={`${todayReflections.length}개`} />
        {todayReflections.length === 0 ? (
          <Text style={styles.emptyText}>아직 오늘 작성된 묵상글이 없습니다.</Text>
        ) : (
          todayReflections.map((log) => (
            <Pressable
              key={log.id}
              hitSlop={4}
              style={({ pressed }) => [styles.reflectionItem, pressed && styles.pressedSurface]}
              onPress={() => setSelectedLog(log)}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.feedBody}>
                  <Text style={styles.feedTitle}>{log.memberName} · {departments.find((department) => department.id === log.departmentId)?.name}</Text>
                  <Text style={styles.feedMeta}>
                    {log.passage ?? '성경 읽기 인증'}
                    {currentOrganization.targetMetric === 'chapters' ? ` · ${normalizeReadChapters(log.readChapters)}장` : ''}
                  </Text>
                </View>
                {isReflectionAdmin ? (
                  <Pressable
                    style={styles.deleteButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      confirmRemoveLog(log);
                    }}
                  >
                    <Text style={styles.deleteButtonText}>삭제</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.logBadge}>{formatDate(log.date)}</Text>
                )}
              </View>
              <Text style={styles.reflectionText}>{log.reflection}</Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );

  const Records = () => (
    <ScrollView contentContainerStyle={[styles.scrollContent, isWide && styles.formScroll]}>
      <Text style={styles.eyebrow}>내 기록</Text>
      <Text style={[styles.title, isCompact && styles.titleCompact]}>이번 달 {myLogs.length}번 인증했습니다.</Text>
      <View style={styles.statGridCompact}>
        <StatTile label="연속 기록" value={`${currentStreak}일`} />
        <StatTile label="소속 부서" value={myDepartment.name} />
      </View>

      <View style={styles.panel}>
        <SectionHeader title="인증 기록" action="기기 저장" />
        {myLogs.length === 0 ? (
          <Text style={styles.emptyText}>아직 내 인증 기록이 없습니다.</Text>
        ) : (
          myLogs.map((log) => (
            <Pressable
              key={log.id}
              hitSlop={4}
              style={({ pressed }) => [styles.recordItem, pressed && styles.pressedSurface]}
              onPress={() => setSelectedLog(log)}
            >
              <View style={styles.recordDateBox}>
                <Text style={styles.recordDate}>{formatDate(log.date)}</Text>
              </View>
              <View style={styles.recordBody}>
                <Text style={styles.recordTitle}>
                  {log.passage ?? '성경 읽기 인증'}
                  {currentOrganization.targetMetric === 'chapters' ? ` · ${normalizeReadChapters(log.readChapters)}장` : ''}
                </Text>
                {log.reflection ? <Text numberOfLines={2} style={styles.recordReflection}>{log.reflection}</Text> : null}
              </View>
              <Pressable
                style={styles.deleteButton}
                onPress={(event) => {
                  event.stopPropagation();
                  removeLog(log.id);
                }}
              >
                <Text style={styles.deleteButtonText}>삭제</Text>
              </Pressable>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );

  const Admin = () => (
    <ScrollView contentContainerStyle={[styles.scrollContent, isWide && styles.formScroll]}>
      <Text style={styles.eyebrow}>운영 설정</Text>
      <View style={styles.panel}>
        <SectionHeader title="내 프로필" />
        <Text style={styles.fieldLabel}>이름</Text>
        <TextInput
          value={activeMember?.name ?? ''}
          onChangeText={(name) => setState((prev) => (prev.currentMember ? { ...prev, currentMember: { ...prev.currentMember, name } } : prev))}
          style={styles.input}
        />
        <Text style={styles.fieldLabel}>소속 부서</Text>
        <View style={styles.segmented}>
          {departments.map((department) => (
            <Pressable
              key={department.id}
              style={[styles.segment, myDepartment.id === department.id && styles.segmentActive]}
              onPress={() => setState((prev) => (prev.currentMember ? { ...prev, currentMember: { ...prev.currentMember, departmentId: department.id } } : prev))}
            >
              <Text style={[styles.segmentText, myDepartment.id === department.id && styles.segmentTextActive]}>{department.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.panel}>
        <SectionHeader title="알림 설정" />
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>매일 읽기 리마인드</Text>
            <Text style={styles.settingSub}>설정한 시간에 이 기기로 안내</Text>
          </View>
          <Switch value={state.reminders.daily} onValueChange={(daily) => setState((prev) => ({ ...prev, reminders: { ...prev.reminders, daily } }))} />
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>하루 알림 횟수</Text>
            <Text style={styles.settingSub}>하루 최대 3회까지 설정 가능</Text>
          </View>
          <View style={styles.countStepper}>
            {REMINDER_COUNT_OPTIONS.map((count) => (
              <Pressable
                key={count}
                style={[styles.countButton, normalizeReminderCount(state.reminders.count) === count && styles.countButtonActive]}
                onPress={() => updateReminderCount(count)}
              >
                <Text style={[styles.countButtonText, normalizeReminderCount(state.reminders.count) === count && styles.countButtonTextActive]}>{count}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.settingBlock}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>알림 시간</Text>
            <Text style={styles.settingSub}>24시간 형식으로 입력해 주세요. 예) 21:00</Text>
          </View>
          <View style={styles.timeInputGrid}>
            {normalizeReminderTimes(state.reminders.times, normalizeReminderCount(state.reminders.count)).map((time, index) => (
              <View key={`reminder-time-${index}`} style={styles.timeInputWrap}>
                <Text style={styles.timeInputLabel}>{index + 1}회차</Text>
                <TextInput
                  value={time}
                  onChangeText={(value) => updateReminderTime(index, value)}
                  onBlur={() => commitReminderTime(index)}
                  placeholder={DEFAULT_REMINDER_TIMES[index] ?? '21:00'}
                  placeholderTextColor="#8A969D"
                  keyboardType="numbers-and-punctuation"
                  style={[styles.input, styles.timeInput]}
                />
              </View>
            ))}
          </View>
        </View>
        <Pressable style={styles.secondaryButton} onPress={requestNotifications}>
          <Text style={styles.secondaryButtonText}>알림 설정 저장</Text>
        </Pressable>
        <Text style={styles.notificationHelp}>{notificationStatusText}</Text>
      </View>

      <View style={styles.panel}>
        <SectionHeader title="운영 도구" />
        <Pressable style={styles.secondaryButton} onPress={share}>
          <Text style={styles.secondaryButtonText}>공유 문구 복사</Text>
        </Pressable>
        <Pressable style={styles.dangerButton} onPress={resetDemo}>
          <Text style={styles.dangerButtonText}>데모 데이터 초기화</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const SuperAdmin = () => (
    <ScrollView contentContainerStyle={[styles.scrollContent, isWide && styles.formScroll]}>
      <Text style={styles.eyebrow}>관리자</Text>
      <Text style={[styles.title, isCompact && styles.titleCompact]}>운영 관리</Text>
      <Text style={styles.subtitle}>권진호 관리자 계정에서만 보이는 화면입니다. 관리자 코드 입력 후 단체, 부서, 가입자, 인증 기록, 홈 공지를 관리할 수 있습니다.</Text>

      <View style={styles.panel}>
        <SectionHeader title="관리자 권한" action="필수" />
        <Text style={styles.fieldLabel}>관리자 코드</Text>
        <TextInput
          value={adminDeleteCode}
          onChangeText={setAdminDeleteCode}
          placeholder="관리자 코드 입력"
          placeholderTextColor="#8A969D"
          secureTextEntry
          style={styles.input}
        />
      </View>

      <View style={styles.summaryBand}>
        <StatTile label="오늘 인증" value={`${organizationLogs.filter((log) => log.date === today).length}회`} />
        <StatTile label="가입자" value={`${organizationMembers.length}명`} />
        <StatTile label="부서" value={`${departments.length}개`} />
        <StatTile label="전체 진행" value={`${totalCount}${targetUnit}`} helper={`${totalTarget}${targetUnit} 목표`} />
      </View>

      <View style={styles.panel}>
        <SectionHeader title="홈 공지" action="첫 화면 노출" />
        <Text style={styles.fieldLabel}>공지 제목</Text>
        <TextInput value={announcementTitle} onChangeText={setAnnouncementTitle} placeholder="예) 오늘의 읽기 안내" placeholderTextColor="#8A969D" style={styles.input} />
        <Text style={styles.fieldLabel}>공지 내용</Text>
        <TextInput
          value={announcementBody}
          onChangeText={setAnnouncementBody}
          placeholder="홈 화면에 표시할 공지를 입력하세요."
          placeholderTextColor="#8A969D"
          style={[styles.input, styles.textArea]}
          multiline
        />
        <Pressable style={styles.primaryButton} onPress={saveAnnouncement}>
          <Text style={styles.primaryButtonText}>공지 저장</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <SectionHeader title="현재 단체 기본정보" action={currentOrganization.name} />
        <Text style={styles.fieldLabel}>단체명</Text>
        <TextInput value={adminOrgName} onChangeText={setAdminOrgName} placeholder="단체명" placeholderTextColor="#8A969D" style={styles.input} />
        <Text style={styles.fieldLabel}>초대코드</Text>
        <TextInput value={adminInviteCode} onChangeText={setAdminInviteCode} placeholder="초대코드" placeholderTextColor="#8A969D" style={styles.input} />
        <Text style={styles.fieldLabel}>단체장 이름</Text>
        <TextInput value={adminOwnerName} onChangeText={setAdminOwnerName} placeholder="단체장 이름" placeholderTextColor="#8A969D" style={styles.input} />
        <Text style={styles.fieldLabel}>월 목표 기준</Text>
        <View style={styles.segmented}>
          <Pressable style={[styles.segment, adminTargetMetric === 'members' && styles.segmentActive]} onPress={() => setAdminTargetMetric('members')}>
            <Text style={[styles.segmentText, adminTargetMetric === 'members' && styles.segmentTextActive]}>인원수</Text>
          </Pressable>
          <Pressable style={[styles.segment, adminTargetMetric === 'chapters' && styles.segmentActive]} onPress={() => setAdminTargetMetric('chapters')}>
            <Text style={[styles.segmentText, adminTargetMetric === 'chapters' && styles.segmentTextActive]}>장수</Text>
          </Pressable>
        </View>
        <Pressable style={styles.primaryButton} onPress={saveOrganizationSettings}>
          <Text style={styles.primaryButtonText}>단체 정보 저장</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <SectionHeader title="부서 관리" action={`월 목표 ${targetNoun}`} />
        {departments.map((department) => (
          <View key={department.id} style={styles.adminOrganizationItem}>
            <View style={styles.adminEditRow}>
              <TextInput
                value={department.name}
                onChangeText={(name) => setState((prev) => ({
                  ...prev,
                  organizations: prev.organizations.map((organization) => (
                    organization.id === currentOrganization.id
                      ? { ...organization, departments: organization.departments.map((item) => (item.id === department.id ? { ...item, name } : item)) }
                      : organization
                  )),
                }))}
                placeholder="부서명"
                placeholderTextColor="#8A969D"
                style={[styles.input, styles.adminNameInput]}
              />
              <TextInput
                value={String(department.monthlyTargetMembers)}
                onChangeText={(monthlyTargetMembers) => setState((prev) => ({
                  ...prev,
                  organizations: prev.organizations.map((organization) => (
                    organization.id === currentOrganization.id
                      ? {
                        ...organization,
                        departments: organization.departments.map((item) => (
                          item.id === department.id ? { ...item, monthlyTargetMembers: Math.max(1, Number(monthlyTargetMembers.replace(/[^0-9]/g, '')) || 1) } : item
                        )),
                      }
                      : organization
                  )),
                }))}
                keyboardType="number-pad"
                placeholder="목표"
                placeholderTextColor="#8A969D"
                style={[styles.input, styles.adminTargetInput]}
              />
            </View>
            <View style={styles.adminActionRow}>
              <Pressable style={styles.secondaryButton} onPress={() => saveDepartment(department)}>
                <Text style={styles.secondaryButtonText}>저장</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={() => removeDepartment(department)}>
                <Text style={styles.deleteButtonText}>삭제</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <View style={styles.adminEditRow}>
          <TextInput value={newDepartmentName} onChangeText={setNewDepartmentName} placeholder="새 부서명" placeholderTextColor="#8A969D" style={[styles.input, styles.adminNameInput]} />
          <TextInput value={newDepartmentTarget} onChangeText={(value) => setNewDepartmentTarget(value.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="목표" placeholderTextColor="#8A969D" style={[styles.input, styles.adminTargetInput]} />
        </View>
        <Pressable style={styles.primaryButton} onPress={addAdminDepartment}>
          <Text style={styles.primaryButtonText}>부서 추가</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <SectionHeader title="가입자 관리" action={`${organizationMembers.length}명`} />
        {organizationMembers.length === 0 ? (
          <Text style={styles.emptyText}>가입자가 없습니다.</Text>
        ) : (
          organizationMembers.map((member) => (
            <View key={member.id} style={styles.adminOrganizationItem}>
              <TextInput
                value={member.name}
                onChangeText={(name) => setState((prev) => ({
                  ...prev,
                  members: prev.members.map((item) => (item.id === member.id ? { ...item, name } : item)),
                  currentMember: prev.currentMember?.id === member.id ? { ...prev.currentMember, name } : prev.currentMember,
                }))}
                placeholder="이름"
                placeholderTextColor="#8A969D"
                style={styles.input}
              />
              <View style={styles.segmentedWrap}>
                {departments.map((department) => (
                  <Pressable
                    key={`${member.id}-${department.id}`}
                    style={[styles.segment, styles.segmentWrapItem, member.departmentId === department.id && styles.segmentActive]}
                    onPress={() => setState((prev) => ({
                      ...prev,
                      members: prev.members.map((item) => (item.id === member.id ? { ...item, departmentId: department.id } : item)),
                      currentMember: prev.currentMember?.id === member.id ? { ...prev.currentMember, departmentId: department.id } : prev.currentMember,
                    }))}
                  >
                    <Text style={[styles.segmentText, member.departmentId === department.id && styles.segmentTextActive]}>{department.name}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.adminActionRow}>
                <Pressable style={styles.secondaryButton} onPress={() => saveMember(member)}>
                  <Text style={styles.secondaryButtonText}>저장</Text>
                </Pressable>
                <Pressable style={styles.deleteButton} onPress={() => removeMember(member)}>
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.panel}>
        <SectionHeader title="최근 인증 관리" action="최근 20개" />
        {adminRecentLogs.length === 0 ? (
          <Text style={styles.emptyText}>인증 기록이 없습니다.</Text>
        ) : (
          adminRecentLogs.map((log) => (
            <View key={log.id} style={styles.adminOrganizationItem}>
              <Text style={styles.feedTitle}>{formatDate(log.date)} · {log.memberName}</Text>
              <TextInput
                value={log.passage ?? ''}
                onChangeText={(passageText) => setState((prev) => ({
                  ...prev,
                  logs: prev.logs.map((item) => (item.id === log.id ? { ...item, passage: passageText } : item)),
                }))}
                placeholder="읽은 본문"
                placeholderTextColor="#8A969D"
                style={styles.input}
              />
              {currentOrganization.targetMetric === 'chapters' ? (
                <TextInput
                  value={String(normalizeReadChapters(log.readChapters))}
                  onChangeText={(value) => setState((prev) => ({
                    ...prev,
                    logs: prev.logs.map((item) => (item.id === log.id ? { ...item, readChapters: normalizeReadChapters(value) } : item)),
                  }))}
                  keyboardType="number-pad"
                  placeholder="읽은 장수"
                  placeholderTextColor="#8A969D"
                  style={[styles.input, styles.readChaptersInput]}
                />
              ) : null}
              <TextInput
                value={log.reflection ?? ''}
                onChangeText={(reflectionText) => setState((prev) => ({
                  ...prev,
                  logs: prev.logs.map((item) => (item.id === log.id ? { ...item, reflection: reflectionText } : item)),
                }))}
                placeholder="묵상글"
                placeholderTextColor="#8A969D"
                style={[styles.input, styles.textArea]}
                multiline
              />
              <View style={styles.adminActionRow}>
                <Pressable style={styles.secondaryButton} onPress={() => saveAdminLog(log)}>
                  <Text style={styles.secondaryButtonText}>저장</Text>
                </Pressable>
                <Pressable style={styles.deleteButton} onPress={() => removeAdminLog(log)}>
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.panel}>
        <SectionHeader title="단체 목록" action={`${state.organizations.length}개`} />
        {state.organizations.length === 0 ? (
          <Text style={styles.emptyText}>등록된 단체가 없습니다.</Text>
        ) : (
          state.organizations.map((organization) => {
            const logCount = state.logs.filter((log) => log.organizationId === organization.id).length;
            const metricLabel = organization.targetMetric === 'chapters' ? '장수' : '인원수';

            return (
              <View key={organization.id} style={styles.adminOrganizationItem}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.feedBody}>
                    <Text style={styles.feedTitle}>{organization.name}</Text>
                    <Text style={styles.feedMeta}>
                      부서 {organization.departments.length}개 · 목표 기준 {metricLabel} · 인증 {logCount}개
                    </Text>
                    <Text style={styles.mutedText}>초대코드 {organization.inviteCode}</Text>
                  </View>
                  <Pressable style={styles.deleteButton} onPress={() => confirmRemoveOrganization(organization)}>
                    <Text style={styles.deleteButtonText}>단체 삭제</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );

  const content = tab === 'dashboard'
    ? Dashboard()
    : tab === 'check'
      ? Check()
      : tab === 'departments'
        ? TodayReflections()
        : tab === 'records'
          ? Records()
          : tab === 'superAdmin'
            ? SuperAdmin()
            : Admin();

  const navItems: Array<{ key: Tab; label: string; short: string; icon: string }> = [
    { key: 'dashboard', label: '대시보드', short: '홈', icon: '⌂' },
    { key: 'check', label: '오늘 인증', short: '인증', icon: '+' },
    { key: 'departments', label: '오늘의 묵상글', short: '묵상', icon: '▦' },
    { key: 'records', label: '내 기록', short: '기록', icon: '◷' },
    { key: 'admin', label: '운영 설정', short: '설정', icon: '⋯' },
    ...(isAppAdmin ? [{ key: 'superAdmin' as const, label: '관리자', short: '관리', icon: '!' }] : []),
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.appShell}>
        {isWide ? (
          <View style={styles.sidebar}>
            <Text style={styles.brand}>성경읽기 챌린지</Text>
            <Text style={styles.brandSub}>Youth Bible Reading</Text>
            <View style={styles.sidebarNav}>
              {navItems.map((item) => (
                <Pressable
                  key={item.key}
                  hitSlop={6}
                  style={({ pressed }) => [styles.sidebarItem, tab === item.key && styles.sidebarItemActive, pressed && styles.pressedSurface]}
                  onPress={() => setTab(item.key)}
                >
                  <Text style={[styles.sidebarText, tab === item.key && styles.sidebarTextActive]}>{item.icon}  {item.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.sidebarProfile}>
              <Text style={styles.profileName}>{activeMember?.name}</Text>
              <Text style={styles.profileMeta}>{myDepartment.name} · {checkedToday ? '오늘 완료' : '오늘 대기'}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.mainArea}>
          <View style={styles.topbar}>
            <View>
              <Text style={styles.appTitle}>성경읽기 챌린지</Text>
              <Text style={styles.appMeta}>{currentOrganization.name} · {myDepartment.name} · {MONTH_LABEL}</Text>
            </View>
            <Pressable hitSlop={8} style={({ pressed }) => [styles.profileButton, pressed && styles.pressedButton]} onPress={() => setProfileOpen(true)}>
              <Text style={styles.profileButtonText}>{activeMember?.name.slice(0, 1)}</Text>
            </Pressable>
          </View>
          <View style={styles.screen}>{content}</View>
          {!isWide ? (
            <View style={styles.tabbar}>
              {navItems.map((item) => (
                <Pressable
                  key={item.key}
                  hitSlop={6}
                  style={({ pressed }) => [styles.tabItem, tab === item.key && styles.tabItemActive, pressed && styles.pressedSurface]}
                  onPress={() => setTab(item.key)}
                >
                  <Text style={[styles.tabIcon, tab === item.key && styles.tabActive]}>{item.icon}</Text>
                  <Text style={[styles.tabLabel, tab === item.key && styles.tabActive]}>{item.short}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <Modal transparent visible={completedModal} animationType="fade" onRequestClose={() => setCompletedModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>오늘 인증 완료</Text>
            <Text style={styles.modalCount}>{myDepartment.name} 누적 {currentDepartmentStats.count} / {myDepartment.monthlyTargetMembers}{targetUnit}</Text>
            <Text style={styles.modalText}>오늘의 기록이 저장되었습니다. 부서 목표 현황도 함께 갱신됐습니다.</Text>
            <Pressable style={styles.primaryButton} onPress={() => { setCompletedModal(false); setTab('dashboard'); }}>
              <Text style={styles.primaryButtonText}>대시보드 보기</Text>
            </Pressable>
            <Pressable style={styles.outlineButton} onPress={share}>
              <Text style={styles.outlineButtonText}>공유 문구 복사</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={profileOpen} animationType="fade" onRequestClose={() => setProfileOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setProfileOpen(false)}>
          <View style={styles.profileModal}>
            <Text style={styles.modalTitle}>프로필</Text>
            <Text style={styles.modalText}>{activeMember?.name} · {currentOrganization.name} · {myDepartment.name}</Text>
            <Pressable style={styles.primaryButton} onPress={() => { setProfileOpen(false); setTab('admin'); }}>
              <Text style={styles.primaryButtonText}>설정 열기</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal transparent visible={selectedLog !== null} animationType="fade" onRequestClose={() => setSelectedLog(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.recordModalCard}>
            <View style={styles.recordModalHeader}>
              <View style={styles.recordModalTitleWrap}>
                <Text style={styles.modalTitle}>인증 기록</Text>
                <Text style={styles.modalTextTight}>
                  {selectedLog ? `${formatDate(selectedLog.date)} · ${departments.find((department) => department.id === selectedLog.departmentId)?.name ?? ''}` : ''}
                </Text>
              </View>
              <Pressable hitSlop={10} style={styles.closeButton} onPress={() => setSelectedLog(null)}>
                <Text style={styles.closeButtonText}>닫기</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.recordModalScroll} contentContainerStyle={styles.recordModalContent}>
              <Text style={styles.recordDetailLabel}>읽은 본문</Text>
              <Text style={styles.recordDetailTitle}>{selectedLog?.passage ?? '성경 읽기 인증'}</Text>
              {currentOrganization.targetMetric === 'chapters' ? (
                <>
                  <Text style={styles.recordDetailLabel}>읽은 장수</Text>
                  <Text style={styles.recordDetailText}>{normalizeReadChapters(selectedLog?.readChapters)}장</Text>
                </>
              ) : null}
              <Text style={styles.recordDetailLabel}>묵상글</Text>
              <Text style={styles.recordDetailText}>{selectedLog?.reflection?.trim() || '작성된 묵상글이 없습니다.'}</Text>
            </ScrollView>
            {selectedLog && canDeleteSelectedLog ? (
              <Pressable style={styles.dangerButton} onPress={() => confirmRemoveLog(selectedLog)}>
                <Text style={styles.dangerButtonText}>묵상글 삭제</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal transparent visible={bookPickerOpen} animationType="slide" onRequestClose={() => setBookPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.bookModalCard}>
            <View style={styles.bookModalHeader}>
              <View>
                <Text style={styles.modalTitle}>성경 권 선택</Text>
                <Text style={styles.bookModalSub}>읽은 본문을 목록에서 선택하세요.</Text>
              </View>
              <Pressable hitSlop={10} style={styles.closeButton} onPress={() => setBookPickerOpen(false)}>
                <Text style={styles.closeButtonText}>닫기</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.bookList} contentContainerStyle={styles.bookListContent}>
              {bibleBooks.map((book) => {
                const selected = passage.startsWith(book.name);
                return (
                  <Pressable
                    key={book.name}
                    style={({ pressed }) => [styles.bookRow, selected && styles.bookRowSelected, pressed && styles.pressedSurface]}
                    onPress={() => selectBibleBook(book)}
                  >
                    <View style={styles.bookRowMain}>
                      <Text numberOfLines={1} style={[styles.bookRowText, selected && styles.bookRowTextSelected]}>{book.name}</Text>
                      <Text style={styles.bookRowSub}>{book.chapters}장</Text>
                    </View>
                    {selected ? <Text style={styles.bookRowCheck}>선택됨</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {!hydrated ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <Text style={styles.loadingTitle}>성경읽기 챌린지</Text>
            <Text style={styles.loadingText}>기록을 불러오는 중입니다.</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5FAFD' },
  appShell: { flex: 1, flexDirection: 'row', backgroundColor: '#F5FAFD' },
  sidebar: { width: 260, backgroundColor: '#1B6F95', paddingHorizontal: 20, paddingVertical: 26 },
  brand: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  brandSub: { color: '#B9D6CD', fontSize: 12, fontWeight: '700', marginTop: 6 },
  sidebarNav: { marginTop: 30, gap: 6 },
  sidebarItem: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 8 },
  sidebarItemActive: { backgroundColor: '#EDF6F2' },
  sidebarText: { color: '#D8E9E3', fontSize: 15, fontWeight: '800' },
  sidebarTextActive: { color: '#1B6F95' },
  sidebarProfile: { marginTop: 'auto', backgroundColor: '#1E5A4D', borderRadius: 8, padding: 15 },
  profileName: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  profileMeta: { color: '#C5DBD4', fontSize: 12, fontWeight: '700', marginTop: 5 },
  mainArea: { flex: 1, minWidth: 0 },
  topbar: {
    minHeight: 66,
    paddingHorizontal: 22,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5FAFD',
    borderBottomWidth: 1,
    borderBottomColor: '#DDEAF1',
  },
  appTitle: { color: '#163140', fontSize: 18, fontWeight: '900' },
  appMeta: { color: '#667985', fontSize: 12, fontWeight: '700', marginTop: 3 },
  profileButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2F9FDB', alignItems: 'center', justifyContent: 'center', shadowColor: '#1B6F95', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  profileButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  screen: { flex: 1 },
  onboardingScroll: { padding: 20, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  onboardingScrollWide: { maxWidth: 720, width: '100%', alignSelf: 'center' },
  onboardingHeader: { marginBottom: 18 },
  onboardingCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 20, shadowColor: '#1E4E66', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  departmentDraftRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  departmentNameInput: { flex: 1, minWidth: 0 },
  departmentTargetInput: { width: 92 },
  smallDangerButton: { minHeight: 52, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F7E7E4', alignItems: 'center', justifyContent: 'center' },
  optionList: { gap: 8 },
  optionRow: { minHeight: 62, borderRadius: 8, borderWidth: 1, borderColor: '#D7E7EF', paddingHorizontal: 14, paddingVertical: 11, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  optionRowActive: { borderColor: '#2F9FDB', backgroundColor: '#F1FAFF' },
  optionTitle: { color: '#142A36', fontSize: 15, fontWeight: '900' },
  optionTitleActive: { color: '#2F9FDB' },
  segmentedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segmentWrapItem: { minWidth: 96, flexGrow: 1 },
  scrollContent: { padding: 18, paddingBottom: 128, flexGrow: 1 },
  wideScroll: { padding: 32, paddingBottom: 44, maxWidth: 1120, width: '100%', alignSelf: 'center' },
  formScroll: { padding: 28, paddingBottom: 40, maxWidth: 760, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center', paddingTop: 10, paddingBottom: 8 },
  heroWide: { justifyContent: 'center', paddingVertical: 44 },
  heroFocused: { minHeight: 430 },
  heroCopy: { width: '100%', maxWidth: 620, alignItems: 'center' },
  eyebrow: { color: '#53717F', fontSize: 14, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  title: { color: '#102836', fontSize: 32, lineHeight: 40, fontWeight: '900' },
  titleCompact: { fontSize: 28, lineHeight: 36 },
  subtitle: { color: '#5F7480', fontSize: 16, lineHeight: 25, marginTop: 14 },
  heroActions: { marginTop: 18, alignItems: 'center' },
  heroPanel: {
    width: '100%',
    maxWidth: 620,
    minWidth: 260,
    backgroundColor: '#2F9FDB',
    borderRadius: 8,
    padding: 24,
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#176D96',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  panelKicker: { color: '#DFF3FD', fontSize: 14, fontWeight: '800' },
  panelKickerDark: { color: '#15516F', fontSize: 14, fontWeight: '900' },
  heroNumber: { color: '#FFFFFF', fontSize: 46, fontWeight: '900', marginTop: 12 },
  heroUnit: { color: '#DFF3FD', fontSize: 18, fontWeight: '800' },
  heroHelp: { color: '#EAF8FE', fontSize: 13, fontWeight: '700', marginTop: 12 },
  primaryButton: { backgroundColor: '#2F9FDB', paddingVertical: 16, paddingHorizontal: 18, borderRadius: 8, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  heroCheckButton: {
    backgroundColor: '#2F9FDB',
    borderWidth: 1,
    borderColor: '#8BD0F2',
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
    minHeight: 54,
    width: '100%',
    maxWidth: 260,
    shadowColor: '#0C4C69',
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  heroCheckButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  pressedButton: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  pressedSurface: { opacity: 0.72 },
  secondaryButton: { backgroundColor: '#EAF7FE', paddingVertical: 15, paddingHorizontal: 18, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#2F9FDB', fontSize: 15, fontWeight: '900' },
  disabledButton: { backgroundColor: '#8AAFC2' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  summaryBand: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#D8E8F0',
  },
  noticeBand: {
    backgroundColor: '#EAF7FE',
    borderLeftWidth: 4,
    borderLeftColor: '#2F9FDB',
    borderRadius: 8,
    padding: 16,
    marginTop: 14,
  },
  noticeTitle: { color: '#15516F', fontSize: 15, fontWeight: '900' },
  noticeBody: { color: '#263F4D', fontSize: 14, fontWeight: '700', lineHeight: 22, marginTop: 7 },
  statGridCompact: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 14 },
  statTile: { flex: 1, minWidth: 150, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 17, shadowColor: '#1E4E66', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  statLabel: { color: '#667A86', fontSize: 12, fontWeight: '800' },
  statValue: { color: '#102A3A', fontSize: 26, fontWeight: '900', marginTop: 8 },
  statHelper: { color: '#718692', fontSize: 12, fontWeight: '700', marginTop: 6 },
  twoColumn: { gap: 14, marginTop: 14 },
  twoColumnWide: { flexDirection: 'row', alignItems: 'flex-start' },
  panel: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 18, marginTop: 16, shadowColor: '#1E4E66', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2, overflow: 'visible' },
  panelWide: { flex: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: '#142A36', fontSize: 18, fontWeight: '900' },
  sectionAction: { color: '#748893', fontSize: 12, fontWeight: '800' },
  departmentItem: { minHeight: 82, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#E7F0F5' },
  departmentItemLast: { borderBottomWidth: 0, paddingBottom: 4 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  departmentName: { color: '#142A36', fontSize: 16, fontWeight: '900' },
  mutedText: { color: '#657B87', fontSize: 12, fontWeight: '700', marginTop: 4 },
  cardValue: { color: '#1F3B4A', fontSize: 15, fontWeight: '900' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  progressTrack: { flex: 1, height: 10, borderRadius: 10, overflow: 'hidden', backgroundColor: '#D7E7EF' },
  progressTrackLight: { backgroundColor: '#CFEAF8' },
  progressFill: { height: '100%', borderRadius: 10, backgroundColor: '#E9B44C' },
  progressPct: { width: 40, marginLeft: 10, color: '#536B77', fontSize: 12, fontWeight: '900', textAlign: 'right' },
  progressPctLight: { color: '#FFFFFF' },
  feedItem: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#E7F0F5' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#DDF1FC', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#2F9FDB', fontSize: 16, fontWeight: '900' },
  feedBody: { flex: 1, minWidth: 0 },
  feedTitle: { color: '#183542', fontSize: 14, fontWeight: '900' },
  feedMeta: { color: '#71807B', fontSize: 12, fontWeight: '700', marginTop: 3 },
  logBadge: { color: '#2F9FDB', backgroundColor: '#EAF7FE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, overflow: 'hidden', fontSize: 12, fontWeight: '900' },
  reflectionItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E7F0F5' },
  reflectionText: { color: '#263F4D', fontSize: 15, fontWeight: '700', lineHeight: 24, marginTop: 12 },
  checkCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 18, marginTop: 22, shadowColor: '#1E4E66', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  cardTitle: { color: '#142A36', fontSize: 16, fontWeight: '900' },
  statusPill: { color: '#2F9FDB', backgroundColor: '#EAF7FE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, overflow: 'hidden', fontSize: 12, fontWeight: '900' },
  statusPillDone: { color: '#7A5610', backgroundColor: '#FFF2CF' },
  doneBox: { backgroundColor: '#F1FAFF', borderRadius: 8, padding: 12, marginTop: 16 },
  doneTitle: { color: '#2F9FDB', fontSize: 14, fontWeight: '900' },
  doneText: { color: '#58717D', fontSize: 13, fontWeight: '700', marginTop: 5, lineHeight: 19 },
  fieldLabel: { color: '#263F4D', fontSize: 14, fontWeight: '900', marginTop: 18, marginBottom: 8 },
  bookSelectButton: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#D7E7EF',
    backgroundColor: '#F8FCFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bookSelectLabel: { color: '#657B87', fontSize: 12, fontWeight: '800' },
  bookSelectValue: { color: '#142A36', fontSize: 16, fontWeight: '900', marginTop: 3 },
  bookSelectArrow: { color: '#2F9FDB', fontSize: 20, fontWeight: '900' },
  chapterSelectBlock: { marginBottom: 12 },
  chapterSelectHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  chapterSelectTitle: { color: '#263F4D', fontSize: 13, fontWeight: '900' },
  chapterSelectHint: { color: '#718692', fontSize: 12, fontWeight: '800' },
  chapterList: { gap: 8, paddingRight: 12 },
  chapterChip: { minHeight: 42, minWidth: 58, borderRadius: 8, borderWidth: 1, borderColor: '#D7E7EF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  chapterChipActive: { backgroundColor: '#2F9FDB', borderColor: '#2F9FDB' },
  chapterChipText: { color: '#556C78', fontSize: 14, fontWeight: '900' },
  chapterChipTextActive: { color: '#FFFFFF' },
  chapterEmptyBox: { minHeight: 44, borderRadius: 8, backgroundColor: '#F3FAFE', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  chapterEmptyText: { color: '#718692', fontSize: 13, fontWeight: '800' },
  input: { minHeight: 52, borderWidth: 1, borderColor: '#D7E7EF', backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 13, color: '#163140', fontSize: 15 },
  readChaptersInput: { marginTop: 10 },
  textArea: { minHeight: 96, paddingTop: 13, textAlignVertical: 'top' },
  overallCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 18, marginTop: 20, shadowColor: '#1E4E66', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  departmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  departmentCard: { flex: 1, minWidth: 260, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 18, borderWidth: 1, borderColor: '#E7F0F5', shadowColor: '#1E4E66', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  departmentCardSelected: { borderColor: '#2F9FDB', borderWidth: 1, backgroundColor: '#F8FCFF' },
  departmentCount: { color: '#142A36', fontSize: 30, fontWeight: '900', marginTop: 16 },
  departmentUnit: { color: '#657B87', fontSize: 14, fontWeight: '800' },
  cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 10 },
  outlineButton: { borderWidth: 1, borderColor: '#2F9FDB', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 14, backgroundColor: '#FFFFFF', minHeight: 50, justifyContent: 'center' },
  outlineButtonText: { color: '#2F9FDB', fontSize: 14, fontWeight: '900' },
  recordItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#E5EEF3' },
  recordDateBox: { width: 52, height: 44, borderRadius: 8, backgroundColor: '#EAF7FE', alignItems: 'center', justifyContent: 'center' },
  recordDate: { color: '#2F9FDB', fontSize: 13, fontWeight: '900' },
  recordBody: { flex: 1, minWidth: 0 },
  recordTitle: { color: '#142A36', fontSize: 15, fontWeight: '900' },
  recordReflection: { color: '#657B87', fontSize: 13, lineHeight: 19, marginTop: 4 },
  adminOrganizationItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#E5EEF3' },
  adminEditRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 8 },
  adminActionRow: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'flex-end', marginTop: 10 },
  adminNameInput: { flex: 1, minWidth: 180 },
  adminTargetInput: { width: 110 },
  deleteButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F7E7E4' },
  deleteButtonText: { color: '#A14435', fontSize: 12, fontWeight: '900' },
  emptyText: { color: '#657B87', fontSize: 14, fontWeight: '700', paddingVertical: 20 },
  segmented: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, borderWidth: 1, borderColor: '#D7E7EF', borderRadius: 8, paddingVertical: 13, alignItems: 'center', backgroundColor: '#FFFFFF' },
  segmentActive: { backgroundColor: '#2F9FDB', borderColor: '#2F9FDB' },
  segmentText: { color: '#556C78', fontSize: 14, fontWeight: '900' },
  segmentTextActive: { color: '#FFFFFF' },
  settingRow: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#E5EEF3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  settingRowLast: { paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  settingBlock: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#E5EEF3', gap: 12 },
  settingCopy: { flex: 1 },
  settingTitle: { color: '#142A36', fontSize: 15, fontWeight: '900' },
  settingSub: { color: '#657B87', fontSize: 12, fontWeight: '700', marginTop: 4 },
  countStepper: { flexDirection: 'row', gap: 6 },
  countButton: { width: 42, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#D7E7EF', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  countButtonActive: { backgroundColor: '#2F9FDB', borderColor: '#2F9FDB' },
  countButtonText: { color: '#556C78', fontSize: 14, fontWeight: '900' },
  countButtonTextActive: { color: '#FFFFFF' },
  timeInputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeInputWrap: { flex: 1, minWidth: 112 },
  timeInputLabel: { color: '#657B87', fontSize: 12, fontWeight: '900', marginBottom: 6 },
  timeInput: { minHeight: 46, textAlign: 'center', fontWeight: '900' },
  notificationHelp: { color: '#657B87', fontSize: 12, fontWeight: '700', lineHeight: 18, marginTop: 10 },
  dangerButton: { backgroundColor: '#F7E7E4', paddingVertical: 15, paddingHorizontal: 18, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  dangerButtonText: { color: '#A14435', fontSize: 15, fontWeight: '900' },
  tabbar: {
    height: 76,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#DDEAF1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 56, borderRadius: 8, paddingVertical: 6 },
  tabItemActive: { backgroundColor: '#E6F5FE' },
  tabIcon: { color: '#748893', fontSize: 18, fontWeight: '900', lineHeight: 20 },
  tabLabel: { color: '#748893', fontSize: 11, fontWeight: '900', marginTop: 2 },
  tabActive: { color: '#2F9FDB' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 52, 73, 0.42)', justifyContent: 'center', padding: 22 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 24, maxWidth: 420, width: '100%', alignSelf: 'center' },
  modalTitle: { color: '#142A36', fontSize: 23, fontWeight: '900' },
  modalCount: { color: '#2F9FDB', fontSize: 15, fontWeight: '900', marginTop: 10 },
  modalText: { color: '#65756F', fontSize: 14, fontWeight: '700', lineHeight: 21, marginTop: 8, marginBottom: 12 },
  modalTextTight: { color: '#65756F', fontSize: 14, fontWeight: '700', lineHeight: 21, marginTop: 6 },
  profileModal: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 22, maxWidth: 360, width: '100%', alignSelf: 'center' },
  recordModalCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 20, maxWidth: 520, width: '100%', maxHeight: '82%', alignSelf: 'center' },
  recordModalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  recordModalTitleWrap: { flex: 1, minWidth: 0 },
  recordModalScroll: { maxHeight: 520 },
  recordModalContent: { paddingBottom: 4 },
  recordDetailLabel: { color: '#657B87', fontSize: 12, fontWeight: '900', marginTop: 14, marginBottom: 7 },
  recordDetailTitle: { color: '#142A36', fontSize: 19, fontWeight: '900', lineHeight: 27 },
  recordDetailText: { color: '#263F4D', fontSize: 15, fontWeight: '700', lineHeight: 24 },
  bookModalCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 18, maxWidth: 520, width: '100%', maxHeight: '82%', alignSelf: 'center' },
  bookModalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  bookModalSub: { color: '#65756F', fontSize: 13, fontWeight: '700', marginTop: 5 },
  closeButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: '#E6F5FE' },
  closeButtonText: { color: '#2F9FDB', fontSize: 13, fontWeight: '900' },
  bookList: { maxHeight: 560 },
  bookListContent: { paddingBottom: 8 },
  bookRow: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookRowSelected: { backgroundColor: '#E6F5FE' },
  bookRowMain: { flex: 1, minWidth: 0, paddingRight: 12 },
  bookRowText: { color: '#142A36', fontSize: 15, fontWeight: '800' },
  bookRowTextSelected: { color: '#2F9FDB', fontWeight: '900' },
  bookRowSub: { color: '#718692', fontSize: 12, fontWeight: '700', marginTop: 3 },
  bookRowCheck: { color: '#2F9FDB', fontSize: 12, fontWeight: '900' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F5FAFD', alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 22, width: '100%', maxWidth: 320, shadowColor: '#1E4E66', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  loadingTitle: { color: '#142A36', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  loadingText: { color: '#65756F', fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 8 },
});
