import { SwimRecord } from '../types';

export type CalendarStackParamList = {
  CalendarHome: undefined;
  RecordForm: undefined;
  RecordDetail: { id: string };
  StatDetail: { metric: 'distance' | 'swolf' | 'strokes' | 'averages'; allRecords: SwimRecord[] };
};

export type RootTabParamList = {
  Calendar: undefined;
  Friends: undefined;
  Groups: undefined;
  Teaching: undefined;
  TipRoom: undefined;
  Shop: undefined;
};
