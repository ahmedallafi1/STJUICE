import { randomUUID } from "node:crypto";
import { benefitsConfig } from "./benefits-engine.mjs";
import { adminAccountsSnapshot, adminFindAccount } from "./account-store.mjs";
import { config as orderConfig } from "../../ordering/lib/catalog-store.mjs";

const fail = (message, code, status = 400, field) => {
  throw Object.assign(new Error(message), { code, status, field });
};

const clean = (value, max = 240) => String(value || "").trim().slice(0, max);

function validDateText(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return date.toISOString().slice(0, 10) === value;
}

function localDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  return hours * 60 + minutes;
}

function localClockMinutes(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: orderConfig.meta.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  return get("hour") * 60 + get("minute");
}

function hoursForDate(dateText) {
  const [year, month, day] = String(dateText).split("-").map(Number);
  const weekday = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()];
  return orderConfig.fulfillment.hours[weekday];
}

export function listReservations(account) {
  return structuredClone(Array.isArray(account?.reservations) ? account.reservations : []);
}

export function createReservationRequest(account, input = {}, now = new Date()) {
  if (!benefitsConfig.reservations.enabled) fail("Reservations are not available.", "reservations_disabled", 503);
  account.reservations ||= [];

  const purpose = clean(input.purpose, 40);
  if (!benefitsConfig.reservations.purposes.includes(purpose)) fail("Choose a valid reservation purpose.", "reservation_purpose_invalid", 422, "purpose");

  const date = clean(input.date, 10);
  if (!validDateText(date)) fail("Choose a valid reservation date.", "reservation_date_invalid", 422, "date");
  if (date < localDate(now)) fail("Reservation date cannot be in the past.", "reservation_date_past", 422, "date");

  const startTime = clean(input.startTime, 5);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime)) fail("Choose a valid start time.", "reservation_time_invalid", 422, "startTime");

  const partySize = Math.trunc(Number(input.partySize));
  const partyPolicy = benefitsConfig.reservations.partySize;
  if (!Number.isInteger(partySize) || partySize < partyPolicy.min || partySize > partyPolicy.max) {
    fail(`Party size must be between ${partyPolicy.min} and ${partyPolicy.max}.`, "reservation_party_size_invalid", 422, "partySize");
  }

  const durationMinutes = Math.trunc(Number(input.durationMinutes));
  const durationPolicy = benefitsConfig.reservations.durationMinutes;
  if (!Number.isInteger(durationMinutes)
      || durationMinutes < durationPolicy.min
      || durationMinutes > durationPolicy.max
      || durationMinutes % durationPolicy.increment !== 0) {
    fail(`Duration must be ${durationPolicy.min}–${durationPolicy.max} minutes in ${durationPolicy.increment}-minute increments.`, "reservation_duration_invalid", 422, "durationMinutes");
  }

  const dayHours = hoursForDate(date);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;
  if (!dayHours || startMinutes < timeToMinutes(dayHours.open) || endMinutes > timeToMinutes(dayHours.close)) {
    fail(`Reservations must fit within store hours (${dayHours?.open || "closed"}–${dayHours?.close || "closed"}).`, "reservation_outside_hours", 422, "startTime");
  }
  if (date === localDate(now) && startMinutes <= localClockMinutes(now)) {
    fail("Reservation time must be in the future.", "reservation_time_past", 422, "startTime");
  }

  const reservation = {
    id: `res_${randomUUID()}`,
    accountId: account.id,
    purpose,
    date,
    startTime,
    durationMinutes,
    partySize,
    organization: clean(input.organization, 120),
    notes: clean(input.notes, 600),
    resourceId: benefitsConfig.reservations.defaultResourceId || "main-lounge",
    status: "requested",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
  account.reservations.unshift(reservation);
  return structuredClone(reservation);
}

export function cancelReservation(account, reservationId, now = new Date()) {
  account.reservations ||= [];
  const reservation = account.reservations.find((item) => item.id === reservationId);
  if (!reservation) fail("Reservation request not found.", "reservation_not_found", 404);
  if (!["requested", "confirmed"].includes(reservation.status)) fail("This reservation cannot be canceled.", "reservation_not_cancelable", 409);
  reservation.status = "canceled";
  reservation.updatedAt = now.toISOString();
  return structuredClone(reservation);
}

function overlaps(a, b, bufferMinutes = 0) {
  if (a.date !== b.date || a.resourceId !== b.resourceId) return false;
  const aStart = timeToMinutes(a.startTime);
  const aEnd = aStart + Number(a.durationMinutes || 0) + bufferMinutes;
  const bStart = timeToMinutes(b.startTime);
  const bEnd = bStart + Number(b.durationMinutes || 0) + bufferMinutes;
  return aStart < bEnd && bStart < aEnd;
}

export function adminReservationsSnapshot() {
  const rows = [];
  for (const account of adminAccountsSnapshot()) {
    const full = adminFindAccount(account.id);
    for (const reservation of full?.reservations || []) {
      rows.push({
        ...structuredClone(reservation),
        account: {
          id: full.id,
          name: full.name,
          email: full.email,
          type: full.type
        }
      });
    }
  }
  return rows.sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
}

export function adminUpdateReservationStatus(reservationId, status, { reviewerReference = "" } = {}, now = new Date()) {
  if (!["confirmed", "declined", "canceled", "requested"].includes(status)) fail("Invalid reservation status.", "reservation_status_invalid", 422);
  const all = adminReservationsSnapshot();
  const targetRow = all.find((item) => item.id === reservationId);
  if (!targetRow) fail("Reservation request not found.", "reservation_not_found", 404);
  const account = adminFindAccount(targetRow.account.id);
  const target = account.reservations.find((item) => item.id === reservationId);

  if (status === "confirmed") {
    const resource = (benefitsConfig.reservations.resources || []).find((item) => item.id === target.resourceId && item.active !== false);
    if (!resource) fail("Reservation resource is unavailable.", "reservation_resource_unavailable", 409);
    const buffer = Number(benefitsConfig.reservations.bufferMinutes || 0);
    const conflicting = all.filter((item) => item.id !== target.id && item.status === "confirmed" && overlaps(target, item, buffer));
    const used = conflicting.reduce((sum, item) => sum + Number(item.partySize || 0), 0);
    if (used + Number(target.partySize || 0) > Number(resource.capacity || 0)) {
      fail("Confirming this reservation would exceed the available seating capacity.", "reservation_capacity_exceeded", 409);
    }
  }

  target.status = status;
  target.updatedAt = now.toISOString();
  target.reviewedAt = now.toISOString();
  target.reviewerReference = clean(reviewerReference, 120);
  return structuredClone(target);
}
