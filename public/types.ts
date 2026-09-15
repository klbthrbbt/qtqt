
export enum BibleVersion {
  KRV = '개역개정',
  URIMAN = '우리말성경',
  NIV = 'NIV'
}

export interface BibleTextResponse {
  reference: string;
  engReference?: string;
  texts: {
    [key in BibleVersion]: string;
  };
  reflection?: string;
  prayer?: string;
}

export interface FileStatus {
  krv: boolean;
  uriman: boolean;
  niv: boolean;
}

export interface AppState {
  currentDate: Date;
  selectedVersion: BibleVersion;
  devotional: BibleTextResponse | null;
  loading: boolean;
  error: string | null;
  fileStatus: FileStatus;
}
