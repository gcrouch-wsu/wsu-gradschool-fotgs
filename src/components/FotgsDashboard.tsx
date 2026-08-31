"use client";

import { useMemo, useState } from "react";
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
import type { FotgsFacultyRecordPublic, PublicFotgsPublication } from "@/lib/types";

const ALL = "__all__";
const INCOMPLETE = "__incomplete__";
const COMPLETE = "__complete__";

type SortField = "name" | "degree" | "rank" | "track" | "fotgs" | "appointment";
type SortDirection = "asc" | "desc";

export function formatDashboardDate(raw: string | null | undefined, includeTime = false): string {
  if (!raw) return "Blank";
  const trimmed = String(raw).trim();
  if (!trimmed) return "Blank";

  const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  let d: Date;
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    const second = match[6] ? parseInt(match[6], 10) : 0;
    if (hour === 0 && minute === 0 && second === 0 && !trimmed.includes("T")) {
      d = new Date(year, month, day);
    } else {
      d = new Date(trimmed);
    }
  } else {
    d = new Date(trimmed);
  }

  if (Number.isNaN(d.getTime())) return trimmed;

  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;

  if (includeTime && hasTime) {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  return "mt-1.5 w-full rounded-md border border-wsu-gray/25 bg-white px-3 py-2 text-sm text-wsu-gray-dark shadow-sm focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson/20";
}

export function FotgsDashboard({ publication }: { publication: PublicFotgsPublication }) {
  const [query, setQuery] = useState("");
  const [appointmentStatus, setAppointmentStatus] = useState(ALL);
  const [fotgsStatus, setFotgsStatus] = useState(ALL);
  const [trackStatus, setTrackStatus] = useState(ALL);
  const [degreeStatus, setDegreeStatus] = useState(ALL);
  const [rankStatus, setRankStatus] = useState(ALL);
  const [onlyWithResearch, setOnlyWithResearch] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Pagination
  const [pageSize, setPageSize] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const options = useMemo(
    () => ({
      appointmentStatuses: unique(publication.records.map((r) => r.appointmentStatus)),
      fotgsStatuses: unique(publication.records.map((r) => r.fotgsStatus)),
      trackStatuses: unique(publication.records.map((r) => r.trackAndStatus)),
    }),
    [publication.records]
  );

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  }

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

  const resetFilters = () => {
    setQuery("");
    setAppointmentStatus(ALL);
    setFotgsStatus(ALL);
    setTrackStatus(ALL);
    setDegreeStatus(ALL);
    setRankStatus(ALL);
    setOnlyWithResearch(false);
    setCurrentPage(1);
  };

  // Single-select card filter handler: clicking one sets ONLY that filter; clicking active again turns it off
  const handleCardClick = (type: "all" | "current" | "ended" | "missing_end" | "degree_inc" | "rank_inc" | "research") => {
    setCurrentPage(1);
    switch (type) {
      case "all":
        resetFilters();
        break;
      case "current":
        if (appointmentStatus === "Current" && !onlyWithResearch && degreeStatus === ALL && rankStatus === ALL) {
          setAppointmentStatus(ALL);
        } else {
          setAppointmentStatus("Current");
          setDegreeStatus(ALL);
          setRankStatus(ALL);
          setOnlyWithResearch(false);
        }
        break;
      case "ended":
        if (appointmentStatus === "Ended" && !onlyWithResearch && degreeStatus === ALL && rankStatus === ALL) {
          setAppointmentStatus(ALL);
        } else {
          setAppointmentStatus("Ended");
          setDegreeStatus(ALL);
          setRankStatus(ALL);
          setOnlyWithResearch(false);
        }
        break;
      case "missing_end":
        if (appointmentStatus === "Missing End Date" && !onlyWithResearch && degreeStatus === ALL && rankStatus === ALL) {
          setAppointmentStatus(ALL);
        } else {
          setAppointmentStatus("Missing End Date");
          setDegreeStatus(ALL);
          setRankStatus(ALL);
          setOnlyWithResearch(false);
        }
        break;
      case "degree_inc":
        if (degreeStatus === INCOMPLETE && appointmentStatus === ALL && !onlyWithResearch && rankStatus === ALL) {
          setDegreeStatus(ALL);
        } else {
          setDegreeStatus(INCOMPLETE);
          setAppointmentStatus(ALL);
          setRankStatus(ALL);
          setOnlyWithResearch(false);
        }
        break;
      case "rank_inc":
        if (rankStatus === INCOMPLETE && appointmentStatus === ALL && !onlyWithResearch && degreeStatus === ALL) {
          setRankStatus(ALL);
        } else {
          setRankStatus(INCOMPLETE);
          setAppointmentStatus(ALL);
          setDegreeStatus(ALL);
          setOnlyWithResearch(false);
        }
        break;
      case "research":
        if (onlyWithResearch && appointmentStatus === ALL && degreeStatus === ALL && rankStatus === ALL) {
          setOnlyWithResearch(false);
        } else {
          setOnlyWithResearch(true);
          setAppointmentStatus(ALL);
          setDegreeStatus(ALL);
          setRankStatus(ALL);
        }
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
      label: "Ended",
      value: countFor(publication.summary.appointmentStatusCounts, "Ended"),
      active: appointmentStatus === "Ended",
      onClick: () => handleCardClick("ended"),
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

  function SortableColumnHeader({
    field,
    label,
    minWidth,
  }: {
    field: SortField;
    label: string;
    minWidth?: string;
  }) {
    const isActive = sortField === field;
    return (
      <th scope="col" className={`px-3 py-2.5 ${minWidth ?? ""}`}>
        <button
          type="button"
          onClick={() => handleSort(field)}
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

  return (
    <main className="mx-auto max-w-[88rem] px-4 py-8 lg:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-wsu-gray-dark sm:text-3xl">
          {publication.title}
        </h1>
        <p className="mt-2 text-sm text-wsu-gray">
          Run date: {runDatesDisplay} · Published {publishedDisplay}
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7" aria-label="Summary statistics">
        {metrics.map((metric) => (
          <button
            key={metric.label}
            type="button"
            onClick={metric.onClick}
            className={`rounded-lg border bg-white px-4 py-3 text-left shadow-sm transition-all focus:outline-none ${
              metric.active
                ? "border-wsu-crimson ring-2 ring-wsu-crimson/20 bg-wsu-red-soft/20"
                : "border-wsu-gray/15 hover:border-wsu-gray/30 hover:bg-wsu-cream/30"
            }`}
          >
            <p className="text-xs font-semibold uppercase text-wsu-gray">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold text-wsu-gray-dark">
              {metric.value.toLocaleString()}
            </p>
          </button>
        ))}
      </section>

      <details className="mt-5 rounded-lg border border-wsu-gray/15 bg-white px-4 py-3 shadow-sm">
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
            For `Highest Degree` and `Rank`, `Workday Data Incomplete` indicates that the relevant
            source record needs follow-up by the faculty member, academic unit HR representative,
            or graduate coordinator.
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
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-md border border-wsu-gray/25 bg-white py-2 pl-9 pr-3 text-sm text-wsu-gray-dark shadow-sm focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson/20"
              />
            </div>
          </label>
          <label className="block text-sm font-medium text-wsu-gray-dark">
            FOTGS status
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
            className="inline-flex items-center justify-center gap-2 rounded-md border border-wsu-gray/25 bg-white px-3 py-2 text-sm font-semibold text-wsu-gray-dark shadow-sm hover:bg-wsu-cream"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Reset
          </button>
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-wsu-gray-dark">
            Faculty roster
          </h2>
          <div className="flex items-center gap-3 text-sm text-wsu-gray">
            <span>
              {filteredRecords.length.toLocaleString()} of {publication.records.length.toLocaleString()} rows
            </span>
            {filteredRecords.length > 50 ? (
              <div className="flex items-center gap-1.5 text-xs">
                <label htmlFor="per-page-select" className="text-wsu-gray">Page size:</label>
                <select
                  id="per-page-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded border border-wsu-gray/20 bg-white px-1.5 py-0.5 text-xs text-wsu-gray-dark shadow-xs"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={0}>All</option>
                </select>
              </div>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-wsu-gray/15 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-wsu-gray/15 text-left text-sm">
            <thead className="bg-wsu-cream/85 text-xs font-semibold uppercase text-wsu-gray-dark">
              <tr>
                <SortableColumnHeader field="name" label="Name" minWidth="min-w-[16rem]" />
                <SortableColumnHeader field="degree" label="Highest degree" minWidth="min-w-[15rem]" />
                <SortableColumnHeader field="rank" label="Rank" minWidth="min-w-[10rem]" />
                <SortableColumnHeader field="track" label="Track/status" minWidth="min-w-[14rem]" />
                <SortableColumnHeader field="fotgs" label="FOTGS status" minWidth="min-w-[12rem]" />
                <SortableColumnHeader field="appointment" label="Appointment" minWidth="min-w-[10rem]" />
                <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase text-wsu-gray-dark">
                  Research
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

        {totalPages > 1 && pageSize > 0 ? (
          <div className="mt-3 flex items-center justify-between text-xs text-wsu-gray">
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
                <ChevronLeft className="size-3" />
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
                <ChevronRight className="size-3" />
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
      {/* Name: Single clean line, no duplicate line underneath */}
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
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-wsu-crimson hover:underline"
          >
            Open
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        ) : (
          <span className="text-wsu-gray">Blank</span>
        )}
      </td>
    </tr>
  );
}
