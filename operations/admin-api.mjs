import {
  adminAccountsSnapshot,
  adminReviewBusiness,
  adminReviewStudent
} from "../accounts/lib/account-store.mjs";
import {
  adminReservationsSnapshot,
  adminUpdateReservationStatus
} from "../accounts/lib/reservation-store.mjs";
import { benefitsConfig } from "../accounts/lib/benefits-engine.mjs";
import { catalog } from "../ordering/lib/catalog-store.mjs";
import { adminCommercialSnapshot, adminUpdateBoxState, adminUpdateDropState, adminUpdateProductState } from "./lib/commercial-control.mjs";
import { getLaunchReadiness } from "../launch/lib/readiness.mjs";
import { integrationStatus } from "../integrations/provider-status.mjs";
import {
  adminCateringSnapshot,
  adminUpdateCateringRequest,
  operationsAuditSnapshot,
  recordOperationsAudit
} from "./lib/operations-store.mjs";

function fail(message, code, status = 400) {
  throw Object.assign(new Error(message), { code, status });
}

function adminToken() {
  return process.env.ST_JUICE_ADMIN_TOKEN || process.env.STJ_TEST_ADMIN_TOKEN || "";
}

function authorized(request) {
  const expected = adminToken();
  return Boolean(expected && request.headers["x-stj-admin-token"] === expected);
}

function requireAdmin(request) {
  if (!adminToken()) fail("Operations access is not configured.", "admin_not_configured", 503);
  if (!authorized(request)) fail("Operations access denied.", "admin_access_denied", 401);
}

function catalogSnapshot() {
  return catalog.products.map((product) => ({
    id: product.id,
    name: product.name,
    categoryId: product.categoryId,
    productType: product.productType,
    catalogRole: product.catalogRole,
    availability: product.availability,
    sizes: (product.sizes || []).map(({ id, label, price }) => ({ id, label, price }))
  }));
}

function summary({ listOrders }) {
  const accounts = adminAccountsSnapshot();
  const reservations = adminReservationsSnapshot();
  const catering = adminCateringSnapshot();
  const orders = listOrders();
  return {
    accounts: {
      total: accounts.length,
      studentsPending: accounts.filter((row) => row.type === "student" && row.student?.status === "pending_manual_review").length,
      businessesPending: accounts.filter((row) => row.type === "business" && row.business?.status === "pending_review").length
    },
    reservations: {
      requested: reservations.filter((row) => row.status === "requested").length,
      confirmed: reservations.filter((row) => row.status === "confirmed").length
    },
    catering: {
      requested: catering.filter((row) => row.status === "requested").length,
      open: catering.filter((row) => !["declined", "canceled"].includes(row.status)).length
    },
    orders: {
      total: orders.length,
      open: orders.filter((row) => !["complete", "canceled"].includes(row.status)).length
    },
    catalog: {
      products: catalog.products.length
    },
    launch: getLaunchReadiness()
  };
}

export async function handleAdminApi({
  request,
  response,
  url,
  json,
  bodyJson,
  listOrders,
  updateOrderStatus
}) {
  if (!url.pathname.startsWith("/api/admin/")) return false;

  try {
    requireAdmin(request);

    if (request.method === "GET" && url.pathname === "/api/admin/session") {
      json(response, 200, { authenticated: true, mode: "operations_preview", persistentStaffAuth: false });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/summary") {
      json(response, 200, summary({ listOrders }));
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/accounts") {
      json(response, 200, { accounts: adminAccountsSnapshot() });
      return true;
    }

    const studentMatch = url.pathname.match(/^\/api\/admin\/students\/([^/]+)$/);
    if (request.method === "PATCH" && studentMatch) {
      const input = await bodyJson(request);
      const student = adminReviewStudent(decodeURIComponent(studentMatch[1]), input);
      recordOperationsAudit("student.reviewed", { accountId: decodeURIComponent(studentMatch[1]), status: student.status });
      json(response, 200, { student });
      return true;
    }

    const businessMatch = url.pathname.match(/^\/api\/admin\/businesses\/([^/]+)$/);
    if (request.method === "PATCH" && businessMatch) {
      const input = await bodyJson(request);
      const business = adminReviewBusiness(decodeURIComponent(businessMatch[1]), input);
      recordOperationsAudit("business.reviewed", { accountId: decodeURIComponent(businessMatch[1]), status: business.status });
      json(response, 200, { business });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/reservations") {
      json(response, 200, {
        reservations: adminReservationsSnapshot(),
        resources: benefitsConfig.reservations.resources || []
      });
      return true;
    }

    const reservationMatch = url.pathname.match(/^\/api\/admin\/reservations\/([^/]+)$/);
    if (request.method === "PATCH" && reservationMatch) {
      const input = await bodyJson(request);
      const reservation = adminUpdateReservationStatus(decodeURIComponent(reservationMatch[1]), String(input.status || ""), input);
      recordOperationsAudit("reservation.reviewed", { reservationId: reservation.id, status: reservation.status });
      json(response, 200, { reservation });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/orders") {
      json(response, 200, { orders: listOrders() });
      return true;
    }

    const orderMatch = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)\/status$/);
    if (request.method === "PATCH" && orderMatch) {
      const input = await bodyJson(request);
      const order = updateOrderStatus(decodeURIComponent(orderMatch[1]), String(input.status || ""));
      recordOperationsAudit("order.status_changed", { orderId: order.id, status: order.status });
      json(response, 200, { order });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/catering") {
      json(response, 200, { requests: adminCateringSnapshot() });
      return true;
    }

    const cateringMatch = url.pathname.match(/^\/api\/admin\/catering\/([^/]+)$/);
    if (request.method === "PATCH" && cateringMatch) {
      const requestRow = adminUpdateCateringRequest(decodeURIComponent(cateringMatch[1]), await bodyJson(request));
      json(response, 200, { request: requestRow });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/commercial") {
      json(response, 200, adminCommercialSnapshot());
      return true;
    }

    const productStateMatch = url.pathname.match(/^\/api\/admin\/commercial\/products\/([^/]+)$/);
    if (request.method === "PATCH" && productStateMatch) {
      const row = adminUpdateProductState(decodeURIComponent(productStateMatch[1]), await bodyJson(request));
      recordOperationsAudit("catalog.product_status_changed", { productId: row.productId, status: row.status });
      json(response, 200, { product: row });
      return true;
    }

    const dropStateMatch = url.pathname.match(/^\/api\/admin\/commercial\/drops\/([^/]+)$/);
    if (request.method === "PATCH" && dropStateMatch) {
      const row = adminUpdateDropState(decodeURIComponent(dropStateMatch[1]), await bodyJson(request));
      recordOperationsAudit("catalog.drop_status_changed", { productId: row.productId, status: row.status });
      json(response, 200, { drop: row });
      return true;
    }

    const boxStateMatch = url.pathname.match(/^\/api\/admin\/commercial\/boxes\/([^/]+)$/);
    if (request.method === "PATCH" && boxStateMatch) {
      const row = adminUpdateBoxState(decodeURIComponent(boxStateMatch[1]), await bodyJson(request));
      recordOperationsAudit("catalog.box_status_changed", { productId: row.productId, status: row.status });
      json(response, 200, { box: row });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/catalog") {
      json(response, 200, {
        storage: "source_controlled_until_persistent_ops_store",
        editableAtRuntime: true,
        products: catalogSnapshot()
      });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/rewards") {
      json(response, 200, {
        storage: "source_controlled_until_persistent_ops_store",
        editableAtRuntime: false,
        config: benefitsConfig
      });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/readiness") {
      json(response, 200, getLaunchReadiness());
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/integrations") {
      json(response, 200, { integrations: integrationStatus() });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/audit") {
      json(response, 200, { events: operationsAuditSnapshot(Number(url.searchParams.get("limit") || 100)) });
      return true;
    }

    json(response, 404, { error: { code: "admin_route_not_found", message: "Operations route not found." } });
    return true;
  } catch (error) {
    json(response, error.status || 500, {
      error: {
        code: error.code || "admin_error",
        message: error.status ? error.message : "The operations service could not complete the request."
      }
    });
    return true;
  }
}
