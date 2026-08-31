"use client";

import { useMemo, useState } from "react";
import { ExternalLink, RotateCcw, Search } from "lucide-react";
import type { FotgsFacultyRecordPublic, PublicFotgsPublication } from "@/lib/types";

const ALL = "__all__";
const INCOMPLETE = "__incomplete__";
const COMPLETE = "__complete__";

function countFor(counts: Record<string, number>, key: string): number {
  return counts[key] ?? 0;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

  const options = useMemo(
    () => ({
      appointmentStatuses: unique(publication.records.map((r) => r.appointmentStatus)),
      fotgsStatuses: unique(publication.records.map((r) => r.fotgsStatus)),
      trackStatuses: unique(publication.records.map((r) => r.trackAndStatus)),
    }),
    [publication.records]
  );

  const filteredRecords = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publication.records.filter((record) => {
      if (q) {
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
        if (!haystack.includes(q)) return false;
      }
      if (appointmentStatus !== ALL && record.appointmentStatus !== appointmentStatus) return false;
      if (fotgsStatus !== ALL && record.fotgsStatus !== fotgsStatus) return false;
      if (trackStatus !== ALL && record.trackAndStatus !== trackStatus) return false;
      if (degreeStatus === INCOMPLETE && !record.workdayDegreeIncomplete) return false;
      if (degreeStatus === COMPLETE && record.workdayDegreeIncomplete) return false;
      if (rankStatus === INCOMPLETE && !record.workdayRankIncomplete) return false;
      if (rankStatus === COMPLETE && record.workdayRankIncomplete) return false;
      return true;
    });
  }, [appointmentStatus, degreeStatus, fotgsStatus, publication.records, query, rankStatus, trackStatus]);

  const metrics = [
    { label: "Total faculty", value: publication.records.length },
    { label: "Current", value: countFor(publication.summary.appointmentStatusCounts, "Current") },
    { label: "Ended", value: countFor(publication.summary.appointmentStatusCounts, "Ended") },
    {
      label: "Missing end date",
      value: countFor(publication.summary.appointmentStatusCounts, "Missing End Date"),
    },
    { label: "Degree incomplete", value: publication.summary.workdayDegreeIncompleteCount },
    { label: "Rank incomplete", value: publication.summary.workdayRankIncompleteCount },
    { label: "Research links", value: publication.summary.researchWebpageCount },
  ];

  const resetFilters = () => {
    setQuery("");
    setAppointmentStatus(ALL);
    setFotgsStatus(ALL);
    setTrackStatus(ALL);
    setDegreeStatus(ALL);
    setRankStatus(ALL);
  };

  return (
    <main className="mx-auto max-w-[88rem] px-4 py-8 lg:px-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-wsu-gray-dark sm:text-3xl">
            {publication.title}
          </h1>
          <p className="mt-2 text-sm text-wsu-gray">
            Run date: {publication.summary.runDates.join(", ") || "Blank"} · Published{" "}
            {formatDate(publication.updatedAt)}
          </p>
        </div>
        <div className="text-sm text-wsu-gray lg:text-right">
          <p>Source: {publication.sourceFileName}</p>
          <p>Public ID fields removed</p>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-wsu-gray/15 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-wsu-gray">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold text-wsu-gray-dark">
              {metric.value.toLocaleString()}
            </p>
          </div>
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

      <section className="mt-5 rounded-lg border border-wsu-gray/15 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr_0.8fr_auto] xl:items-end">
          <label className="block text-sm font-medium text-wsu-gray-dark">
            Name or field search
            <div className="relative mt-1.5">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-wsu-gray" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-md border border-wsu-gray/25 bg-white py-2 pl-9 pr-3 text-sm text-wsu-gray-dark shadow-sm focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson/20"
              />
            </div>
          </label>
          <label className="block text-sm font-medium text-wsu-gray-dark">
            FOTGS status
            <select value={fotgsStatus} onChange={(e) => setFotgsStatus(e.target.value)} className={selectClassName()}>
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
              onChange={(e) => setAppointmentStatus(e.target.value)}
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
            <select value={trackStatus} onChange={(e) => setTrackStatus(e.target.value)} className={selectClassName()}>
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
            <select value={degreeStatus} onChange={(e) => setDegreeStatus(e.target.value)} className={selectClassName()}>
              <option value={ALL}>All</option>
              <option value={COMPLETE}>Complete</option>
              <option value={INCOMPLETE}>Incomplete</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-wsu-gray-dark">
            Rank
            <select value={rankStatus} onChange={(e) => setRankStatus(e.target.value)} className={selectClassName()}>
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
          <p className="text-sm text-wsu-gray">
            {filteredRecords.length.toLocaleString()} of {publication.records.length.toLocaleString()} rows
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-wsu-gray/15 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-wsu-gray/15 text-left text-sm">
            <thead className="bg-wsu-cream/85 text-xs font-semibold uppercase text-wsu-gray-dark">
              <tr>
                <th className="min-w-[16rem] px-3 py-2.5">Name</th>
                <th className="min-w-[15rem] px-3 py-2.5">Highest degree</th>
                <th className="min-w-[10rem] px-3 py-2.5">Rank</th>
                <th className="min-w-[14rem] px-3 py-2.5">Track/status</th>
                <th className="min-w-[12rem] px-3 py-2.5">FOTGS status</th>
                <th className="min-w-[10rem] px-3 py-2.5">Appointment</th>
                <th className="whitespace-nowrap px-3 py-2.5">Research</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wsu-gray/10 bg-white">
              {filteredRecords.map((record, index) => (
                <FacultyRow key={`${record.lastName}-${record.firstName}-${index}`} record={record} />
              ))}
            </tbody>
          </table>
          {filteredRecords.length === 0 ? (
            <p className="px-4 py-8 text-sm text-wsu-gray">No rows match the current filters.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function FacultyRow({ record }: { record: FotgsFacultyRecordPublic }) {
  return (
    <tr className="align-top hover:bg-wsu-cream/45">
      <td className="px-3 py-3">
        <p className="font-semibold text-wsu-gray-dark">{record.displayName}</p>
        <p className="mt-0.5 text-xs text-wsu-gray">
          {[record.lastName, record.firstName].filter(Boolean).join(", ")}
        </p>
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
