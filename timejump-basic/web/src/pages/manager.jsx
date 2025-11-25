import React, { useEffect, useMemo, useState } from "react";
import RequireRole from "../components/requirerole.jsx";
import { api } from "../auth";
import AuthToast from "../components/authtoast.jsx";
import { notifyDeleteError, notifyDeleteSuccess } from "../utils/deleteAlert.js";
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "--";
  const raw = String(value);
  const datePart = raw.includes("T") ? raw.split("T")[0] : raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const date = new Date(`${datePart}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString();
  }
  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toLocaleDateString();
  }
  return raw;
}

export default function Manager() {
  return (
    <RequireRole
      roles={["manager", "admin", "owner"]}
      fallback={
        <div className="container">
          <div className="panel">Managers/Admins/Owners only.</div>
        </div>
      }
    >
      <Planner />
    </RequireRole>
  );
}

function Planner() {
  const [employees, setEmployees] = useState([]);
  const [attractions, setAttractions] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState({ attraction: "", date: "" });
  const [cancellations, setCancellations] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [form, setForm] = useState({
    employeeId: "",
    attractionId: "",
    shiftDate: "",
    startTime: "10:00",
    endTime: "17:00",
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [weatherForm, setWeatherForm] = useState({
    attractionId: "",
    date: todayISO(),
    weatherCondition: "",
  });
  const [weatherSaving, setWeatherSaving] = useState(false);
  const [weatherMessage, setWeatherMessage] = useState("");
  const [weatherError, setWeatherError] = useState("");
  const [saveTone, setSaveTone] = useState("info");
  const [missingFields, setMissingFields] = useState({
    employee: false,
    attraction: false,
    shiftDate: false,
    startTime: false,
    endTime: false,
  });
  const [weatherMissingFields, setWeatherMissingFields] = useState({
    attractionId: false,
    date: false,
    weatherCondition: false,
  });
  const [confirmingClearId, setConfirmingClearId] = useState(null);
  const [clearingId, setClearingId] = useState(null);

  const [editSchedule, setEditSchedule] = useState(null);
  const [editForm, setEditForm] = useState({
    employeeId: "",
    attractionId: "",
    shiftDate: "",
    startTime: "",
    endTime: "",
  });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [empRes, attrRes, schedRes, cancelRes] = await Promise.all([
          api("/employees").catch((err) => {
            if (err?.status === 403) return { data: [] };
            throw err;
          }),
          api("/attractions").catch((err) => {
            if (err?.status === 403) return { data: [] };
            throw err;
          }),
          api("/schedules").catch((err) => {
            if (err?.status === 403) return { data: [] };
            throw err;
          }),
          api("/ride-cancellations?weatherOnly=true&includeCleared=true").catch((err) => {
            if (err?.status === 403) return { data: [] };
            throw err;
          }),
        ]);
        if (!active) return;
        const employeeRows = Array.isArray(empRes?.data)
          ? empRes.data
          : empRes?.employees || [];
        setEmployees(
          employeeRows.filter(
            (row) =>
              (row.role_name ?? row.role ?? "").toLowerCase() === "employee"
          )
        );
        setAttractions(
          Array.isArray(attrRes?.data)
            ? attrRes.data
            : attrRes?.attractions || []
        );
        const scheduleRows = Array.isArray(schedRes?.data)
          ? schedRes.data
          : schedRes?.schedules || [];
        setSchedules(
          scheduleRows.filter(
            (entry) => !(entry.is_completed ?? entry.isCompleted ?? false)
          )
        );
        setCancellations(Array.isArray(cancelRes?.data) ? cancelRes.data : []);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load scheduling data.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const attractionOptions = useMemo(() => {
    return attractions
      .map((a) => ({
        id: a?.AttractionID ?? a?.id ?? a?.attraction_id,
        name: a?.Name ?? a?.name ?? "Attraction",
      }))
      .filter((opt) => opt.id);
  }, [attractions]);

  const employeeOptions = useMemo(() => {
    return employees
      .map((e) => {
        const fullName = `${e?.first_name ?? ""} ${e?.last_name ?? ""}`.trim();
        const fallbackName = fullName || e?.email || "Employee";
        return {
          id: e?.employeeID ?? e?.id ?? e?.EmployeeID,
          name: e?.name ?? fallbackName,
        };
      })
      .filter((opt) => opt.id);
  }, [employees]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const attractionMatch = filter.attraction
        ? String(s.attractionId ?? s.AttractionID ?? "") === filter.attraction
        : true;
      const dateMatch = filter.date
        ? (s.shiftDate ?? s.date ?? "").startsWith(filter.date)
        : true;
      return attractionMatch && dateMatch;
    });
  }, [schedules, filter]);
  function handleMods(schedule) {
    setEditSchedule(schedule);
    setEditForm({
      employeeId: schedule.employeeId ?? schedule.EmployeeID,
      attractionId: schedule.attractionId ?? schedule.AttractionID,
      shiftDate: schedule.shiftDate ?? schedule.date,
      startTime: schedule.startTime ?? schedule.StartTime,
      endTime: schedule.endTime ?? schedule.EndTime
    });
    setEditBusy(false);
    setEditError("");
    setOpenMenu(null);
  }
  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editSchedule || editBusy) return;


    if (!editForm.employeeId || !editForm.attractionId || !editForm.shiftDate || 
        !editForm.startTime || !editForm.endTime) {
      setEditError("All fields are required.");
      return;
    }

    const [yStr, mStr, dStr] = editForm.shiftDate.split("-");
    const y = Number(yStr);
    const m = Number(mStr) - 1;
    const d = Number(dStr);
  
    const startParts = editForm.startTime.split(":");
    const startHour = Number(startParts[0]);
    const startMin = Number(startParts[1]);
  
    const endParts = editForm.endTime.split(":");
    const endHour = Number(endParts[0]);
    const endMin = Number(endParts[1]);
  
    const startTimeDate = new Date(y, m, d, startHour, startMin);
    const endTimeDate = new Date(y, m, d, endHour, endMin);
  
    if (endTimeDate <= startTimeDate) {
      setEditError("End time must be after start time.");
      return;
    }

    const PARK_OPENING_HOUR = 10;
    const PARK_CLOSING_HOUR = 20;

    if (startHour < PARK_OPENING_HOUR || startHour >= PARK_CLOSING_HOUR) {
      setEditError("Start time must be within park hours (10 AM - 8 PM).");
      return;
    }

    if (endHour > PARK_CLOSING_HOUR) {
      setEditError("End time must be within park hours (10 AM - 8 PM).");
      return;
    }

    setEditBusy(true);
    setEditError("");

    try {
      await api(`/schedules/${editSchedule.ScheduleID}`, {
        method: "PUT",
        body: JSON.stringify({
          employeeId: editForm.employeeId,
          attractionId: editForm.attractionId,
          shiftDate: editForm.shiftDate,
          startTime: editForm.startTime,
          endTime: editForm.endTime,
        }),
      });

      AuthToast({
        title: "Shift Updated",
        message: `Shift #${editSchedule.ScheduleID} was updated successfully.`,
      });

      setEditSchedule(null);

      const schedRes = await api("/schedules").catch((err) => {
        if (err?.status === 403) return { data: [] };
        throw err;
      });
      const scheduleRows = Array.isArray(schedRes?.data)
        ? schedRes.data
        : schedRes?.schedules || [];
      setSchedules(
        scheduleRows.filter(
          (entry) => !(entry.is_completed ?? entry.isCompleted ?? false)
        )
      );
    } catch (err) {
      setEditError(err?.message || "Unable to update schedule.");
    } finally {
      setEditBusy(false);
    }
  }

  async function handleDelete(schedule) {
    setDeleteConfirm(schedule);
    setOpenMenu(null);
  }
  async function confirmDelete() {

    if (!deleteConfirm) return;
  
    try {
      await api(`/schedules/${deleteConfirm.ScheduleID}`, { method: 'DELETE' });

      const message = notifyDeleteSuccess(`Shift #${deleteConfirm.ScheduleID} was removed successfully.`);
      AuthToast({
        title: "Shift Deleted",
        message,
      });
    
      const res = await api(`/schedules`);
      const rows = Array.isArray(res.data) ? res.data : res.schedules || [];
      setSchedules(rows.filter(e => !(e.is_completed ?? e.isCompleted ?? false)));

    } catch (err) {
      const message = notifyDeleteError(err, "Could not delete the shift. Try again.");
      AuthToast({
        title: "Delete Failed",
        message,
        dismissible: true,
      });
    } finally {
      setDeleteConfirm(null);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    const missing = {
      employee: !form.employeeId,
      attraction: !form.attractionId,
      shiftDate: !form.shiftDate,
      startTime: !form.startTime,
      endTime: !form.endTime,
    };
    if (
      missing.employee ||
      missing.attraction ||
      missing.shiftDate ||
      missing.startTime ||
      missing.endTime
    ) {
      setMissingFields(missing);
      setSaveTone("error");
      const names = [];
      const map = {
        employee: "Employee",
        attraction: "Attraction",
        shiftDate: "Shift Date",
        startTime: "Start Time",
        endTime: "End Time",
      };
      Object.keys(missing).forEach((k) => {
        if (missing[k]) names.push(map[k]);
      });
      setSaveMessage(`Please provide: ${names.join(", ")}`);
      return;
    }

    // Validate that shift date is not in the past
    const shiftDate = new Date(form.shiftDate);
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    // Parse the input date (YYYY-MM-DD) as a local date to avoid timezone shifts
    const [yStr, mStr, dStr] = String(form.shiftDate || "").split("-");
    const y = Number(yStr || 0);
    const m = Number(mStr || 1) - 1;
    const d = Number(dStr || 1);
    const shiftDateStart = new Date(y, m, d);
    shiftDateStart.setHours(0, 0, 0, 0);

    if (shiftDateStart < todayStart) {
      setSaveTone("error");
      setSaveMessage("Unable to assign shift on a previous date");
      setMissingFields({
        employee: false,
        attraction: false,
        shiftDate: true,
        startTime: false,
        endTime: false,
      });
      return;
    }

    // Build start/end Date objects on the selected shift date (local time)
    const startParts = String(form.startTime || "").split(":");
    const startHour = Number(startParts[0] || 0);
    const startMin = Number(startParts[1] || 0);
    const endParts = String(form.endTime || "").split(":");
    const endHour = Number(endParts[0] || 0);
    const endMin = Number(endParts[1] || 0);
    const startTimeDate = new Date(y, m, d, startHour, startMin, 0, 0);
    const endTimeDate = new Date(y, m, d, endHour, endMin, 0, 0);

    // Ensure end is after start for any date
    if (endTimeDate <= startTimeDate) {
      setSaveTone("error");
      setSaveMessage('"End Time" cannot be before the "Start Time"');
      setMissingFields({
        employee: false,
        attraction: false,
        shiftDate: false,
        startTime: false,
        endTime: true,
      });
      return;
    }

    // If shift is today, validate that the start/end times are not in the past
    if (shiftDateStart.getTime() === todayStart.getTime()) {
      const now = new Date();
      if (startTimeDate < now) {
        setSaveTone("error");
        setSaveMessage('Unable to assign shift "Start Time" at selected time.');
        setMissingFields({
          employee: false,
          attraction: false,
          shiftDate: false,
          startTime: true,
          endTime: false,
        });
        return;
      }
      if (endTimeDate < now) {
        setSaveTone("error");
        setSaveMessage('Unable to assign shift "End Time" at selected time.');
        setMissingFields({
          employee: false,
          attraction: false,
          shiftDate: false,
          startTime: false,
          endTime: true,
        });
        return;
      }
    }

    const PARK_OPENING_HOUR = 10;
    const PARK_CLOSING_HOUR = 20;

    if (startHour < PARK_OPENING_HOUR) {
      setSaveTone("error");
      setSaveMessage("Cannot assign shift before park's opening!");
      setMissingFields({
        employee: false,
        attraction: false,
        shiftDate: false,
        startTime: true,
        endTime: false,
      });
      return;
    }

    if (startHour >= PARK_CLOSING_HOUR) {
      setSaveTone("error");
      setSaveMessage("Cannot assign shift after the park's closing!");
      setMissingFields({
        employee: false,
        attraction: false,
        shiftDate: false,
        startTime: true,
        endTime: false,
      });
      return;
    }

    if (endHour > PARK_CLOSING_HOUR) {
      setSaveTone("error");
      setSaveMessage("Cannot assign shift after the park's closing!");
      setMissingFields({
        employee: false,
        attraction: false,
        shiftDate: false,
        startTime: false,
        endTime: true,
      });
      return;
    }

    const realSchedules = schedules.filter(s => !(s.isDeleted || s.isDeleted));
    const overlappingShift = realSchedules.find((s) => {
      const sDateStr = s.shiftDate ?? s.date ?? "";
      if (
        s.employeeId !== form.employeeId &&
        String(s.EmployeeID ?? "") !== String(form.employeeId)
      )
        return false;
      if (sDateStr !== form.shiftDate) return false;
      const sStartParts = String(s.startTime ?? s.StartTime ?? "").split(":");
      const sStartHour = Number(sStartParts[0] || 0);
      const sStartMin = Number(sStartParts[1] || 0);
      const sEndParts = String(s.endTime ?? s.EndTime ?? "").split(":");
      const sEndHour = Number(sEndParts[0] || 0);
      const sEndMin = Number(sEndParts[1] || 0);
      const sStartDate = new Date(y, m, d, sStartHour, sStartMin, 0, 0);
      const sEndDate = new Date(y, m, d, sEndHour, sEndMin, 0, 0);
      return startTimeDate < sEndDate && endTimeDate > sStartDate;
    });
    if (overlappingShift) {
      setSaveTone("error");
      setSaveMessage("Employee has an overlapping shift at the selected time.");
      setMissingFields({
        employee: true,
        attraction: false,
        shiftDate: false,
        startTime: false,
        endTime: false,
      });
      return;
    }

    setSaving(true);
    setSaveMessage("");
    setSaveTone("info");
    setMissingFields({
      employee: false,
      attraction: false,
      shiftDate: false,
      startTime: false,
      endTime: false,
    });
    try {
      console.log("Here in manager page");
      await api("/schedules", {
        method: "POST",
        body: JSON.stringify({
          employeeId: form.employeeId,
          attractionId: form.attractionId,
          shiftDate: form.shiftDate,
          startTime: form.startTime,
          endTime: form.endTime,
        }),
      });
      setSaveTone("success");
      setSaveMessage("Shift assigned.");
      setForm((prev) => ({ ...prev, shiftDate: "" }));
      setMissingFields({
        employee: false,
        attraction: false,
        shiftDate: false,
        startTime: false,
        endTime: false,
      });
      const schedRes = await api("/schedules").catch((err) => {
        if (err?.status === 403) return { data: [] };
        throw err;
      });
      const scheduleRows = Array.isArray(schedRes?.data)
        ? schedRes.data
        : schedRes?.schedules || [];
      setSchedules(
        scheduleRows.filter(
          (entry) => !(entry.is_completed ?? entry.isCompleted ?? false)
        )
      );
    } catch (err) {
      setSaveTone("error");
      setSaveMessage(err?.message || "Unable to save schedule.");
    } finally {
      setSaving(false);
    }
  }

  async function logWeather(e) {
    e.preventDefault();
    if (weatherSaving) return;
    
    const missing = {
      attractionId: !weatherForm.attractionId,
      date: !weatherForm.date,
      weatherCondition: !weatherForm.weatherCondition,
    };
    
    if (missing.attractionId || missing.date || missing.weatherCondition) {
      setWeatherMissingFields(missing);
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(weatherForm.date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      setWeatherMissingFields({ attractionId: false, date: true, weatherCondition: false });
      return;
    }
    
    setWeatherSaving(true);
    setWeatherError("");
    setWeatherMessage("");
    try {
      await api("/ride-cancellations", {
        method: "POST",
        body: JSON.stringify({
          attractionId: Number(weatherForm.attractionId),
          cancelDate: weatherForm.date || todayISO(),
          reason: weatherForm.weatherCondition,
        }),
      });
      setWeatherMessage("Weather report recorded.");
      setWeatherForm({
        attractionId: "",
        date: todayISO(),
        weatherCondition: "",
      });
      setWeatherMissingFields({
        attractionId: false,
        date: false,
        weatherCondition: false,
      });
      const res = await api("/ride-cancellations?weatherOnly=true&includeCleared=true").catch((err) => {
        if (err?.status === 403) return { data: [] };
        throw err;
      });
      setCancellations(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setWeatherError(err?.message || "Unable to log weather report.");
    } finally {
      setWeatherSaving(false);
    }
  }

  async function clearWeather(cancelId) {
    if (clearingId) return;
    setClearingId(cancelId);
    try {
      await api(`/ride-cancellations/${cancelId}/clear-weather`, {
        method: 'POST',
      });
      setWeatherMessage('Weather cleared successfully.');
      setConfirmingClearId(null);
      const res = await api("/ride-cancellations?weatherOnly=true&includeCleared=true").catch((err) => {
        if (err?.status === 403) return { data: [] };
        throw err;
      });
      setCancellations(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setWeatherError(err?.message || 'Unable to clear weather.');
    } finally {
      setClearingId(null);
    }
  }

  return (
    <div className="manager-shell">
      <section className="manager-hero">
        <div className="manager-hero__content">
          <h1>Scheduling Command Center</h1>
          <p>
            Assign the right people to the right attractions and keep every era
            fully staffed.
          </p>
          <div className="manager-stats">
            <div className="manager-stat">
              <div className="manager-stat__value">
                {employeeOptions.length}
              </div>
              <div className="manager-stat__label">Employees</div>
            </div>
            <div className="manager-stat">
              <div className="manager-stat__value">
                {attractionOptions.length}
              </div>
              <div className="manager-stat__label">Attractions</div>
            </div>
            <div className="manager-stat">
              <div className="manager-stat__value">
                {filteredSchedules.length}
              </div>
              <div className="manager-stat__label">Upcoming shifts</div>
            </div>
          </div>
        </div>
      </section>

      <section className="manager-grid">
        <div className="manager-panel" style={{ alignSelf: "start" }}>
          <h3>Assign a Shift</h3>
          <p className="manager-panel__intro">
            Choose an employee, pick their attraction, and capture shift details
            in one streamlined form.
          </p>
          <form onSubmit={submit} className="manager-form">
            <div className="field">
              <span>
                Employee
                {missingFields.employee && (
                  <span className="missing-asterisk">*</span>
                )}
              </span>
              <select
                className="border rounded-xl p-2"
                value={form.employeeId}
                onChange={(e) => {
                  setForm((f) => ({ ...f, employeeId: e.target.value }));
                  setMissingFields((m) => ({ ...m, employee: false }));
                }}
              >
                <option value="">Select employee...</option>
                {employeeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <span>
                Attraction
                {missingFields.attraction && (
                  <span className="missing-asterisk">*</span>
                )}
              </span>
              <select
                className="border rounded-xl p-2"
                value={form.attractionId}
                onChange={(e) => {
                  setForm((f) => ({ ...f, attractionId: e.target.value }));
                  setMissingFields((m) => ({ ...m, attraction: false }));
                }}
              >
                <option value="">Select attraction...</option>
                {attractionOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="manager-form__row">
              <label className="field" style={{ flex: 1, minWidth: 140 }}>
                <span>
                  Shift Date
                  {missingFields.shiftDate && (
                    <span className="missing-asterisk">*</span>
                  )}
                </span>
                <input
                  className="input"
                  type="date"
                  value={form.shiftDate}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, shiftDate: e.target.value }));
                    setMissingFields((m) => ({ ...m, shiftDate: false }));
                  }}
                />
              </label>
              <label className="field" style={{ flex: 1, minWidth: 140 }}>
                <span>
                  Start Time
                  {missingFields.startTime && (
                    <span className="missing-asterisk">*</span>
                  )}
                </span>
                <input
                  className="input"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, startTime: e.target.value }));
                    setMissingFields((m) => ({ ...m, startTime: false }));
                  }}
                />
              </label>
              <label className="field" style={{ flex: 1, minWidth: 140 }}>
                <span>
                  End Time
                  {missingFields.endTime && (
                    <span className="missing-asterisk">*</span>
                  )}
                </span>
                <input
                  className="input"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, endTime: e.target.value }));
                    setMissingFields((m) => ({ ...m, endTime: false }));
                  }}
                />
              </label>
            </div>
            <div className="manager-form__actions">
              <button className="btn primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Assign Shift"}
              </button>
              {saveMessage &&
                (saveTone === "error" ? (
                  <div className="alert error" style={{ marginLeft: 6 }}>
                    {saveMessage}
                  </div>
                ) : saveTone === "success" ? (
                  <div className="alert success" style={{ marginLeft: 6 }}>
                    {saveMessage}
                  </div>
                ) : (
                  <div
                    className="text-sm text-gray-700"
                    style={{ marginLeft: 6 }}
                  >
                    {saveMessage}
                  </div>
                ))}
            </div>
          </form>
        </div>

        <div className="manager-panel manager-panel--wide">
          <div className="manager-panel__header">
            <div>
              <h3>Upcoming Shifts</h3>
              <p>
                Review who is covering each attraction and refine staffing by
                attraction or date.
              </p>
            </div>
            <div className="manager-filters">
              <select
                className="border rounded-xl p-2"
                value={filter.attraction}
                onChange={(e) =>
                  setFilter((f) => ({ ...f, attraction: e.target.value }))
                }
              >
                <option value="">All attractions</option>
                {attractionOptions.map((opt) => (
                  <option key={opt.id} value={String(opt.id)}>
                    {opt.name}
                  </option>
                ))}
              </select>
              <input
                className="input"
                type="date"
                value={filter.date}
                onChange={(e) =>
                  setFilter((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
          </div>

          {loading && (
            <div className="text-sm text-gray-700">Loading schedules...</div>
          )}
          {!loading && error && <div className="alert error">{error}</div>}
          {!loading && !error && filteredSchedules.length === 0 && (
            <div className="text-sm text-gray-700">
              No scheduled shifts yet.
            </div>
          )}
          {!loading && !error && filteredSchedules.length > 0 && (
            <div className="manager-shift-grid">
              {filteredSchedules.map((s, idx) => {
                const emp = employeeOptions.find(
                  (e) => String(e.id) === String(s.employeeId ?? s.EmployeeID)
                );
                const attr = attractionOptions.find(
                  (a) =>
                    String(a.id) === String(s.attractionId ?? s.AttractionID)
                );
                const start =
                  s.startTime ?? s.StartTime ?? formTime(s.start_time);
                const end = s.endTime ?? s.EndTime ?? formTime(s.end_time);
                return (
                  <div
                    key={s.scheduleId ?? s.ScheduleID ?? idx}
                    className="manager-shift-card"
                  >
                    <div
                      className="manager-shift-card__header"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <h4>{attr?.name || "Attraction TBD"}</h4>
                        <span>{formatDate(s.shiftDate ?? s.date)}</span>
                      </div>

                      {/* Options menu button */}
                      <div style={{ position: "relative" }}>
                        <button
                          className="btn small"
                          onClick={() =>
                            setOpenMenu(
                              openMenu === s.ScheduleID ? null : s.ScheduleID
                            )
                          }
                        >
                          ⋮
                        </button>

                        {/* Dropdown */}
                        {openMenu === s.ScheduleID && (
                          <div
                            style={{
                              position: "absolute",
                              right: 0,
                              top: "100%",
                              background: "white",
                              border: "1px solid #ddd",
                              borderRadius: "8px",
                              padding: "6px",
                              display: "flex",
                              flexDirection: "column",
                              width: "120px",
                              zIndex: 10,
                            }}
                          >
                            <button
                              className="btn small"
                              onClick={() => handleMods(s)}
                            >
                              Modify
                            </button>

                            <button
                              className="btn small danger"
                              onClick={() => handleDelete(s)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="manager-shift-card__body">
                      <div>
                        <label>Team Member</label>
                        <strong>{emp?.name || "Unassigned"}</strong>
                      </div>
                      <div>
                        <label>Shift</label>
                        <strong>
                          {formatTime(start)} – {formatTime(end)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="manager-panel manager-panel--wide" id="weather-report" style={{ marginTop: '0.5rem', gridColumn: '1 / -1' }}>
          <div className="manager-panel__header">
            <div>
              <h3>Weather Report</h3>
              <p>Log weather reports to keep teams and operations informed.</p>
            </div>
          </div>
          <form className="manager-form" onSubmit={logWeather} style={{ marginBottom: 16 }}>
            <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span>Attraction{weatherMissingFields.attractionId && <span className="missing-asterisk">*</span>}</span>
              <select
                className="border rounded-xl p-2"
                value={weatherForm.attractionId}
                onChange={(e) => {
                  setWeatherForm((f) => ({ ...f, attractionId: e.target.value }));
                  if (e.target.value) setWeatherMissingFields(m => ({ ...m, attractionId: false }));
                }}
              >
                <option value="">Select attraction...</option>
                {attractionOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="manager-form__row">
              <label className="field" style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span>Date</span>
                <input
                  className="input"
                  type="date"
                  min={todayISO()}
                  value={weatherForm.date}
                  onChange={(e) => setWeatherForm((f) => ({ ...f, date: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </label>

              <label className="field" style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span>Incoming Weather{weatherMissingFields.weatherCondition && <span className="missing-asterisk">*</span>}</span>
                <select
                  className="input"
                  value={weatherForm.weatherCondition}
                  onChange={(e) => {
                    setWeatherForm((f) => ({ ...f, weatherCondition: e.target.value }));
                    if (e.target.value) setWeatherMissingFields(m => ({ ...m, weatherCondition: false }));
                  }}
                  style={{ width: '100%' }}
                >
                  <option value="">Select weather...</option>
                  <option value="Light Rain">Light Rain</option>
                  <option value="Heavy Rain">Heavy Rain</option>
                  <option value="Snow">Snow</option>
                  <option value="Hail">Hail</option>
                  <option value="Lightning">Lightning</option>
                  <option value="Lightning Advisory">Lightning Advisory</option>
                  <option value="Thunderstorm">Thunderstorm</option>
                  <option value="Tornado">Tornado</option>
                  <option value="Hurricane">Hurricane</option>
                </select>
              </label>
            </div>

              <div className="manager-form__actions" style={{ marginTop: '0.5rem' }}>
                <button className="btn primary" type="submit" disabled={weatherSaving}>
                  {weatherSaving ? "Saving..." : "Log Weather Report"}
                </button>
                {weatherMessage && <div className="text-sm text-green-700">{weatherMessage}</div>}
                {(weatherMissingFields.attractionId || weatherMissingFields.date || weatherMissingFields.weatherCondition) && (
                  <div style={{ padding: '8px 12px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c00', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    Please select: {[weatherMissingFields.attractionId && 'an attraction', weatherMissingFields.date && 'a date', weatherMissingFields.weatherCondition && 'incoming weather'].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
          </form>

          <div className="manager-cancel-list" style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', backgroundColor: '#fafafa' }}>
            {!cancellations.length && <div className="text-sm text-gray-700" style={{ padding: '1rem' }}>No weather reports logged yet.</div>}
            {!!cancellations.length && (
              <div style={{ minWidth: '100%' }}>
                <table className="manager-table" style={{ fontSize: '0.9rem', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #d1d5db' }}>
                      <th style={{ width: '20%', textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151' }}>Attraction</th>
                      <th style={{ width: '15%', textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151' }}>Date</th>
                      <th style={{ width: '20%', textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151' }}>Incoming Weather</th>
                      <th style={{ width: '15%', textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151' }}>Status</th>
                      <th style={{ width: '30%', textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#374151' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cancellations.map((row) => (
                      <tr key={row.cancel_id || row.WeatherCancellationID || row.WeatherCancellationId || JSON.stringify(row)} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: 'white' }}>
                        <td style={{ padding: '12px 8px' }}>{row.attraction_name || `#${row.AttractionID || row.attraction_id || row.attraction}`}</td>
                        <td style={{ padding: '12px 8px', whiteSpace: 'nowrap' }}>{formatDate(row.cancel_date || row.Date || row.date)}</td>
                        <td style={{ padding: '12px 8px' }}>{row.reason || row.WeatherCondition || row.weatherCondition || '--'}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ 
                            color: row.cleared ? '#059669' : '#dc2626',
                            fontWeight: 600,
                            fontSize: '0.875rem'
                          }}>
                            {row.cleared ? 'Resolved' : 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {!row.cleared && confirmingClearId !== row.cancel_id && (
                            <button
                              type="button"
                              className="btn"
                              style={{ padding: '2px 8px', fontSize: 12 }}
                              onClick={() => setConfirmingClearId(row.cancel_id)}
                              disabled={clearingId === row.cancel_id}
                            >
                              Weather Cleared
                            </button>
                          )}
                          {!row.cleared && confirmingClearId === row.cancel_id && (
                            <>
                              <button
                                type="button"
                                className="btn"
                                style={{ padding: '2px 8px', fontSize: 12 }}
                                onClick={() => setConfirmingClearId(null)}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="btn"
                                style={{ padding: '2px 8px', fontSize: 12, backgroundColor: '#dc2626', color: 'white', marginLeft: '4px' }}
                                onClick={() => clearWeather(row.cancel_id)}
                                disabled={clearingId === row.cancel_id}
                              >
                                Confirm
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
      {deleteConfirm && (
  <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3 style={{ margin: 0 }}>Delete Shift?</h3>
      </div>
      <div className="modal-body">
        <p style={{ margin: 0, color: '#475569' }}>
          Are you sure you want to remove this shift for{" "}
          <strong>
            {employeeOptions.find(
              (e) => String(e.id) === String(deleteConfirm.employeeId ?? deleteConfirm.EmployeeID)
            )?.name || "this employee"}
          </strong>
          ? This action cannot be undone.
        </p>
      </div>
      <div className="modal-footer">
        <div className="modal-actions">
          <button
            className="btn"
            onClick={() => setDeleteConfirm(null)}
          >
            Cancel
          </button>
          <button
            className="btn danger"
            onClick={confirmDelete}
          >
            Delete Shift
          </button>
        </div>
      </div>
    </div>
  </div>
  )}

  {editSchedule && (
    <div className="modal-overlay" onClick={() => setEditSchedule(null)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Edit Shift</h3>
        </div>
        <div className="modal-body">
          <form onSubmit={handleEditSubmit} className="manager-form">
            <div className="field">
              <span>Employee</span>
              <select
                className="border rounded-xl p-2"
                value={editForm.employeeId}
                onChange={(e) => setEditForm((f) => ({ ...f, employeeId: e.target.value }))}
                disabled={editBusy}
              >
                <option value="">Select employee...</option>
                {employeeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <span>Attraction</span>
              <select
                className="border rounded-xl p-2"
                value={editForm.attractionId}
                onChange={(e) => setEditForm((f) => ({ ...f, attractionId: e.target.value }))}
                disabled={editBusy}
              >
                <option value="">Select attraction...</option>
                {attractionOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="manager-form__row">
              <label className="field" style={{ flex: 1, minWidth: 140 }}>
                <span>Shift Date</span>
                <input
                  className="input"
                  type="date"
                  value={editForm.shiftDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, shiftDate: e.target.value }))}
                  disabled={editBusy}
                />
              </label>

              <label className="field" style={{ flex: 1, minWidth: 140 }}>
                <span>Start Time</span>
                <input
                  className="input"
                  type="time"
                  value={editForm.startTime}
                  onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                  disabled={editBusy}
                />
              </label>

              <label className="field" style={{ flex: 1, minWidth: 140 }}>
                <span>End Time</span>
                <input
                  className="input"
                  type="time"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                  disabled={editBusy}
                />
              </label>
            </div>

            {editError && (
              <div className="alert error" style={{ marginTop: 12 }}>
                {editError}
              </div>
            )}
          </form>
        </div>
        <div className="modal-footer">
          <div className="modal-actions">
            <button
              className="btn"
              onClick={() => setEditSchedule(null)}
              disabled={editBusy}
            >
              Cancel
            </button>
            <button
              className="btn primary"
              onClick={handleEditSubmit}
              disabled={editBusy}
            >
              {editBusy ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )}
    </div>
    
  );
}

function formatTime(value) {
  if (!value) return "—";
  if (typeof value === "string" && value.includes(":")) {
    const [h, m] = value.split(":");
    const date = new Date();
    date.setHours(Number(h), Number(m || 0));
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return String(value);
}

function formTime(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return "";
}
