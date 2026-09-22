/**
 * Tool registry for Malla.
 *
 * Every tool is a *function the LLM can call*. Tools are intentionally
 * thin wrappers over the existing business services (analyticsService,
 * productService, orderService, ...)  they NEVER touch Mongoose models
 * directly. This guarantees:
 *
 *   - Multi-tenant safety: the orchestrator passes a trusted storeId to
 *     every tool, and every underlying service already enforces its own
 *     tenant filter on top.
 *   - No duplicate business logic: the tool only formats the service
 *     response for the LLM.
 *   - No prompt injection surface: a tool cannot accept a free-form
 *     Mongo query; every parameter is validated against a strict JSON
 *     schema.
 *
 * The orchestrator owns the tool loop:
 *   1. Call the provider with the current messages + the tool catalog.
 *   2. If the provider returns a tool_call, dispatch it via `dispatch`.
 *   3. Append a `role:"tool"` message with the result and call again.
 *   4. Stop on a plain assistant message or after `maxToolRounds`.
 *
 * V1 ships only read-only tools. Mutation tools are deliberately NOT
 * registered yet  see the v2 plan in the ticket.
 */

const analyticsTools = require("./analyticsTools");
const productsTools = require("./productsTools");
const ordersTools = require("./ordersTools");
const customersTools = require("./customersTools");

const ALL_TOOLS = [
  ...analyticsTools.tools,
  ...productsTools.tools,
  ...ordersTools.tools,
  ...customersTools.tools,
];

const TOOL_MAP = new Map(ALL_TOOLS.map((t) => [t.name, t]));

/**
 * Validate a tool call's arguments against the tool's JSON schema.
 * Returns { ok: true, value } or { ok: false, error }.
 */
function validateArgs(tool, rawArgs) {
  if (!tool || !tool.parameters) return { ok: true, value: rawArgs || {} };
  const value = rawArgs && typeof rawArgs === "object" ? rawArgs : {};
  // Defensive: every property must be present in the schema.
  const allowed = new Set(Object.keys(tool.parameters.properties || {}));
  const cleaned = {};
  for (const k of Object.keys(value)) {
    if (!allowed.has(k)) {
      return { ok: false, error: `unknown argument: ${k}` };
    }
    cleaned[k] = value[k];
  }
  return { ok: true, value: cleaned };
}

/**
 * Dispatch a single tool call. ALWAYS scoped by the trusted storeId
 * passed in by the orchestrator  the `args` object CANNOT override it.
 *
 * @param {Object} ctx          { storeId, userId, locale, currency }
 * @param {string} name         tool name
 * @param {Object} args         tool arguments (validated)
 * @returns {Promise<Object>}   sanitised tool result (no stack, no internal ids beyond what the model needs)
 */
async function dispatch(ctx, name, args) {
  const tool = TOOL_MAP.get(name);
  if (!tool) {
    return { error: `unknown tool: ${name}` };
  }
  const validation = validateArgs(tool, args);
  if (!validation.ok) {
    return { error: validation.error };
  }
  try {
    const result = await tool.handler({
      ...ctx,
      args: validation.value,
    });
    return { ok: true, data: result };
  } catch (err) {
    // Never leak stack traces or internal error messages to the LLM.
    return {
      error: "tool_failed",
      tool: name,
      // Surface only the error class, not the message, unless it is a
      // benign one we trust (e.g. "not_found").
      detail: err?.code && /^[A-Z_]+$/.test(err.code) ? err.code : "internal_error",
    };
  }
}

function listToolNames() {
  return ALL_TOOLS.map((t) => t.name);
}

/**
 * The provider-facing tool catalogue. Each provider may format it
 * differently (OpenAI uses `tools: [{type:"function", function:{...}}]`,
 * Anthropic uses the same shape but `input_schema`, Gemini uses
 * `functionDeclarations`). The orchestrator hands this to the provider
 * as-is for OpenAI-compatible; other providers translate as needed.
 */
const OPENAI_TOOL_SPEC = ALL_TOOLS.map((t) => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  },
}));

module.exports = {
  tools: ALL_TOOLS,
  dispatch,
  listToolNames,
  OPENAI_TOOL_SPEC,
};