import AsyncStorage from '@react-native-async-storage/async-storage';

const GOALS_KEY = '@doongsil/goals';

type GoalMap = Record<string, string>; // "YYYY-MM" -> goal text

async function getAllGoals(): Promise<GoalMap> {
  const raw = await AsyncStorage.getItem(GOALS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as GoalMap;
  } catch {
    return {};
  }
}

export async function getGoal(yearMonth: string): Promise<string> {
  const goals = await getAllGoals();
  return goals[yearMonth] ?? '';
}

export async function setGoal(yearMonth: string, text: string): Promise<void> {
  const goals = await getAllGoals();
  goals[yearMonth] = text;
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}
