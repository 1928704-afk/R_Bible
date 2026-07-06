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

type Tab = 'dashboard' | 'check' | 'departments' | 'records' | 'admin';

type OrganizationId = string;
type DepartmentId = string;
type MemberId = string;

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
  passage?: string;
  reflection?: string;
};

type AppState = {
  organizations: Organization[];
  currentOrganizationId?: OrganizationId;
  currentMember?: Member;
  logs: ReadingLog[];
  reminders: {
    daily: boolean;
    streak: boolean;
    department: boolean;
  };
};

const STORAGE_KEY = 'bible-reading-challenge-app-v2';
const LEGACY_WEB_STORAGE_KEY = 'bible-reading-challenge-web-v1';
const MONTH_LABEL = '7월';
const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;

const sampleOrganization: Organization = {
  id: 'org-busan-youth',
  name: '부산교회 청년회',
  inviteCode: 'BUSAN-YOUTH-2026',
  ownerName: '단체장',
  createdAt: '2026-07-01',
  departments: [
    { id: 'dept-covenant', name: '언약부', monthlyTargetMembers: 300 },
    { id: 'dept-wheat', name: '밀알부', monthlyTargetMembers: 300 },
    { id: 'dept-ireh', name: '이례부', monthlyTargetMembers: 300 },
  ],
};

const initialState: AppState = {
  organizations: [sampleOrganization],
  logs: [],
  reminders: {
    daily: true,
    streak: true,
    department: true,
  },
};

type OrganizationRow = {
  id: string;
  name: string;
  invite_code: string;
  owner_name: string;
  created_at: string;
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
  passage?: string | null;
  reflection?: string | null;
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

function normalizeState(parsed: Partial<AppState>): AppState {
  const organizations = Array.isArray(parsed.organizations) && parsed.organizations.length > 0
    ? parsed.organizations.map((organization) => ({
      ...organization,
      departments: Array.isArray(organization.departments)
        ? organization.departments.map((department) => ({
          ...department,
          name: organization.name === '부산교회 청년회' && department.id === 'dept-ireh' ? '이례부' : department.name,
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
    ? parsed.currentMember
    : undefined;

  return {
    ...initialState,
    ...parsed,
    organizations,
    currentOrganizationId: currentOrganizationId && organizations.some((organization) => organization.id === currentOrganizationId) ? currentOrganizationId : currentMember?.organizationId,
    currentMember,
    reminders: { ...initialState.reminders, ...parsed.reminders },
    logs: Array.isArray(parsed.logs)
      ? parsed.logs.map((log) => ({
        ...log,
        organizationId: log.organizationId ?? fallbackOrganization.id,
        memberId: log.memberId ?? makeId(),
      }))
      : initialState.logs,
  };
}

function organizationToRow(organization: Organization): OrganizationRow {
  return {
    id: organization.id,
    name: organization.name,
    invite_code: organization.inviteCode,
    owner_name: organization.ownerName,
    created_at: organization.createdAt,
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
    passage: log.passage ?? null,
    reflection: log.reflection ?? null,
  };
}

async function ensureDefaultRemoteOrganization() {
  if (!supabase) return;

  await supabase.from('organizations').upsert(organizationToRow(sampleOrganization), { onConflict: 'id' });
  await supabase.from('departments').upsert(
    sampleOrganization.departments.map((department) => departmentToRow(sampleOrganization.id, department)),
    { onConflict: 'id' },
  );
}

async function loadRemoteState(localState: AppState): Promise<AppState> {
  if (!isSupabaseConfigured || !supabase) return localState;

  const { data: organizationRows, error: organizationError } = await supabase
    .from('organizations')
    .select('id,name,invite_code,owner_name,created_at')
    .order('created_at', { ascending: true });

  if (organizationError) return localState;

  if (!organizationRows || organizationRows.length === 0) {
    await ensureDefaultRemoteOrganization();
  }

  const [{ data: refreshedOrganizations }, { data: departmentRows }, { data: logRows }] = await Promise.all([
    supabase.from('organizations').select('id,name,invite_code,owner_name,created_at').order('created_at', { ascending: true }),
    supabase.from('departments').select('id,organization_id,name,monthly_target_members'),
    supabase.from('reading_logs').select('id,date,organization_id,department_id,member_id,member_name,passage,reflection').order('date', { ascending: false }),
  ]);

  const remoteOrganizations = (refreshedOrganizations ?? organizationRows ?? []).map((organization) => ({
    id: organization.id,
    name: organization.name,
    inviteCode: organization.invite_code,
    ownerName: organization.owner_name,
    createdAt: organization.created_at,
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
    logs: (logRows ?? []).map((log) => ({
      id: log.id,
      date: log.date,
      organizationId: log.organization_id,
      departmentId: log.department_id,
      memberId: log.member_id,
      memberName: log.member_name,
      passage: log.passage ?? undefined,
      reflection: log.reflection ?? undefined,
    })),
  });
}

async function saveRemoteOrganization(organization: Organization, ownerMember: Member) {
  if (!supabase) return;

  const { error: organizationError } = await supabase.from('organizations').insert(organizationToRow(organization));
  if (organizationError) throw organizationError;

  const { error: departmentError } = await supabase
    .from('departments')
    .insert(organization.departments.map((department) => departmentToRow(organization.id, department)));
  if (departmentError) throw departmentError;

  const { error: memberError } = await supabase.from('members').insert(memberToRow(ownerMember));
  if (memberError) throw memberError;
}

async function saveRemoteMember(member: Member) {
  if (!supabase) return;

  const { error } = await supabase.from('members').insert(memberToRow(member));
  if (error) throw error;
}

async function saveRemoteReadingLog(log: ReadingLog) {
  if (!supabase) return;

  const { error } = await supabase.from('reading_logs').insert(readingLogToRow(log));
  if (error) throw error;
}

async function deleteRemoteReadingLog(id: string) {
  if (!supabase) return;

  const { error } = await supabase.from('reading_logs').delete().eq('id', id);
  if (error) throw error;
}

async function saveRemotePushSubscription(member: Member, subscription: PushSubscription) {
  if (!supabase) return;

  const subscriptionJson = subscription.toJSON();
  const p256dh = subscriptionJson.keys?.p256dh;
  const auth = subscriptionJson.keys?.auth;

  if (!p256dh || !auth) {
    throw new Error('Push subscription keys are missing.');
  }

  const webNavigator = (globalThis as unknown as { navigator?: Navigator }).navigator;
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      id: makeId(),
      organization_id: member.organizationId,
      member_id: member.id,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      user_agent: webNavigator?.userAgent ?? null,
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
  const [reflection, setReflection] = useState('');
  const [completedModal, setCompletedModal] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ReadingLog | null>(null);
  const [onboardingMode, setOnboardingMode] = useState<'create' | 'join'>('join');
  const [organizationName, setOrganizationName] = useState('부산교회 청년회');
  const [ownerName, setOwnerName] = useState('');
  const [departmentDrafts, setDepartmentDrafts] = useState([
    { id: makeId(), name: '언약부', monthlyTargetMembers: '300' },
    { id: makeId(), name: '밀알부', monthlyTargetMembers: '300' },
    { id: makeId(), name: '이례부', monthlyTargetMembers: '300' },
  ]);
  const [joinOrganizationId, setJoinOrganizationId] = useState(sampleOrganization.id);
  const [joinDepartmentId, setJoinDepartmentId] = useState(sampleOrganization.departments[0].id);
  const [joinMemberName, setJoinMemberName] = useState('');
  const [notificationStatus, setNotificationStatus] = useState<NotificationState>('default');

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

    if (webDocument && !webDocument.querySelector('meta[name="theme-color"]')) {
      const themeMeta = webDocument.createElement('meta');
      themeMeta.name = 'theme-color';
      themeMeta.content = '#1F6B5C';
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

  const currentOrganization = state.organizations.find((organization) => organization.id === state.currentOrganizationId) ?? state.organizations[0] ?? sampleOrganization;
  const departments = currentOrganization.departments;
  const activeMember = state.currentMember;
  const myDepartment = departments.find((department) => department.id === activeMember?.departmentId) ?? departments[0];
  const today = todayKey();
  const organizationLogs = state.logs.filter((log) => log.organizationId === currentOrganization.id);
  const myLogs = activeMember ? organizationLogs.filter((log) => log.memberId === activeMember.id) : [];
  const checkedToday = activeMember ? organizationLogs.some((log) => log.date === today && log.memberId === activeMember.id) : false;
  const todayLog = activeMember ? organizationLogs.find((log) => log.date === today && log.memberId === activeMember.id) : undefined;
  const selectedBibleBook = bibleBooks.find((book) => passage.startsWith(book.name));
  const selectedChapter = Number(passage.match(/(\d+)장/)?.[1] ?? 0) || null;
  const totalTarget = departments.reduce((sum, department) => sum + department.monthlyTargetMembers, 0);

  const departmentStats = useMemo(
    () =>
      departments.map((department) => {
        const departmentLogs = organizationLogs.filter((log) => log.departmentId === department.id);
        const count = departmentLogs.length;
        return {
          ...department,
          count,
          percent: clampPercent(count, department.monthlyTargetMembers),
          remaining: Math.max(0, department.monthlyTargetMembers - count),
          participants: new Set(departmentLogs.map((log) => log.memberId)).size,
        };
      }),
    [departments, organizationLogs],
  );

  const currentDepartmentStats = departmentStats.find((department) => department.id === myDepartment.id) ?? departmentStats[0];
  const totalCount = departmentStats.reduce((sum, department) => sum + department.count, 0);
  const weeklyCount = organizationLogs.filter((log) => {
    const time = new Date(log.date).getTime();
    const diff = Date.now() - time;
    return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 7;
  }).length;

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

    return streak || (checkedToday ? 1 : 3);
  }, [checkedToday, myLogs]);

  const recentLogs = [...organizationLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const todayReflections = organizationLogs
    .filter((log) => log.date === today && log.reflection?.trim())
    .sort((a, b) => b.id.localeCompare(a.id));

  const shareText = `[${MONTH_LABEL} 성경읽기 챌린지]\n${currentOrganization.name} ${myDepartment.name}는 현재 ${currentDepartmentStats.count} / ${myDepartment.monthlyTargetMembers}명입니다.\n전체는 ${totalCount} / ${totalTarget}명까지 채워졌어요.\n오늘도 말씀 읽기 인증으로 함께해요.`;

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
      departments: departmentsToCreate,
    };
    const ownerMember: Member = {
      id: makeId(),
      organizationId: organization.id,
      departmentId: organization.departments[0].id,
      name: owner,
      role: 'owner',
    };

    try {
      await saveRemoteOrganization(organization, ownerMember);
    } catch {
      Alert.alert('단체 생성 실패', 'Supabase 테이블 설정을 확인해 주세요. SQL 스키마를 먼저 실행해야 합니다.');
      return;
    }

    setState((prev) => ({
      ...prev,
      organizations: [organization, ...prev.organizations],
      currentOrganizationId: organization.id,
      currentMember: ownerMember,
    }));
    setJoinOrganizationId(organization.id);
    setJoinDepartmentId(organization.departments[0].id);
    setTab('dashboard');
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
    const nextLog: ReadingLog = {
      id: makeId(),
      date: today,
      organizationId: activeMember.organizationId,
      departmentId: activeMember.departmentId,
      memberId: activeMember.id,
      memberName: activeMember.name.trim() || '이름 없음',
      passage: trimmedPassage || undefined,
      reflection: trimmedReflection || undefined,
    };

    try {
      await saveRemoteReadingLog(nextLog);
    } catch {
      Alert.alert('인증 저장 실패', 'Supabase 연결 또는 reading_logs 테이블 설정을 확인해 주세요.');
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

      await saveRemotePushSubscription(activeMember, subscription);
      setNotificationStatus('subscribed');
      Alert.alert('알림 설정 완료', '이 기기에서 성경읽기 리마인드를 받을 수 있습니다.');
    } catch {
      Alert.alert('알림 설정 실패', '브라우저 권한, VAPID 키, Supabase push_subscriptions 테이블 설정을 확인해 주세요.');
    }
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

                <Text style={styles.fieldLabel}>부서 및 월 목표 인원수</Text>
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
                      placeholder="30"
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
            <Text style={styles.heroUnit}> / {myDepartment.monthlyTargetMembers}명</Text>
          </Text>
          <ProgressBar value={currentDepartmentStats.count} total={myDepartment.monthlyTargetMembers} light />
          <Text style={styles.heroHelp}>목표까지 {currentDepartmentStats.remaining}명 남았습니다.</Text>
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

      <View style={styles.summaryBand}>
        <StatTile label="내 이번 달 인증" value={`${myLogs.length}회`} helper={checkedToday ? '오늘 인증 완료' : '오늘 인증 전'} />
        <StatTile label="연속 기록" value={`${currentStreak}일`} helper="매일 1회 기준" />
        <StatTile label="이번 주 전체 인증" value={`${weeklyCount}명`} helper="최근 7일 집계" />
        <StatTile label="단체 전체" value={`${totalCount}명`} helper={`${Math.max(0, totalTarget - totalCount)}명 남음`} />
      </View>

      <View style={[styles.twoColumn, isWide && styles.twoColumnWide]}>
        <View style={[styles.panel, isWide && styles.panelWide]}>
          <SectionHeader title="부서 진행률" action={`${MONTH_LABEL} 목표`} />
          {departmentStats.map((department, index) => (
            <Pressable
              key={department.id}
              style={[styles.departmentItem, index === departmentStats.length - 1 && styles.departmentItemLast]}
              onPress={() => setState((prev) => (prev.currentMember ? { ...prev, currentMember: { ...prev.currentMember, departmentId: department.id } } : prev))}
            >
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.departmentName}>{department.name}</Text>
                  <Text style={styles.mutedText}>월 목표 {department.monthlyTargetMembers}명 · {department.participants}명 참여</Text>
                </View>
                <Text style={styles.cardValue}>{department.count}명</Text>
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
                  <Text style={styles.feedMeta}>{formatDate(log.date)} · {log.passage ?? '성경 읽기 인증'}</Text>
                </View>
                <Text style={styles.logBadge}>+1</Text>
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
            <Text style={styles.doneText}>{todayLog.passage ?? '성경 읽기 인증'}{todayLog.reflection ? ` · ${todayLog.reflection}` : ''}</Text>
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
                  <Text style={styles.feedMeta}>{log.passage ?? '성경 읽기 인증'}</Text>
                </View>
                <Text style={styles.logBadge}>{formatDate(log.date)}</Text>
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
                <Text style={styles.recordTitle}>{log.passage ?? '성경 읽기 인증'}</Text>
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
      <Text style={[styles.title, isCompact && styles.titleCompact]}>앱 운영값을 조정합니다.</Text>
      <Text style={styles.subtitle}>Supabase 기반으로 단체, 부서, 인증 데이터를 공유합니다. 알림은 기기별로 직접 허용해야 받을 수 있습니다.</Text>

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
        <SectionHeader title="알림 전략" />
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>매일 읽기 리마인드</Text>
            <Text style={styles.settingSub}>미인증 상태일 때 저녁에 안내</Text>
          </View>
          <Switch value={state.reminders.daily} onValueChange={(daily) => setState((prev) => ({ ...prev, reminders: { ...prev.reminders, daily } }))} />
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>연속 기록 리마인드</Text>
            <Text style={styles.settingSub}>3일 이상 흐름을 이어갈 때만 안내</Text>
          </View>
          <Switch value={state.reminders.streak} onValueChange={(streak) => setState((prev) => ({ ...prev, reminders: { ...prev.reminders, streak } }))} />
        </View>
        <View style={styles.settingRowLast}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>부서 목표 리마인드</Text>
            <Text style={styles.settingSub}>월말 목표 근접 구간에서 안내</Text>
          </View>
          <Switch value={state.reminders.department} onValueChange={(department) => setState((prev) => ({ ...prev, reminders: { ...prev.reminders, department } }))} />
        </View>
        <Pressable style={styles.secondaryButton} onPress={requestNotifications}>
          <Text style={styles.secondaryButtonText}>알림 받기</Text>
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

  const content = tab === 'dashboard' ? Dashboard() : tab === 'check' ? Check() : tab === 'departments' ? TodayReflections() : tab === 'records' ? Records() : Admin();

  const navItems: Array<{ key: Tab; label: string; short: string; icon: string }> = [
    { key: 'dashboard', label: '대시보드', short: '홈', icon: '⌂' },
    { key: 'check', label: '오늘 인증', short: '인증', icon: '+' },
    { key: 'departments', label: '오늘의 묵상글', short: '묵상', icon: '▦' },
    { key: 'records', label: '내 기록', short: '기록', icon: '◷' },
    { key: 'admin', label: '운영 설정', short: '설정', icon: '⋯' },
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
            <Text style={styles.modalCount}>{myDepartment.name} 누적 {currentDepartmentStats.count} / {myDepartment.monthlyTargetMembers}명</Text>
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
              <Text style={styles.recordDetailLabel}>묵상글</Text>
              <Text style={styles.recordDetailText}>{selectedLog?.reflection?.trim() || '작성된 묵상글이 없습니다.'}</Text>
            </ScrollView>
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
  safe: { flex: 1, backgroundColor: '#F7F8F4' },
  appShell: { flex: 1, flexDirection: 'row', backgroundColor: '#F7F8F4' },
  sidebar: { width: 260, backgroundColor: '#123D34', paddingHorizontal: 20, paddingVertical: 26 },
  brand: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  brandSub: { color: '#B9D6CD', fontSize: 12, fontWeight: '700', marginTop: 6 },
  sidebarNav: { marginTop: 30, gap: 6 },
  sidebarItem: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 8 },
  sidebarItemActive: { backgroundColor: '#EDF6F2' },
  sidebarText: { color: '#D8E9E3', fontSize: 15, fontWeight: '800' },
  sidebarTextActive: { color: '#123D34' },
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
    backgroundColor: '#F7F8F4',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E7DF',
  },
  appTitle: { color: '#182B2A', fontSize: 18, fontWeight: '900' },
  appMeta: { color: '#66746F', fontSize: 12, fontWeight: '700', marginTop: 3 },
  profileButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1F6B5C', alignItems: 'center', justifyContent: 'center', shadowColor: '#123D34', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  profileButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  screen: { flex: 1 },
  onboardingScroll: { padding: 20, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  onboardingScrollWide: { maxWidth: 720, width: '100%', alignSelf: 'center' },
  onboardingHeader: { marginBottom: 18 },
  onboardingCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 20, shadowColor: '#253B35', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  departmentDraftRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  departmentNameInput: { flex: 1, minWidth: 0 },
  departmentTargetInput: { width: 92 },
  smallDangerButton: { minHeight: 52, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F7E7E4', alignItems: 'center', justifyContent: 'center' },
  optionList: { gap: 8 },
  optionRow: { minHeight: 62, borderRadius: 8, borderWidth: 1, borderColor: '#DDE5E0', paddingHorizontal: 14, paddingVertical: 11, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  optionRowActive: { borderColor: '#1F6B5C', backgroundColor: '#F2F8F5' },
  optionTitle: { color: '#172A27', fontSize: 15, fontWeight: '900' },
  optionTitleActive: { color: '#1F6B5C' },
  segmentedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segmentWrapItem: { minWidth: 96, flexGrow: 1 },
  scrollContent: { padding: 18, paddingBottom: 128, flexGrow: 1 },
  wideScroll: { padding: 32, paddingBottom: 44, maxWidth: 1120, width: '100%', alignSelf: 'center' },
  formScroll: { padding: 28, paddingBottom: 40, maxWidth: 760, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center', paddingTop: 10, paddingBottom: 8 },
  heroWide: { justifyContent: 'center', paddingVertical: 44 },
  heroFocused: { minHeight: 430 },
  heroCopy: { width: '100%', maxWidth: 620, alignItems: 'center' },
  eyebrow: { color: '#526B62', fontSize: 14, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  title: { color: '#132624', fontSize: 32, lineHeight: 40, fontWeight: '900' },
  titleCompact: { fontSize: 28, lineHeight: 36 },
  subtitle: { color: '#63716D', fontSize: 16, lineHeight: 25, marginTop: 14 },
  heroActions: { marginTop: 18, alignItems: 'center' },
  heroPanel: {
    width: '100%',
    maxWidth: 620,
    minWidth: 260,
    backgroundColor: '#1F6B5C',
    borderRadius: 8,
    padding: 24,
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#143D35',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  panelKicker: { color: '#DDEFE9', fontSize: 14, fontWeight: '800' },
  panelKickerDark: { color: '#24423C', fontSize: 14, fontWeight: '900' },
  heroNumber: { color: '#FFFFFF', fontSize: 46, fontWeight: '900', marginTop: 12 },
  heroUnit: { color: '#DDEFE9', fontSize: 18, fontWeight: '800' },
  heroHelp: { color: '#E8F4F0', fontSize: 13, fontWeight: '700', marginTop: 12 },
  primaryButton: { backgroundColor: '#1F6B5C', paddingVertical: 16, paddingHorizontal: 18, borderRadius: 8, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  heroCheckButton: {
    backgroundColor: '#1F6B5C',
    borderWidth: 1,
    borderColor: '#66A092',
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
    minHeight: 54,
    width: '100%',
    maxWidth: 260,
    shadowColor: '#0E2E28',
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  heroCheckButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  pressedButton: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  pressedSurface: { opacity: 0.72 },
  secondaryButton: { backgroundColor: '#E6F1ED', paddingVertical: 15, paddingHorizontal: 18, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#1F6B5C', fontSize: 15, fontWeight: '900' },
  disabledButton: { backgroundColor: '#829B94' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  summaryBand: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E6DD',
  },
  statGridCompact: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 14 },
  statTile: { flex: 1, minWidth: 150, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 17, shadowColor: '#253B35', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  statLabel: { color: '#6D7B76', fontSize: 12, fontWeight: '800' },
  statValue: { color: '#142724', fontSize: 26, fontWeight: '900', marginTop: 8 },
  statHelper: { color: '#7B8984', fontSize: 12, fontWeight: '700', marginTop: 6 },
  twoColumn: { gap: 14, marginTop: 14 },
  twoColumnWide: { flexDirection: 'row', alignItems: 'flex-start' },
  panel: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 18, marginTop: 16, shadowColor: '#253B35', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2, overflow: 'visible' },
  panelWide: { flex: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: '#172A27', fontSize: 18, fontWeight: '900' },
  sectionAction: { color: '#77847F', fontSize: 12, fontWeight: '800' },
  departmentItem: { minHeight: 82, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEF2EC' },
  departmentItemLast: { borderBottomWidth: 0, paddingBottom: 4 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  departmentName: { color: '#172A27', fontSize: 16, fontWeight: '900' },
  mutedText: { color: '#6F7E78', fontSize: 12, fontWeight: '700', marginTop: 4 },
  cardValue: { color: '#243A36', fontSize: 15, fontWeight: '900' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  progressTrack: { flex: 1, height: 10, borderRadius: 10, overflow: 'hidden', backgroundColor: '#DDE5E0' },
  progressTrackLight: { backgroundColor: '#D3E3DE' },
  progressFill: { height: '100%', borderRadius: 10, backgroundColor: '#E9B44C' },
  progressPct: { width: 40, marginLeft: 10, color: '#41514C', fontSize: 12, fontWeight: '900', textAlign: 'right' },
  progressPctLight: { color: '#FFFFFF' },
  feedItem: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EEF2EC' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#DCEBE5', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#1F6B5C', fontSize: 16, fontWeight: '900' },
  feedBody: { flex: 1, minWidth: 0 },
  feedTitle: { color: '#1C302D', fontSize: 14, fontWeight: '900' },
  feedMeta: { color: '#71807B', fontSize: 12, fontWeight: '700', marginTop: 3 },
  logBadge: { color: '#1F6B5C', backgroundColor: '#E6F1ED', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, overflow: 'hidden', fontSize: 12, fontWeight: '900' },
  reflectionItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EEF2EC' },
  reflectionText: { color: '#263834', fontSize: 15, fontWeight: '700', lineHeight: 24, marginTop: 12 },
  checkCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 18, marginTop: 22, shadowColor: '#253B35', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  cardTitle: { color: '#172A27', fontSize: 16, fontWeight: '900' },
  statusPill: { color: '#1F6B5C', backgroundColor: '#E6F1ED', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, overflow: 'hidden', fontSize: 12, fontWeight: '900' },
  statusPillDone: { color: '#7A5610', backgroundColor: '#FFF2CF' },
  doneBox: { backgroundColor: '#F2F8F5', borderRadius: 8, padding: 12, marginTop: 16 },
  doneTitle: { color: '#1F6B5C', fontSize: 14, fontWeight: '900' },
  doneText: { color: '#566C65', fontSize: 13, fontWeight: '700', marginTop: 5, lineHeight: 19 },
  fieldLabel: { color: '#263834', fontSize: 14, fontWeight: '900', marginTop: 18, marginBottom: 8 },
  bookSelectButton: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#DDE5E0',
    backgroundColor: '#F8FAF7',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bookSelectLabel: { color: '#6F7E78', fontSize: 12, fontWeight: '800' },
  bookSelectValue: { color: '#172A27', fontSize: 16, fontWeight: '900', marginTop: 3 },
  bookSelectArrow: { color: '#1F6B5C', fontSize: 20, fontWeight: '900' },
  chapterSelectBlock: { marginBottom: 12 },
  chapterSelectHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  chapterSelectTitle: { color: '#263834', fontSize: 13, fontWeight: '900' },
  chapterSelectHint: { color: '#7B8984', fontSize: 12, fontWeight: '800' },
  chapterList: { gap: 8, paddingRight: 12 },
  chapterChip: { minHeight: 42, minWidth: 58, borderRadius: 8, borderWidth: 1, borderColor: '#DDE5E0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  chapterChipActive: { backgroundColor: '#1F6B5C', borderColor: '#1F6B5C' },
  chapterChipText: { color: '#52635D', fontSize: 14, fontWeight: '900' },
  chapterChipTextActive: { color: '#FFFFFF' },
  chapterEmptyBox: { minHeight: 44, borderRadius: 8, backgroundColor: '#F4F7F5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  chapterEmptyText: { color: '#7B8984', fontSize: 13, fontWeight: '800' },
  input: { minHeight: 52, borderWidth: 1, borderColor: '#DDE5E0', backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 13, color: '#182B2A', fontSize: 15 },
  textArea: { minHeight: 96, paddingTop: 13, textAlignVertical: 'top' },
  overallCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 18, marginTop: 20, shadowColor: '#253B35', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  departmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  departmentCard: { flex: 1, minWidth: 260, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 18, borderWidth: 1, borderColor: '#EEF2EC', shadowColor: '#253B35', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  departmentCardSelected: { borderColor: '#1F6B5C', borderWidth: 1, backgroundColor: '#FBFDFB' },
  departmentCount: { color: '#172A27', fontSize: 30, fontWeight: '900', marginTop: 16 },
  departmentUnit: { color: '#6F7E78', fontSize: 14, fontWeight: '800' },
  cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 10 },
  outlineButton: { borderWidth: 1, borderColor: '#1F6B5C', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 14, backgroundColor: '#FFFFFF', minHeight: 50, justifyContent: 'center' },
  outlineButtonText: { color: '#1F6B5C', fontSize: 14, fontWeight: '900' },
  recordItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EDF0EA' },
  recordDateBox: { width: 52, height: 44, borderRadius: 8, backgroundColor: '#F0F5F2', alignItems: 'center', justifyContent: 'center' },
  recordDate: { color: '#1F6B5C', fontSize: 13, fontWeight: '900' },
  recordBody: { flex: 1, minWidth: 0 },
  recordTitle: { color: '#172A27', fontSize: 15, fontWeight: '900' },
  recordReflection: { color: '#6F7E78', fontSize: 13, lineHeight: 19, marginTop: 4 },
  deleteButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F7E7E4' },
  deleteButtonText: { color: '#A14435', fontSize: 12, fontWeight: '900' },
  emptyText: { color: '#6F7E78', fontSize: 14, fontWeight: '700', paddingVertical: 20 },
  segmented: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, borderWidth: 1, borderColor: '#DDE5E0', borderRadius: 8, paddingVertical: 13, alignItems: 'center', backgroundColor: '#FFFFFF' },
  segmentActive: { backgroundColor: '#1F6B5C', borderColor: '#1F6B5C' },
  segmentText: { color: '#52635D', fontSize: 14, fontWeight: '900' },
  segmentTextActive: { color: '#FFFFFF' },
  settingRow: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EDF0EA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  settingRowLast: { paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  settingCopy: { flex: 1 },
  settingTitle: { color: '#172A27', fontSize: 15, fontWeight: '900' },
  settingSub: { color: '#6F7E78', fontSize: 12, fontWeight: '700', marginTop: 4 },
  notificationHelp: { color: '#6F7E78', fontSize: 12, fontWeight: '700', lineHeight: 18, marginTop: 10 },
  dangerButton: { backgroundColor: '#F7E7E4', paddingVertical: 15, paddingHorizontal: 18, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  dangerButtonText: { color: '#A14435', fontSize: 15, fontWeight: '900' },
  tabbar: {
    height: 76,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E3E7DF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 56, borderRadius: 8, paddingVertical: 6 },
  tabItemActive: { backgroundColor: '#EAF3F0' },
  tabIcon: { color: '#77847F', fontSize: 18, fontWeight: '900', lineHeight: 20 },
  tabLabel: { color: '#77847F', fontSize: 11, fontWeight: '900', marginTop: 2 },
  tabActive: { color: '#1F6B5C' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(19, 38, 36, 0.44)', justifyContent: 'center', padding: 22 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 24, maxWidth: 420, width: '100%', alignSelf: 'center' },
  modalTitle: { color: '#172A27', fontSize: 23, fontWeight: '900' },
  modalCount: { color: '#1F6B5C', fontSize: 15, fontWeight: '900', marginTop: 10 },
  modalText: { color: '#65756F', fontSize: 14, fontWeight: '700', lineHeight: 21, marginTop: 8, marginBottom: 12 },
  modalTextTight: { color: '#65756F', fontSize: 14, fontWeight: '700', lineHeight: 21, marginTop: 6 },
  profileModal: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 22, maxWidth: 360, width: '100%', alignSelf: 'center' },
  recordModalCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 20, maxWidth: 520, width: '100%', maxHeight: '82%', alignSelf: 'center' },
  recordModalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  recordModalTitleWrap: { flex: 1, minWidth: 0 },
  recordModalScroll: { maxHeight: 520 },
  recordModalContent: { paddingBottom: 4 },
  recordDetailLabel: { color: '#6F7E78', fontSize: 12, fontWeight: '900', marginTop: 14, marginBottom: 7 },
  recordDetailTitle: { color: '#172A27', fontSize: 19, fontWeight: '900', lineHeight: 27 },
  recordDetailText: { color: '#263834', fontSize: 15, fontWeight: '700', lineHeight: 24 },
  bookModalCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 18, maxWidth: 520, width: '100%', maxHeight: '82%', alignSelf: 'center' },
  bookModalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  bookModalSub: { color: '#65756F', fontSize: 13, fontWeight: '700', marginTop: 5 },
  closeButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: '#EAF3F0' },
  closeButtonText: { color: '#1F6B5C', fontSize: 13, fontWeight: '900' },
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
  bookRowSelected: { backgroundColor: '#EAF3F0' },
  bookRowMain: { flex: 1, minWidth: 0, paddingRight: 12 },
  bookRowText: { color: '#172A27', fontSize: 15, fontWeight: '800' },
  bookRowTextSelected: { color: '#1F6B5C', fontWeight: '900' },
  bookRowSub: { color: '#7B8984', fontSize: 12, fontWeight: '700', marginTop: 3 },
  bookRowCheck: { color: '#1F6B5C', fontSize: 12, fontWeight: '900' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F7F8F4', alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 22, width: '100%', maxWidth: 320, shadowColor: '#253B35', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  loadingTitle: { color: '#172A27', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  loadingText: { color: '#65756F', fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 8 },
});
