const DEFAULT_POOL_LENGTH_METERS = 25;

/** 100m 기준 평균 페이스(초)를 계산한다. 거리/시간이 없으면 undefined. */
export function computePaceSecPer100m(
  distanceMeters?: number,
  durationMinutes?: number
): number | undefined {
  if (!distanceMeters || !durationMinutes) return undefined;
  const totalSeconds = durationMinutes * 60;
  return Math.round((totalSeconds / distanceMeters) * 100);
}

export function formatPace(secPer100m?: number): string {
  if (!secPer100m) return '-';
  const min = Math.floor(secPer100m / 60);
  const sec = secPer100m % 60;
  return `${min}'${String(sec).padStart(2, '0')}"/100m`;
}

/**
 * 랩(구간) 단위 데이터가 없을 때 전체 평균으로 근사한 SWOLF.
 * SWOLF = 한 구간 소요 시간(초) + 그 구간의 스트로크 수.
 * poolLengthMeters는 실제 수영장 레인 길이를 모를 때의 기본값(25m)을 쓴다.
 */
export function estimateSwolf(
  distanceMeters?: number,
  durationMinutes?: number,
  strokeCount?: number,
  poolLengthMeters: number = DEFAULT_POOL_LENGTH_METERS
): number | undefined {
  if (!distanceMeters || !durationMinutes || !strokeCount) return undefined;
  const lengths = distanceMeters / poolLengthMeters;
  if (lengths <= 0) return undefined;
  const secPerLength = (durationMinutes * 60) / lengths;
  const strokesPerLength = strokeCount / lengths;
  return Math.round(secPerLength + strokesPerLength);
}
