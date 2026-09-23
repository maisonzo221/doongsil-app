import AsyncStorage from 'expo-sqlite/kv-store';
import { SwimRecord, SwimRecordInput } from '../types';

const RECORDS_KEY = '@doongsil/records';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function getAllRecords(): Promise<SwimRecord[]> {
  const raw = await AsyncStorage.getItem(RECORDS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SwimRecord[];
    return parsed.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

async function saveAll(records: SwimRecord[]): Promise<void> {
  await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export async function addRecord(input: SwimRecordInput): Promise<SwimRecord> {
  const records = await getAllRecords();
  const now = Date.now();
  const record: SwimRecord = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await saveAll([record, ...records]);
  return record;
}

export async function updateRecord(id: string, input: SwimRecordInput): Promise<void> {
  const records = await getAllRecords();
  const next = records.map((r) =>
    r.id === id ? { ...r, ...input, updatedAt: Date.now() } : r
  );
  await saveAll(next);
}

export async function deleteRecord(id: string): Promise<void> {
  const records = await getAllRecords();
  await saveAll(records.filter((r) => r.id !== id));
}

export async function getRecordsForMonth(yearMonth: string): Promise<SwimRecord[]> {
  const records = await getAllRecords();
  return records.filter((r) => r.date.startsWith(yearMonth));
}
