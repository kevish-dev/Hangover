import { z } from "zod";
import { registry } from "../../core/openapi/openapi.js";
import {
  crmActivityTypes,
  crmLeadSources,
  crmLeadStages,
  crmTaskPriorities,
  crmTaskStatuses,
  crmTaskCategories,
  tripTypes,
} from "./crm.validation.js";

const security = [{ cookieAuth: [] }];
const idParams = z.object({ id: z.string().uuid() });
const pagination = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
};
const nullableId = z.string().uuid().nullable().optional();

const contactBody = z.object({
  displayName: z.string().min(1).max(160),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.enum(crmLeadSources).optional(),
  tags: z.array(z.string()).max(20).optional(),
  userId: z.string().uuid().optional(),
});

registry.registerPath({
  method: "get",
  path: "/crm/contacts",
  summary: "List CRM contacts",
  tags: ["CRM"],
  security,
  request: { query: z.object({ ...pagination, q: z.string().optional(), source: z.enum(crmLeadSources).optional(), archived: z.enum(["false", "true", "all"]).optional() }) },
  responses: { 200: { description: "Paginated contacts" }, 403: { description: "Admin access required" } },
});

registry.registerPath({
  method: "post",
  path: "/crm/contacts",
  summary: "Create a CRM contact",
  tags: ["CRM"],
  security,
  request: { body: { content: { "application/json": { schema: contactBody } } } },
  responses: { 201: { description: "Contact created" }, 409: { description: "Email or user already linked" } },
});

registry.registerPath({
  method: "get",
  path: "/crm/contacts/{id}",
  summary: "Get CRM contact details",
  tags: ["CRM"],
  security,
  request: { params: idParams },
  responses: { 200: { description: "Contact with leads, activities, and tasks" }, 404: { description: "Contact not found" } },
});

registry.registerPath({
  method: "patch",
  path: "/crm/contacts/{id}",
  summary: "Update or archive a CRM contact",
  tags: ["CRM"],
  security,
  request: {
    params: idParams,
    body: { content: { "application/json": { schema: contactBody.partial().extend({ email: z.string().email().nullable().optional(), phone: z.string().nullable().optional(), userId: nullableId, archived: z.boolean().optional() }) } } },
  },
  responses: { 200: { description: "Contact updated" }, 404: { description: "Contact not found" } },
});

const leadBody = z.object({
  contactId: z.string().uuid().optional(),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.enum(crmLeadSources).optional(),
  stage: z.enum(crmLeadStages).optional(),
  tripId: z.string().uuid().optional(),
  festivalId: z.string().uuid().optional(),
  tripType: z.enum(tripTypes).optional(),
  bookingId: z.string().uuid().optional(),
  title: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
  ownerId: nullableId,
  nextFollowUpAt: z.string().datetime().nullable().optional(),
  lostReason: z.string().nullable().optional(),
});

registry.registerPath({
  method: "get",
  path: "/crm/leads",
  summary: "List CRM leads",
  tags: ["CRM"],
  security,
  request: { query: z.object({ ...pagination, q: z.string().optional(), stage: z.enum(crmLeadStages).optional(), source: z.enum(crmLeadSources).optional(), ownerId: z.string().uuid().optional(), tripId: z.string().uuid().optional(), festivalId: z.string().uuid().optional(), archived: z.enum(["false", "true", "all"]).optional() }) },
  responses: { 200: { description: "Paginated leads" } },
});

registry.registerPath({
  method: "post",
  path: "/crm/leads",
  summary: "Create a manual CRM lead",
  tags: ["CRM"],
  security,
  request: { body: { content: { "application/json": { schema: leadBody } } } },
  responses: { 201: { description: "Lead created" }, 400: { description: "Invalid lead or contact data" } },
});

registry.registerPath({
  method: "get",
  path: "/crm/leads/{id}",
  summary: "Get CRM lead details",
  tags: ["CRM"],
  security,
  request: { params: idParams },
  responses: { 200: { description: "Lead with contact, activity, and task context" }, 404: { description: "Lead not found" } },
});

registry.registerPath({
  method: "patch",
  path: "/crm/leads/{id}",
  summary: "Update CRM lead stage or details",
  tags: ["CRM"],
  security,
  request: { params: idParams, body: { content: { "application/json": { schema: leadBody.partial().extend({ tripId: nullableId, festivalId: nullableId, bookingId: nullableId, tripType: z.enum(tripTypes).nullable().optional(), archived: z.boolean().optional() }) } } } },
  responses: { 200: { description: "Lead updated" }, 404: { description: "Lead not found" } },
});

registry.registerPath({
  method: "post",
  path: "/crm/activities",
  summary: "Log a CRM interaction",
  tags: ["CRM"],
  security,
  request: { body: { content: { "application/json": { schema: z.object({ contactId: z.string().uuid(), leadId: z.string().uuid().optional(), bookingId: z.string().uuid().optional(), type: z.enum(crmActivityTypes), summary: z.string(), details: z.string().nullable().optional() }) } } } },
  responses: { 201: { description: "Activity logged" } },
});

const taskBody = z.object({
  contactId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  tripId: z.string().uuid().optional(),
  festivalId: z.string().uuid().optional(),
  slotId: z.string().uuid().optional(),
  hotelReservationId: z.string().uuid().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  category: z.enum(crmTaskCategories).optional(),
  priority: z.enum(crmTaskPriorities).optional(),
  status: z.enum(crmTaskStatuses).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  assigneeId: nullableId,
});

registry.registerPath({
  method: "get",
  path: "/crm/tasks",
  summary: "List CRM tasks",
  tags: ["CRM"],
  security,
  request: { query: z.object({ ...pagination, q: z.string().optional(), status: z.enum(crmTaskStatuses).optional(), priority: z.enum(crmTaskPriorities).optional(), category: z.enum(crmTaskCategories).optional(), assigneeId: z.string().uuid().optional(), contactId: z.string().uuid().optional(), leadId: z.string().uuid().optional(), bookingId: z.string().uuid().optional(), tripId: z.string().uuid().optional(), festivalId: z.string().uuid().optional(), slotId: z.string().uuid().optional(), hotelReservationId: z.string().uuid().optional(), dueFrom: z.string().datetime().optional(), dueTo: z.string().datetime().optional(), archived: z.enum(["false", "true", "all"]).optional() }) },
  responses: { 200: { description: "Paginated tasks" } },
});

registry.registerPath({
  method: "post",
  path: "/crm/tasks",
  summary: "Create a CRM task",
  tags: ["CRM"],
  security,
  request: { body: { content: { "application/json": { schema: taskBody.omit({ status: true }) } } } },
  responses: { 201: { description: "Task created" } },
});

registry.registerPath({
  method: "patch",
  path: "/crm/tasks/{id}",
  summary: "Update or complete a CRM task",
  tags: ["CRM"],
  security,
  request: { params: idParams, body: { content: { "application/json": { schema: taskBody.omit({ contactId: true, leadId: true, bookingId: true, tripId: true, festivalId: true, slotId: true, hotelReservationId: true }).partial().extend({ archived: z.boolean().optional() }) } } } },
  responses: { 200: { description: "Task updated" }, 404: { description: "Task not found" } },
});
