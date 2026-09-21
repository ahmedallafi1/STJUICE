import { randomUUID } from "node:crypto";
import { benefitsConfig } from "./benefits-engine.mjs";

const fail = (message, code, status = 400, field) => {
  throw Object.assign(new Error(message), { code, status, field });
};

const clean = (value, max = 240) => String(value || "").trim().slice(0, max);

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

export function listReservations(account) {
  return structuredClone(Array.isArray(account?.reservations) ? account.reservations : []);
}

export function createReservationRequest(account, input = {}, now = new Date()) {
  if (!benefitsConfig.reservations.enabled) fail("Reservations are not available.", "reservations_disabled", 503);
  account.reservations ||= [];

  const purpose = clean(input.purpose, 40);
  if (!benefitsConfig.reservations.purposes.includes(purpose)) fail("Choose a valid reservation purpose.", "reservation_purpose_invalid", 422, "purpose");

  const date = clean(input.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail("Choose a valid reservation date.", "reservation_date_invalid", 422, "date");
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
