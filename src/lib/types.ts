export type AppointmentStatus = "Current" | "Ended" | "Missing End Date" | string;

export interface FotgsFacultyRecordInternal {
  personKey: string;
  updatedOn: string;
  lastName: string;
  firstName: string;
  preferredName: string;
  displayName: string;
  highestDegree: string;
  rank: string;
  trackAndStatus: string;
  fotgsStatus: string;
  appointmentStatus: AppointmentStatus;
  researchWebpage: string | null;
  workdayDegreeIncomplete: boolean;
  workdayRankIncomplete: boolean;
}

export type FotgsFacultyRecordPublic = Omit<FotgsFacultyRecordInternal, "personKey">;

export interface FotgsImportSummary {
  totalRows: number;
  validRows: number;
  sourceColumns: string[];
  requiredColumns: string[];
  missingRequiredColumns: string[];
  rowsMissingEmplid: number;
  duplicateEmplidCount: number;
  duplicateNameGroups: { name: string; count: number }[];
  runDates: string[];
  appointmentStatusCounts: Record<string, number>;
  fotgsStatusCounts: Record<string, number>;
  trackAndStatusCounts: Record<string, number>;
  degreeCounts: Record<string, number>;
  rankCounts: Record<string, number>;
  workdayDegreeIncompleteCount: number;
  workdayRankIncompleteCount: number;
  researchWebpageCount: number;
}

export interface FotgsPublicationData {
  sourceFileName: string;
  records: FotgsFacultyRecordInternal[];
  summary: FotgsImportSummary;
}

export interface StoredFotgsPublication {
  version: 1;
  slug: string;
  title: string;
  data: FotgsPublicationData;
  created_at: string;
  updated_at: string;
}

export interface FotgsPublicationRow extends StoredFotgsPublication {
  id: string;
}

export interface FotgsPublicationSummary {
  slug: string;
  title: string;
  sourceFileName: string;
  rowCount: number;
  runDates: string[];
  currentCount: number;
  endedCount: number;
  missingEndDateCount: number;
  workdayDegreeIncompleteCount: number;
  workdayRankIncompleteCount: number;
  duplicateEmplidCount: number;
  duplicateNameGroupCount: number;
  created_at: string;
  updated_at: string;
}

export interface PublicFotgsPublication {
  title: string;
  slug: string;
  sourceFileName: string;
  updatedAt: string;
  createdAt: string;
  records: FotgsFacultyRecordPublic[];
  summary: {
    runDates: string[];
    appointmentStatusCounts: Record<string, number>;
    workdayDegreeIncompleteCount: number;
    workdayRankIncompleteCount: number;
    researchWebpageCount: number;
  };
}
