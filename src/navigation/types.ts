import { SwimRecord } from '../types';

export type CalendarStackParamList = {
  CalendarHome: undefined;
  RecordForm: undefined;
  RecordDetail: { id: string };
  StatDetail: { metric: 'distance' | 'swolf' | 'strokes' | 'averages'; allRecords: SwimRecord[] };
};

export type RootTabParamList = {
  Friends: undefined;
  Calendar: undefined;
  TipRoom: undefined;
  Teaching: undefined;
  Shop: undefined;
};
