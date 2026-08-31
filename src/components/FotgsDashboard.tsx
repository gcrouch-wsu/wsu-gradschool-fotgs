"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Filter,
  GraduationCap,
  History,
  Info,
  Link as LinkIcon,
  RotateCcw,
  Search,
  SlidersHorizontal,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import type { FotgsFacultyRecordPublic, PublicFotgsPublication } from "@/lib/types";

const ALL = "__all__";
const INCOMPLETE = "__incomplete__";
const COMPLETE = "__complete__";
const HAS_LINK = "__has_link__";

type SortField = "name" | "degree" | "rank" | "track" | "fotgs" | "appointment";
type SortDirection = "asc" | "desc";

export function formatDashboardDate(raw: string | null | undefined, includeTime = false): string {
  if (!raw) return "N/A";
  const trimmed = String(raw).trim();
  if (!trimmed) return "N/A";

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
  if (normalized === "current") {
    return "bg-emerald-50 text-emerald-800 border-emerald-200/80";
  }
  if (normalized === "ended") {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }
  if (normalized === "missing end date") {
    return "bg-amber-50 text-amber-900 border-amber-200";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function WorkdayValue({ value, incomplete }: { value: string; incomplete: boolean }) {
  if (!incomplete) return <span className="text-slate-800">{value || "—"}</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-950 shadow-xs">
      <AlertTriangle aria-hidden="true" className="size-3 text-amber-700 shrink-0" />
      Workday Data Incomplete
    </span>
  );
}

function escapeCsvCell(val: string | null | undefined): string {
  const s = String(val ?? "").trim();
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function FotgsDashboard({
  publication,
  isSnapshot = false,
}: {
  publication: PublicFotgsPublication;
  isSnapshot?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [appointmentStatus, setAppointmentStatus] = useState(ALL);
  const [fotgsStatus, setFotgsStatus] = useState(ALL);
  const [trackStatus, setTrackStatus] = useState(ALL);
  const [degreeStatus, setDegreeStatus] = useState(ALL);
  const [rankStatus, setRankStatus] = useState(ALL);
  const [researchFilter, setResearchFilter] = useState(ALL);
  const [showNotes, setShowNotes] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
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

  const formattedRunDates = useMemo(() => {
    return (
      publication.summary.runDates
        .map((d) => formatDashboardDate(d, false))
        .filter(Boolean)
        .join(", ") || "N/A"
    );
  }, [publication.summary.runDates]);

  const formattedPublishedDate = useMemo(() => {
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

        if (!rawTerms.every((term) => haystack.includes(term))) {
          return false;
        }
      }

      if (appointmentStatus !== ALL && record.appointmentStatus !== appointmentStatus) return false;
      if (fotgsStatus !== ALL && record.fotgsStatus !== fotgsStatus) return false;
      if (trackStatus !== ALL && record.trackAndStatus !== trackStatus) return false;
      if (degreeStatus === INCOMPLETE && !record.workdayDegreeIncomplete) return false;
      if (degreeStatus === COMPLETE && record.workdayDegreeIncomplete) return false;
      if (rankStatus === INCOMPLETE && !record.workdayRankIncomplete) return false;
      if (rankStatus === COMPLETE && record.workdayRankIncomplete) return false;
      if (researchFilter === HAS_LINK && !record.researchWebpage) return false;
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
    publication.records,
    query,
    rankStatus,
    researchFilter,
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

  const hasActiveFilters =
    query.trim() !== "" ||
    appointmentStatus !== ALL ||
    fotgsStatus !== ALL ||
    trackStatus !== ALL ||
    degreeStatus !== ALL ||
    rankStatus !== ALL ||
    researchFilter !== ALL;

  const resetFilters = () => {
    setQuery("");
    setAppointmentStatus(ALL);
    setFotgsStatus(ALL);
    setTrackStatus(ALL);
    setDegreeStatus(ALL);
    setRankStatus(ALL);
    setResearchFilter(ALL);
    setSortField("name");
    setSortDirection("asc");
    setCurrentPage(1);
  };

  const handleExportCsv = () => {
    const headers = [
      "Updated On",
      "Display Name",
      "Last Name",
      "First Name",
      "Preferred Name",
      "Highest Degree",
      "Rank",
      "Track and Status",
      "Faculty of the Graduate School Status",
      "Appointment Status",
      "Research Webpage",
    ];

    const rows = filteredRecords.map((r) => [
      escapeCsvCell(r.updatedOn),
      escapeCsvCell(r.displayName),
      escapeCsvCell(r.lastName),
      escapeCsvCell(r.firstName),
      escapeCsvCell(r.preferredName),
      escapeCsvCell(r.highestDegree),
      escapeCsvCell(r.rank),
      escapeCsvCell(r.trackAndStatus),
      escapeCsvCell(r.fotgsStatus),
      escapeCsvCell(r.appointmentStatus),
      escapeCsvCell(r.researchWebpage ?? ""),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fotgs-faculty-roster-${publication.slug || "export"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  function SortHeader({
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
      <th
        scope="col"
        aria-sort={isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
        className={`px-3.5 py-3 text-left ${minWidth ?? ""}`}
      >
        <button
          type="button"
          onClick={() => handleSort(field)}
          className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-wsu-crimson focus:outline-none"
        >
          <span>{label}</span>
          {isActive ? (
            sortDirection === "asc" ? (
              <ArrowUp aria-hidden="true" className="size-3.5 text-wsu-crimson stroke-[2.5]" />
            ) : (
              <ArrowDown aria-hidden="true" className="size-3.5 text-wsu-crimson stroke-[2.5]" />
            )
          ) : (
            <ArrowUpDown aria-hidden="true" className="size-3.5 text-slate-400 group-hover:text-slate-600" />
          )}
        </button>
      </th>
    );
  }

  // Tableau Scorecard Tiles
  const scorecards = [
    {
      label: "Total Faculty",
      value: publication.records.length,
      icon: Users,
      color: "text-slate-800",
      accent: "bg-slate-700",
      active: !hasActiveFilters,
      onClick: resetFilters,
      tooltip: "Total faculty records",
    },
    {
      label: "Current Appointments",
      value: countFor(publication.summary.appointmentStatusCounts, "Current"),
      icon: UserCheck,
      color: "text-emerald-700",
      accent: "bg-emerald-600",
      active: appointmentStatus === "Current",
      onClick: () => {
        setAppointmentStatus((prev) => (prev === "Current" ? ALL : "Current"));
        setCurrentPage(1);
      },
      tooltip: "Click to filter current appointments",
    },
    {
      label: "Ended Appointments",
      value: countFor(publication.summary.appointmentStatusCounts, "Ended"),
      icon: UserX,
      color: "text-rose-700",
      accent: "bg-rose-600",
      active: appointmentStatus === "Ended",
      onClick: () => {
        setAppointmentStatus((prev) => (prev === "Ended" ? ALL : "Ended"));
        setCurrentPage(1);
      },
      tooltip: "Click to filter ended appointments",
    },
    {
      label: "Missing End Date",
      value: countFor(publication.summary.appointmentStatusCounts, "Missing End Date"),
      icon: AlertTriangle,
      color: "text-amber-700",
      accent: "bg-amber-600",
      active: appointmentStatus === "Missing End Date",
      onClick: () => {
        setAppointmentStatus((prev) => (prev === "Missing End Date" ? ALL : "Missing End Date"));
        setCurrentPage(1);
      },
      tooltip: "Click to filter missing end date",
    },
    {
      label: "Degree Incomplete",
      value: publication.summary.workdayDegreeIncompleteCount,
      icon: GraduationCap,
      color: "text-amber-800",
      accent: "bg-amber-700",
      active: degreeStatus === INCOMPLETE,
      onClick: () => {
        setDegreeStatus((prev) => (prev === INCOMPLETE ? ALL : INCOMPLETE));
        setCurrentPage(1);
      },
      tooltip: "Click to filter incomplete degree records",
    },
    {
      label: "Rank Incomplete",
      value: publication.summary.workdayRankIncompleteCount,
      icon: BookOpen,
      color: "text-amber-800",
      accent: "bg-amber-700",
      active: rankStatus === INCOMPLETE,
      onClick: () => {
        setRankStatus((prev) => (prev === INCOMPLETE ? ALL : INCOMPLETE));
        setCurrentPage(1);
      },
      tooltip: "Click to filter incomplete rank records",
    },
    {
      label: "Research Links",
      value: publication.summary.researchWebpageCount,
      icon: LinkIcon,
      color: "text-wsu-crimson",
      accent: "bg-wsu-crimson",
      active: researchFilter === HAS_LINK,
      onClick: () => {
        setResearchFilter((prev) => (prev === HAS_LINK ? ALL : HAS_LINK));
        setCurrentPage(1);
      },
      tooltip: "Click to filter records with research webpage",
    },
  ];

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-8">
      {/* Archival snapshot banner if applicable */}
      {isSnapshot ? (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <History className="size-5 shrink-0 text-amber-800" />
            <p className="text-sm font-medium">
              <strong>Archival Snapshot ({publication.slug}):</strong> Run Date: {formattedRunDates} · Published: {formattedPublishedDate}
            </p>
          </div>
          <Link
            href="/view"
            className="inline-flex items-center gap-1.5 self-start rounded-md bg-white px-3.5 py-1.5 text-xs font-bold text-wsu-crimson shadow-xs hover:bg-amber-100 sm:self-center"
          >
            View current live roster →
          </Link>
        </div>
      ) : null}

      {/* Dashboard Title & Meta Ribbon */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-6 w-1.5 rounded-full bg-wsu-crimson"></span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {publication.title}
            </h1>
          </div>
          <p className="mt-1.5 text-sm font-medium text-slate-600">
            Run date: <strong className="text-slate-800">{formattedRunDates}</strong> · Published: <strong className="text-slate-800">{formattedPublishedDate}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Info className="size-3.5 text-wsu-crimson" />
            <span>{showNotes ? "Hide Guidance" : "Workday Guidance"}</span>
            <ChevronDown className={`size-3.5 text-slate-400 transition-transform ${showNotes ? "rotate-180" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-md bg-wsu-crimson px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-wsu-crimson-dark transition-colors"
          >
            <Download aria-hidden="true" className="size-3.5" />
            <span>Export CSV ({filteredRecords.length.toLocaleString()})</span>
          </button>
        </div>
      </div>

      {/* Tableau Scorecard Summary Metrics Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7" aria-label="Summary KPIs">
        {scorecards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={card.onClick}
              title={card.tooltip}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-lg border bg-white p-3.5 text-left shadow-xs transition-all hover:shadow-md focus:outline-none ${
                card.active
                  ? "border-wsu-crimson ring-2 ring-wsu-crimson/20 bg-wsu-red-soft/20"
                  : "border-slate-200/90 hover:border-slate-300"
              }`}
            >
              {/* Top colored accent line */}
              <div className={`absolute left-0 top-0 h-1 w-full ${card.accent}`} />

              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-800">
                  {card.label}
                </span>
                <Icon className={`size-4 ${card.color} opacity-80 group-hover:opacity-100 shrink-0`} />
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {card.value.toLocaleString()}
                </span>
                {card.active && hasActiveFilters ? (
                  <span className="rounded bg-wsu-crimson/10 px-1.5 py-0.5 text-[10px] font-bold text-wsu-crimson">
                    Filtered
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </section>

      {/* Dashboard Overview & Workday Action Guidance */}
      {showNotes ? (
        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs transition-all">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 font-bold text-slate-900">
            <Info className="size-4 text-wsu-crimson" />
            <h2 className="text-sm uppercase tracking-wider">Dashboard Overview &amp; Workday Actions</h2>
          </div>

          <div className="mt-4 grid gap-5 lg:grid-cols-3">
            <div className="rounded-md border border-slate-100 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-700">
              <h3 className="font-bold text-slate-900 text-sm mb-1.5">Overview</h3>
              <p>
                This dashboard displays WSU Workday faculty academic appointment data. If data is missing but
                the faculty member has an appointment in Workday, confirm that they also have an assignment in
                the <strong>myWSU Faculty List</strong>.
              </p>
            </div>

            <div className="rounded-md border border-amber-100 bg-amber-50/50 p-4 text-xs leading-relaxed text-slate-700">
              <h3 className="font-bold text-amber-950 text-sm mb-1.5">Workday Incomplete Actions</h3>
              <p className="mb-2">
                For <strong>Highest Degree</strong> and <strong>Rank</strong>, <code className="rounded bg-amber-100 px-1 text-amber-900 font-semibold">Workday Data Incomplete</code> indicates required follow-up:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Faculty:</strong> Update highest degree in Workday profile.</li>
                <li><strong>HR Reps:</strong> Update academic rank in Workday.</li>
                <li><strong>Coordinators:</strong> Update myWSU Faculty List assignments.</li>
              </ul>
            </div>

            <div className="rounded-md border border-slate-100 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-700">
              <h3 className="font-bold text-slate-900 text-sm mb-1.5">Data Refresh &amp; Matching</h3>
              <p>
                All records reflect data as of the OBIEE run date. Identity mapping uses secure hashing to protect employee IDs while preserving exact record continuity across snapshot versions.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Tableau-Style Filter Ribbon */}
      <section className="mt-5 rounded-lg border border-slate-200/90 bg-white p-4 shadow-xs" aria-label="Search and filter controls">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <SlidersHorizontal className="size-4 text-wsu-crimson" />
            <span>Search &amp; Filter Controls</span>
          </div>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-wsu-crimson hover:underline"
            >
              <RotateCcw className="size-3" />
              Reset all filters
            </button>
          ) : null}
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-[1.5fr_1fr_1fr_1fr_0.9fr_0.9fr]">
          {/* Keyword Search */}
          <div>
            <label htmlFor="filter-search" className="block text-xs font-bold text-slate-700">
              Name or keyword
            </label>
            <div className="relative mt-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="filter-search"
                type="search"
                value={query}
                placeholder="Search faculty..."
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-9 pr-8 text-xs text-slate-800 shadow-xs placeholder:text-slate-400 focus:border-wsu-crimson focus:outline-none focus:ring-1 focus:ring-wsu-crimson"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {/* FOTGS Status */}
          <div>
            <label htmlFor="filter-fotgs" className="block text-xs font-bold text-slate-700">
              FOTGS status
            </label>
            <select
              id="filter-fotgs"
              value={fotgsStatus}
              onChange={(e) => {
                setFotgsStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-xs focus:border-wsu-crimson focus:outline-none focus:ring-1 focus:ring-wsu-crimson"
            >
              <option value={ALL}>All statuses</option>
              {options.fotgsStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Appointment Status */}
          <div>
            <label htmlFor="filter-appointment" className="block text-xs font-bold text-slate-700">
              Appointment
            </label>
            <select
              id="filter-appointment"
              value={appointmentStatus}
              onChange={(e) => {
                setAppointmentStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-xs focus:border-wsu-crimson focus:outline-none focus:ring-1 focus:ring-wsu-crimson"
            >
              <option value={ALL}>All appointments</option>
              {options.appointmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Track and Status */}
          <div>
            <label htmlFor="filter-track" className="block text-xs font-bold text-slate-700">
              Track / status
            </label>
            <select
              id="filter-track"
              value={trackStatus}
              onChange={(e) => {
                setTrackStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-xs focus:border-wsu-crimson focus:outline-none focus:ring-1 focus:ring-wsu-crimson"
            >
              <option value={ALL}>All tracks</option>
              {options.trackStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Degree Status */}
          <div>
            <label htmlFor="filter-degree" className="block text-xs font-bold text-slate-700">
              Degree
            </label>
            <select
              id="filter-degree"
              value={degreeStatus}
              onChange={(e) => {
                setDegreeStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-xs focus:border-wsu-crimson focus:outline-none focus:ring-1 focus:ring-wsu-crimson"
            >
              <option value={ALL}>All</option>
              <option value={COMPLETE}>Complete</option>
              <option value={INCOMPLETE}>Incomplete</option>
            </select>
          </div>

          {/* Rank Status */}
          <div>
            <label htmlFor="filter-rank" className="block text-xs font-bold text-slate-700">
              Rank
            </label>
            <select
              id="filter-rank"
              value={rankStatus}
              onChange={(e) => {
                setRankStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-xs focus:border-wsu-crimson focus:outline-none focus:ring-1 focus:ring-wsu-crimson"
            >
              <option value={ALL}>All</option>
              <option value={COMPLETE}>Complete</option>
              <option value={INCOMPLETE}>Incomplete</option>
            </select>
          </div>
        </div>

        {/* Active Filter Badges Ribbon */}
        {hasActiveFilters ? (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
            <span className="text-[11px] font-semibold text-slate-500">Active filters:</span>
            {query ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                Search: &quot;{query}&quot;
                <button type="button" onClick={() => setQuery("")} className="hover:text-wsu-crimson">
                  <X className="size-3" />
                </button>
              </span>
            ) : null}
            {fotgsStatus !== ALL ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                FOTGS: {fotgsStatus}
                <button type="button" onClick={() => setFotgsStatus(ALL)} className="hover:text-wsu-crimson">
                  <X className="size-3" />
                </button>
              </span>
            ) : null}
            {appointmentStatus !== ALL ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                Appointment: {appointmentStatus}
                <button type="button" onClick={() => setAppointmentStatus(ALL)} className="hover:text-wsu-crimson">
                  <X className="size-3" />
                </button>
              </span>
            ) : null}
            {trackStatus !== ALL ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                Track: {trackStatus}
                <button type="button" onClick={() => setTrackStatus(ALL)} className="hover:text-wsu-crimson">
                  <X className="size-3" />
                </button>
              </span>
            ) : null}
            {degreeStatus !== ALL ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                Degree: {degreeStatus === INCOMPLETE ? "Incomplete" : "Complete"}
                <button type="button" onClick={() => setDegreeStatus(ALL)} className="hover:text-wsu-crimson">
                  <X className="size-3" />
                </button>
              </span>
            ) : null}
            {rankStatus !== ALL ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                Rank: {rankStatus === INCOMPLETE ? "Incomplete" : "Complete"}
                <button type="button" onClick={() => setRankStatus(ALL)} className="hover:text-wsu-crimson">
                  <X className="size-3" />
                </button>
              </span>
            ) : null}
            {researchFilter !== ALL ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                Has Research Webpage
                <button type="button" onClick={() => setResearchFilter(ALL)} className="hover:text-wsu-crimson">
                  <X className="size-3" />
                </button>
              </span>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Tableau-Style Data Table Card */}
      <section className="mt-5 rounded-lg border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Faculty Directory Roster
            </h2>
            <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-xs">
              {filteredRecords.length.toLocaleString()} matching
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="table-page-size" className="text-xs font-semibold text-slate-600">
              Rows per page:
            </label>
            <select
              id="table-page-size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 shadow-xs focus:border-wsu-crimson focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={0}>All rows</option>
            </select>
          </div>
        </div>

        {/* Scrollable Table Container */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <SortHeader field="name" label="Faculty Name" minWidth="min-w-[16rem]" />
                <SortHeader field="degree" label="Highest Degree" minWidth="min-w-[15rem]" />
                <SortHeader field="rank" label="Rank" minWidth="min-w-[11rem]" />
                <SortHeader field="track" label="Track / Status" minWidth="min-w-[14rem]" />
                <SortHeader field="fotgs" label="FOTGS Status" minWidth="min-w-[13rem]" />
                <SortHeader field="appointment" label="Appointment" minWidth="min-w-[11rem]" />
                <th scope="col" className="px-3.5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 whitespace-nowrap">
                  Research
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedRecords.map((record, index) => (
                <FacultyRow
                  key={`${record.lastName}-${record.firstName}-${(validPage - 1) * (pageSize || filteredRecords.length) + index}`}
                  record={record}
                  isEven={index % 2 === 1}
                />
              ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Filter className="mx-auto size-8 text-slate-300 mb-2" />
              <p className="text-base font-bold text-slate-800">No faculty records match your criteria</p>
              <p className="mt-1 text-xs text-slate-500">Try adjusting your filters or clearing search terms.</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-md bg-wsu-crimson px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-wsu-crimson-dark"
              >
                <RotateCcw className="size-3.5" />
                Reset all filters
              </button>
            </div>
          ) : null}
        </div>

        {/* Bottom Pagination Bar */}
        {totalPages > 1 && pageSize > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-600">
            <div>
              Showing <strong>{((validPage - 1) * pageSize + 1).toLocaleString()}</strong> to{" "}
              <strong>{Math.min(validPage * pageSize, filteredRecords.length).toLocaleString()}</strong> of{" "}
              <strong>{filteredRecords.length.toLocaleString()}</strong> results
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={validPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                title="First Page"
              >
                First
              </button>
              <button
                type="button"
                disabled={validPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
              >
                <ChevronLeft className="size-3.5" />
                Prev
              </button>

              <span className="px-2 font-bold text-slate-800">
                Page {validPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={validPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
              >
                Next
                <ChevronRight className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={validPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                title="Last Page"
              >
                Last
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-500">
            Showing all {filteredRecords.length.toLocaleString()} matching faculty records
          </div>
        )}
      </section>
    </main>
  );
}

function FacultyRow({
  record,
  isEven,
}: {
  record: FotgsFacultyRecordPublic;
  isEven: boolean;
}) {
  return (
    <tr className={`align-middle transition-colors hover:bg-amber-50/30 ${isEven ? "bg-slate-50/30" : "bg-white"}`}>
      {/* Name */}
      <td className="px-3.5 py-3">
        <p className="font-bold text-slate-900">{record.displayName}</p>
        <p className="text-[11px] text-slate-500 font-medium">
          {[record.lastName, record.firstName].filter(Boolean).join(", ")}
        </p>
      </td>

      {/* Highest Degree */}
      <td className="px-3.5 py-3">
        <WorkdayValue value={record.highestDegree} incomplete={record.workdayDegreeIncomplete} />
      </td>

      {/* Rank */}
      <td className="px-3.5 py-3">
        <WorkdayValue value={record.rank} incomplete={record.workdayRankIncomplete} />
      </td>

      {/* Track and Status */}
      <td className="px-3.5 py-3 text-slate-800">{record.trackAndStatus || "—"}</td>

      {/* FOTGS Status */}
      <td className="px-3.5 py-3 text-slate-800">{record.fotgsStatus || "—"}</td>

      {/* Appointment Status */}
      <td className="px-3.5 py-3">
        <span
          className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold shadow-xs ${appointmentBadgeClass(
            record.appointmentStatus
          )}`}
        >
          {record.appointmentStatus || "—"}
        </span>
      </td>

      {/* Research Webpage */}
      <td className="px-3.5 py-3">
        {record.researchWebpage ? (
          <a
            href={record.researchWebpage}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-wsu-crimson shadow-xs hover:border-wsu-crimson hover:bg-wsu-red-soft/30 transition-colors"
          >
            <span>Visit</span>
            <ExternalLink aria-hidden="true" className="size-3" />
          </a>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}
