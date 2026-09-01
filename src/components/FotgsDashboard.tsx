"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  Search,
} from "lucide-react";
import {
  formatDashboardDate,
  formatPublicTitle,
  type DashboardSearchParams,
} from "@/lib/dashboard-ui";
import type { FotgsFacultyRecordPublic, PublicFotgsPublication } from "@/lib/types";

const ALL = "__all__";
const INCOMPLETE = "__incomplete__";
const COMPLETE = "__complete__";

type SortField = "name" | "degree" | "rank" | "track" | "fotgs" | "appointment";
type SortDirection = "asc" | "desc";
type MetricFilter =
  | "all"
  | "current"
  | "needs_review"
  | "missing_end"
  | "degree_inc"
  | "rank_inc"
  | "research";

function firstParam(params: DashboardSearchParams | undefined, key: string): string {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function allowedParam(
  params: DashboardSearchParams | undefined,
  key: string,
  allowed: readonly string[],
  fallback = ALL
): string {
  const value = firstParam(params, key);
  return allowed.includes(value) ? value : fallback;
}

function completionParam(params: DashboardSearchParams | undefined, key: string): string {
  const value = firstParam(params, key);
  if (value === "complete") return COMPLETE;
  if (value === "incomplete") return INCOMPLETE;
  return ALL;
}

function completionQueryValue(value: string): string {
  if (value === COMPLETE) return "complete";
  if (value === INCOMPLETE) return "incomplete";
  return "";
}

function isNeedsReview(record: FotgsFacultyRecordPublic): boolean {
  return (
    record.appointmentStatus.trim().toLowerCase() === "missing end date" ||
    record.workdayDegreeIncomplete ||
    record.workdayRankIncomplete
  );
}

function countFor(counts: Record<string, number>, key: string): number {
  return counts[key] ?? 0;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

function appointmentBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "current") return "bg-fotgs-green-soft text-fotgs-green";
  if (normalized === "ended") return "bg-wsu-red-soft text-wsu-crimson";
  if (normalized === "missing end date") return "bg-fotgs-amber-soft text-amber-900";
  return "bg-wsu-cream text-wsu-gray-dark";
}

function WorkdayValue({ value, incomplete }: { value: string; incomplete: boolean }) {
  if (!incomplete) return <>{value || "Blank"}</>;
  return (
    <span className="inline-flex rounded-md bg-fotgs-amber-soft px-2 py-1 text-xs font-semibold text-amber-950">
      Workday Data Incomplete
    </span>
  );
}

function selectClassName() {
  return "mt-1.5 min-h-10 w-full rounded-md border border-wsu-gray/25 bg-white px-3 py-2 text-sm text-wsu-gray-dark shadow-sm focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson/20";
}

function SortableColumnHeader({
  field,
  label,
  minWidth,
  sortField,
  sortDirection,
  onSort,
}: {
  field: SortField;
  label: string;
  minWidth?: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = sortField === field;
  return (
    <th
      scope="col"
      aria-sort={isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
      className={`px-3 py-2.5 ${minWidth ?? ""}`}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className="group inline-flex items-center gap-1 text-xs font-semibold uppercase text-wsu-gray-dark hover:text-wsu-crimson focus:outline-none"
      >
        <span>{label}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp aria-hidden="true" className="size-3 text-wsu-crimson" />
          ) : (
            <ArrowDown aria-hidden="true" className="size-3 text-wsu-crimson" />
          )
        ) : (
          <ArrowUpDown aria-hidden="true" className="size-3 text-wsu-gray/40 group-hover:text-wsu-gray" />
        )}
      </button>
    </th>
  );
}

export function FotgsDashboard({
  publication,
  initialSearchParams,
}: {
  publication: PublicFotgsPublication;
  initialSearchParams?: DashboardSearchParams;
}) {
  const options = useMemo(
    () => ({
      appointmentStatuses: unique(publication.records.map((r) => r.appointmentStatus)),
      fotgsStatuses: unique(publication.records.map((r) => r.fotgsStatus)),
      trackStatuses: unique(publication.records.map((r) => r.trackAndStatus)),
    }),
    [publication.records]
  );

  const [query, setQuery] = useState(() => firstParam(initialSearchParams, "q"));
  const [appointmentStatus, setAppointmentStatus] = useState(() =>
    allowedParam(initialSearchParams, "appointment", options.appointmentStatuses)
  );
  const [fotgsStatus, setFotgsStatus] = useState(() =>
    allowedParam(initialSearchParams, "status", options.fotgsStatuses)
  );
  const [trackStatus, setTrackStatus] = useState(() =>
    allowedParam(initialSearchParams, "track", options.trackStatuses)
  );
  const [degreeStatus, setDegreeStatus] = useState(() =>
    completionParam(initialSearchParams, "degree")
  );
  const [rankStatus, setRankStatus] = useState(() =>
    completionParam(initialSearchParams, "rank")
  );
  const [onlyWithResearch, setOnlyWithResearch] = useState(
    () => firstParam(initialSearchParams, "research") === "1"
  );
  const [onlyNeedsReview, setOnlyNeedsReview] = useState(
    () => firstParam(initialSearchParams, "review") === "1"
  );
  // Sorting
  const [sortField, setSortField] = useState<SortField>(() =>
    allowedParam(
      initialSearchParams,
      "sort",
      ["name", "degree", "rank", "track", "fotgs", "appointment"],
      "name"
    ) as SortField
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(() =>
    (allowedParam(initialSearchParams, "dir", ["asc", "desc"], "asc") as SortDirection)
  );

  // Pagination
  const [pageSize, setPageSize] = useState<number>(() => {
    const rawSize = firstParam(initialSearchParams, "size");
    if (!rawSize) return 100;
    const requested = Number(rawSize);
    return [0, 50, 100, 250].includes(requested) ? requested : 100;
  });
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const requested = Number(firstParam(initialSearchParams, "page"));
    return Number.isInteger(requested) && requested > 0 ? requested : 1;
  });

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc"
      );
    } else {
      setSortDirection("asc");
      setSortField(field);
    }
    setCurrentPage(1);
  }, [sortField]);

  const needsReviewCount = useMemo(
    () => publication.records.filter(isNeedsReview).length,
    [publication.records]
  );

  const runDatesDisplay = useMemo(() => {
    return (
      publication.summary.runDates
        .map((d) => formatDashboardDate(d, false))
        .filter(Boolean)
        .join(", ") || "Blank"
    );
  }, [publication.summary.runDates]);

  const publishedDisplay = useMemo(() => {
    return formatDashboardDate(publication.updatedAt, true);
  }, [publication.updatedAt]);

  const filteredRecords = useMemo(() => {
    const rawTerms = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const filtered = publication.records.filter((record) => {
      if (rawTerms.length > 0) {
        const haystack = [
          record.displayName,
          record.lastName,
          record.firstName,
          record.preferredName,
          record.highestDegree,
          record.rank,
          record.trackAndStatus,
          record.fotgsStatus,
          record.appointmentStatus,
        ]
          .join(" ")
          .toLowerCase();

        if (!rawTerms.every((term) => haystack.includes(term))) return false;
      }

      if (appointmentStatus !== ALL && record.appointmentStatus !== appointmentStatus) return false;
      if (fotgsStatus !== ALL && record.fotgsStatus !== fotgsStatus) return false;
      if (trackStatus !== ALL && record.trackAndStatus !== trackStatus) return false;
      if (degreeStatus === INCOMPLETE && !record.workdayDegreeIncomplete) return false;
      if (degreeStatus === COMPLETE && record.workdayDegreeIncomplete) return false;
      if (rankStatus === INCOMPLETE && !record.workdayRankIncomplete) return false;
      if (rankStatus === COMPLETE && record.workdayRankIncomplete) return false;
      if (onlyWithResearch && !record.researchWebpage) return false;
      if (onlyNeedsReview && !isNeedsReview(record)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": {
          const byLast = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
          cmp = byLast !== 0 ? byLast : a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
          break;
        }
        case "degree":
          cmp = a.highestDegree.localeCompare(b.highestDegree, undefined, { sensitivity: "base" });
          break;
        case "rank":
          cmp = a.rank.localeCompare(b.rank, undefined, { sensitivity: "base" });
          break;
        case "track":
          cmp = a.trackAndStatus.localeCompare(b.trackAndStatus, undefined, { sensitivity: "base" });
          break;
        case "fotgs":
          cmp = a.fotgsStatus.localeCompare(b.fotgsStatus, undefined, { sensitivity: "base" });
          break;
        case "appointment":
          cmp = a.appointmentStatus.localeCompare(b.appointmentStatus, undefined, { sensitivity: "base" });
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [
    appointmentStatus,
    degreeStatus,
    fotgsStatus,
    onlyNeedsReview,
    onlyWithResearch,
    publication.records,
    query,
    rankStatus,
    sortDirection,
    sortField,
    trackStatus,
  ]);

  const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredRecords.length / pageSize) || 1;
  const validPage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedRecords = useMemo(() => {
    if (pageSize === 0) return filteredRecords;
    const start = (validPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, pageSize, validPage]);

  const shareQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (fotgsStatus !== ALL) params.set("status", fotgsStatus);
    if (appointmentStatus !== ALL) params.set("appointment", appointmentStatus);
    if (trackStatus !== ALL) params.set("track", trackStatus);
    if (degreeStatus !== ALL) params.set("degree", completionQueryValue(degreeStatus));
    if (rankStatus !== ALL) params.set("rank", completionQueryValue(rankStatus));
    if (onlyWithResearch) params.set("research", "1");
    if (onlyNeedsReview) params.set("review", "1");
    if (sortField !== "name") params.set("sort", sortField);
    if (sortDirection !== "asc") params.set("dir", sortDirection);
    if (pageSize !== 100) params.set("size", String(pageSize));
    if (validPage > 1) params.set("page", String(validPage));
    return params.toString();
  }, [
    appointmentStatus,
    degreeStatus,
    fotgsStatus,
    onlyNeedsReview,
    onlyWithResearch,
    pageSize,
    query,
    rankStatus,
    sortDirection,
    sortField,
    trackStatus,
    validPage,
  ]);

  useEffect(() => {
    const nextUrl = `${window.location.pathname}${shareQueryString ? `?${shareQueryString}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [shareQueryString]);

  const resetFilters = () => {
    setQuery("");
    setAppointmentStatus(ALL);
    setFotgsStatus(ALL);
    setTrackStatus(ALL);
    setDegreeStatus(ALL);
    setRankStatus(ALL);
    setOnlyWithResearch(false);
    setOnlyNeedsReview(false);
    setCurrentPage(1);
  };

  const handleCardClick = (type: MetricFilter) => {
    const isOnlyActive =
      query === "" &&
      fotgsStatus === ALL &&
      trackStatus === ALL &&
      ((type === "current" &&
        appointmentStatus === "Current" &&
        degreeStatus === ALL &&
        rankStatus === ALL &&
        !onlyWithResearch &&
        !onlyNeedsReview) ||
        (type === "needs_review" &&
          appointmentStatus === ALL &&
          degreeStatus === ALL &&
          rankStatus === ALL &&
          !onlyWithResearch &&
          onlyNeedsReview) ||
        (type === "missing_end" &&
          appointmentStatus === "Missing End Date" &&
          degreeStatus === ALL &&
          rankStatus === ALL &&
          !onlyWithResearch &&
          !onlyNeedsReview) ||
        (type === "degree_inc" &&
          appointmentStatus === ALL &&
          degreeStatus === INCOMPLETE &&
          rankStatus === ALL &&
          !onlyWithResearch &&
          !onlyNeedsReview) ||
        (type === "rank_inc" &&
          appointmentStatus === ALL &&
          degreeStatus === ALL &&
          rankStatus === INCOMPLETE &&
          !onlyWithResearch &&
          !onlyNeedsReview) ||
        (type === "research" &&
          appointmentStatus === ALL &&
          degreeStatus === ALL &&
          rankStatus === ALL &&
          onlyWithResearch &&
          !onlyNeedsReview));

    resetFilters();
    if (type === "all" || isOnlyActive) return;

    switch (type) {
      case "current":
        setAppointmentStatus("Current");
        break;
      case "needs_review":
        setOnlyNeedsReview(true);
        break;
      case "missing_end":
        setAppointmentStatus("Missing End Date");
        break;
      case "degree_inc":
        setDegreeStatus(INCOMPLETE);
        break;
      case "rank_inc":
        setRankStatus(INCOMPLETE);
        break;
      case "research":
        setOnlyWithResearch(true);
        break;
    }
  };

  const isAllActive =
    appointmentStatus === ALL &&
    fotgsStatus === ALL &&
    trackStatus === ALL &&
    degreeStatus === ALL &&
    rankStatus === ALL &&
    !onlyWithResearch &&
    !onlyNeedsReview &&
    query === "";

  const metrics = [
    {
      label: "Total faculty",
      value: publication.records.length,
      active: isAllActive,
      onClick: () => handleCardClick("all"),
    },
    {
      label: "Current",
      value: countFor(publication.summary.appointmentStatusCounts, "Current"),
      active: appointmentStatus === "Current",
      onClick: () => handleCardClick("current"),
    },
    {
      label: "Needs review",
      value: needsReviewCount,
      active: onlyNeedsReview,
      onClick: () => handleCardClick("needs_review"),
    },
    {
      label: "Missing end date",
      value: countFor(publication.summary.appointmentStatusCounts, "Missing End Date"),
      active: appointmentStatus === "Missing End Date",
      onClick: () => handleCardClick("missing_end"),
    },
    {
      label: "Degree incomplete",
      value: publication.summary.workdayDegreeIncompleteCount,
      active: degreeStatus === INCOMPLETE,
      onClick: () => handleCardClick("degree_inc"),
    },
    {
      label: "Rank incomplete",
      value: publication.summary.workdayRankIncompleteCount,
      active: rankStatus === INCOMPLETE,
      onClick: () => handleCardClick("rank_inc"),
    },
    {
      label: "Research links",
      value: publication.summary.researchWebpageCount,
      active: onlyWithResearch,
      onClick: () => handleCardClick("research"),
    },
  ];

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-5 border-t-2 border-wsu-crimson pt-4">
        <p className="font-mono text-xs font-medium uppercase text-wsu-crimson">
          Washington State University Graduate School
        </p>
        <h1 className="mt-1 text-3xl font-medium leading-tight text-wsu-gray-dark sm:text-4xl">
          {formatPublicTitle(publication.title)}
        </h1>
        <p className="mt-2 text-sm leading-6 text-wsu-gray">
          Run date: {runDatesDisplay} · Published {publishedDisplay}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3 xl:grid-cols-7" aria-label="Summary statistics">
        {metrics.map((metric) => (
          <button
            key={metric.label}
            type="button"
            onClick={metric.onClick}
            aria-pressed={metric.active}
            className={`min-h-[5.25rem] rounded-lg border bg-white px-3 py-2.5 text-left shadow-sm transition-colors focus:outline-none sm:px-4 sm:py-3 ${
              metric.active
                ? "border-wsu-crimson bg-wsu-red-soft/50 ring-2 ring-wsu-crimson/15"
                : "border-wsu-gray/15 hover:border-wsu-crimson/50 hover:bg-wsu-cream"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase leading-4 text-wsu-gray sm:text-xs">
              {metric.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-wsu-gray-dark sm:text-2xl">
              {metric.value.toLocaleString()}
            </p>
          </button>
        ))}
      </section>

      <details className="mt-4 rounded-lg border border-wsu-gray/15 bg-white px-4 py-3 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-wsu-gray-dark">
          Dashboard notes
        </summary>
        <div className="mt-3 max-w-5xl space-y-3 text-sm leading-relaxed text-wsu-gray-dark">
          <p>
            This dashboard displays WSU Workday faculty academic appointment data. If data is
            missing but the faculty member has an appointment in Workday, confirm that they also
            have an assignment in the myWSU Faculty List.
          </p>
          <p>
            For <strong>Highest Degree</strong> and <strong>Rank</strong>, the label{" "}
            <strong>Workday Data Incomplete</strong> indicates that the relevant source record
            needs follow-up by the faculty member, academic unit HR representative, or graduate
            coordinator.
          </p>
          <p>
            <strong>Needs review</strong> includes each faculty record with a missing end date,
            incomplete degree, or incomplete rank. A record is counted once even when more than
            one item needs attention.
          </p>
        </div>
      </details>

      <section className="mt-5 rounded-lg border border-wsu-gray/15 bg-white p-4 shadow-sm" aria-label="Filters">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr_0.8fr_auto] xl:items-end">
          <label className="block text-sm font-medium text-wsu-gray-dark">
            Name or field search
            <div className="relative mt-1.5">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-wsu-gray" />
              <input
                type="search"
                value={query}
                placeholder="Search names, degree, rank, track, or status"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-md border border-wsu-gray/25 bg-white py-2 pl-9 pr-3 text-sm text-wsu-gray-dark shadow-sm focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson/20"
              />
            </div>
          </label>
          <label className="block text-sm font-medium text-wsu-gray-dark">
            Status
            <select
              value={fotgsStatus}
              onChange={(e) => {
                setFotgsStatus(e.target.value);
                setCurrentPage(1);
              }}
              className={selectClassName()}
            >
              <option value={ALL}>All</option>
              {options.fotgsStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-wsu-gray-dark">
            Appointment status
            <select
              value={appointmentStatus}
              onChange={(e) => {
                setAppointmentStatus(e.target.value);
                setCurrentPage(1);
              }}
              className={selectClassName()}
            >
              <option value={ALL}>All</option>
              {options.appointmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-wsu-gray-dark">
            Track/status
            <select
              value={trackStatus}
              onChange={(e) => {
                setTrackStatus(e.target.value);
                setCurrentPage(1);
              }}
              className={selectClassName()}
            >
              <option value={ALL}>All</option>
              {options.trackStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-wsu-gray-dark">
            Degree
            <select
              value={degreeStatus}
              onChange={(e) => {
                setDegreeStatus(e.target.value);
                setCurrentPage(1);
              }}
              className={selectClassName()}
            >
              <option value={ALL}>All</option>
              <option value={COMPLETE}>Complete</option>
              <option value={INCOMPLETE}>Incomplete</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-wsu-gray-dark">
            Rank
            <select
              value={rankStatus}
              onChange={(e) => {
                setRankStatus(e.target.value);
                setCurrentPage(1);
              }}
              className={selectClassName()}
            >
              <option value={ALL}>All</option>
              <option value={COMPLETE}>Complete</option>
              <option value={INCOMPLETE}>Incomplete</option>
            </select>
          </label>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-wsu-gray/25 bg-white px-3 py-2 text-sm font-semibold text-wsu-gray-dark shadow-sm hover:border-wsu-crimson hover:text-wsu-crimson"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Reset
          </button>
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-wsu-gray-dark">Faculty roster</h2>
            <p className="mt-0.5 text-sm text-wsu-gray" aria-live="polite">
              {filteredRecords.length.toLocaleString()} of{" "}
              {publication.records.length.toLocaleString()} records
            </p>
          </div>
          {filteredRecords.length > 50 ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wsu-gray/20 bg-white px-3 text-xs font-medium text-wsu-gray-dark shadow-xs">
                Page size
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white text-xs text-wsu-gray-dark focus:outline-none"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={0}>All</option>
                </select>
              </label>
            </div>
          ) : null}
        </div>

        <div className="mb-3 grid grid-cols-[1fr_auto] gap-2 md:hidden">
          <label className="text-sm font-medium text-wsu-gray-dark">
            Sort records
            <select
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value as SortField);
                setCurrentPage(1);
              }}
              className={selectClassName()}
            >
              <option value="name">Name</option>
              <option value="degree">Highest degree</option>
              <option value="rank">Rank</option>
              <option value="track">Track/status</option>
              <option value="fotgs">Status</option>
              <option value="appointment">Appointment</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))}
            className="mt-[1.625rem] inline-flex size-10 items-center justify-center rounded-md border border-wsu-gray/20 bg-white text-wsu-gray-dark shadow-xs hover:border-wsu-crimson hover:text-wsu-crimson"
            aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
            title={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
          >
            {sortDirection === "asc" ? (
              <ArrowUp aria-hidden="true" className="size-4" />
            ) : (
              <ArrowDown aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>

        <div className="hidden overflow-x-auto rounded-lg border border-wsu-gray/15 bg-white shadow-sm md:block">
          <table className="min-w-full divide-y divide-wsu-gray/15 text-left text-sm">
            <thead className="bg-wsu-stone/85 text-xs font-semibold uppercase text-wsu-gray-dark">
              <tr>
                <SortableColumnHeader field="name" label="Name" minWidth="min-w-[16rem]" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortableColumnHeader field="degree" label="Highest degree" minWidth="min-w-[15rem]" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortableColumnHeader field="rank" label="Rank" minWidth="min-w-[10rem]" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortableColumnHeader field="track" label="Track/status" minWidth="min-w-[14rem]" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortableColumnHeader field="fotgs" label="Status" minWidth="min-w-[12rem]" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortableColumnHeader field="appointment" label="Appointment" minWidth="min-w-[10rem]" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase text-wsu-gray-dark">
                  Research Website
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wsu-gray/10 bg-white">
              {paginatedRecords.map((record, index) => (
                <FacultyRow
                  key={`${record.lastName}-${record.firstName}-${(validPage - 1) * (pageSize || filteredRecords.length) + index}`}
                  record={record}
                />
              ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 ? (
            <p className="px-4 py-8 text-sm text-wsu-gray">No rows match the current filters.</p>
          ) : null}
        </div>

        <div className="grid gap-2 md:hidden">
          {paginatedRecords.map((record, index) => (
            <FacultyCard
              key={`${record.lastName}-${record.firstName}-${(validPage - 1) * (pageSize || filteredRecords.length) + index}`}
              record={record}
            />
          ))}
          {filteredRecords.length === 0 ? (
            <p className="rounded-lg border border-wsu-gray/15 bg-white px-4 py-8 text-sm text-wsu-gray shadow-sm">
              No records match the current filters.
            </p>
          ) : null}
        </div>

        {totalPages > 1 && pageSize > 0 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-wsu-gray">
            <span>
              Showing {((validPage - 1) * pageSize + 1).toLocaleString()}–{Math.min(validPage * pageSize, filteredRecords.length).toLocaleString()} of {filteredRecords.length.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={validPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="inline-flex items-center gap-1 rounded border border-wsu-gray/20 bg-white px-2 py-1 text-xs font-medium text-wsu-gray-dark shadow-xs hover:bg-wsu-cream disabled:opacity-40 disabled:hover:bg-white"
              >
                <ChevronLeft aria-hidden="true" className="size-3" />
                Previous
              </button>
              <span className="px-2 font-semibold text-wsu-gray-dark">
                {validPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={validPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="inline-flex items-center gap-1 rounded border border-wsu-gray/20 bg-white px-2 py-1 text-xs font-medium text-wsu-gray-dark shadow-xs hover:bg-wsu-cream disabled:opacity-40 disabled:hover:bg-white"
              >
                Next
                <ChevronRight aria-hidden="true" className="size-3" />
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function FacultyRow({ record }: { record: FotgsFacultyRecordPublic }) {
  return (
    <tr className="align-top hover:bg-wsu-cream/45">
      <td className="px-3 py-3 font-semibold text-wsu-gray-dark">
        {record.displayName}
      </td>
      <td className="px-3 py-3 text-wsu-gray-dark">
        <WorkdayValue value={record.highestDegree} incomplete={record.workdayDegreeIncomplete} />
      </td>
      <td className="px-3 py-3 text-wsu-gray-dark">
        <WorkdayValue value={record.rank} incomplete={record.workdayRankIncomplete} />
      </td>
      <td className="px-3 py-3 text-wsu-gray-dark">{record.trackAndStatus || "Blank"}</td>
      <td className="px-3 py-3 text-wsu-gray-dark">{record.fotgsStatus || "Blank"}</td>
      <td className="px-3 py-3">
        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${appointmentBadgeClass(record.appointmentStatus)}`}>
          {record.appointmentStatus || "Blank"}
        </span>
      </td>
      <td className="px-3 py-3">
        {record.researchWebpage ? (
          <a
            href={record.researchWebpage}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${record.displayName}'s research website in a new tab`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-wsu-crimson hover:underline"
          >
            Open
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        ) : null}
      </td>
    </tr>
  );
}

function FacultyCard({ record }: { record: FotgsFacultyRecordPublic }) {
  return (
    <article className="faculty-card rounded-lg border border-wsu-gray/15 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-wsu-gray/10 pb-3">
        <h3 className="text-base font-semibold leading-6 text-wsu-gray-dark">
          {record.displayName}
        </h3>
        <span
          className={`inline-flex shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${appointmentBadgeClass(record.appointmentStatus)}`}
        >
          {record.appointmentStatus || "Blank"}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="col-span-2">
          <dt className="text-xs font-semibold uppercase text-wsu-gray">Highest degree</dt>
          <dd className="mt-1 text-wsu-gray-dark">
            <WorkdayValue value={record.highestDegree} incomplete={record.workdayDegreeIncomplete} />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-wsu-gray">Rank</dt>
          <dd className="mt-1 text-wsu-gray-dark">
            <WorkdayValue value={record.rank} incomplete={record.workdayRankIncomplete} />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-wsu-gray">Status</dt>
          <dd className="mt-1 text-wsu-gray-dark">{record.fotgsStatus || "Blank"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-semibold uppercase text-wsu-gray">Track/status</dt>
          <dd className="mt-1 text-wsu-gray-dark">{record.trackAndStatus || "Blank"}</dd>
        </div>
      </dl>
      {record.researchWebpage ? (
        <a
          href={record.researchWebpage}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border border-wsu-crimson px-3 py-2 text-sm font-semibold text-wsu-crimson hover:bg-wsu-red-soft"
        >
          Research website
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
      ) : null}
    </article>
  );
}
