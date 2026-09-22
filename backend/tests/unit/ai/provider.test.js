const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-secret-32-chars-min-padding-xyz";

const { encryptApiKey, decryptApiKey } = require("../../../src/service/ai/aiProviderConfigService");
const MockProvider = require("../../../src/service/ai/providers/MockProvider");

test("aiProviderConfigService — encryption roundtrip", () => {
  const plain = "sk-test-1234567890";
  const cipher = encryptApiKey(plain);
  assert.ok(cipher, "cipher must be produced");
  assert.notEqual(cipher, plain, "cipher must differ from plaintext");
  const dec = decryptApiKey(cipher);
  assert.equal(dec, plain);
});

test("aiProviderConfigService — empty input returns null", () => {
  assert.equal(encryptApiKey(""), null);
  assert.equal(encryptApiKey(null), null);
  assert.equal(decryptApiKey(null), null);
  assert.equal(decryptApiKey("not.a.valid.cipher"), null);
});

test("aiProviderConfigService — wrong key returns null instead of crashing", () => {
  const original = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = "first-secret-32-chars-min-padding-xyz";
  const cipher = encryptApiKey("topsecret");
  process.env.JWT_ACCESS_SECRET = "second-secret-32-chars-min-padding-xyz";
  try {
    const result = decryptApiKey(cipher);
    assert.equal(result, null, "decryption with the wrong key must return null, not throw");
  } finally {
    process.env.JWT_ACCESS_SECRET = original;
  }
});

test("MockProvider — chat returns a non-empty response with usage", async () => {
  const provider = new MockProvider();
  const response = await provider.chat({
    messages: [{ role: "user", content: "Bonjour Malla" }],
    systemPrompt: "tu es Malla",
    context: { module: "dashboard", locale: "fr", currency: "TND" },
    providerName: "mock",
  });
  assert.ok(response.content.length > 10);
  assert.equal(response.providerName, "mock");
  assert.ok(response.tokensOut > 0);
});

test("MockProvider — respects locale (Arabic)", async () => {
  const provider = new MockProvider();
  const response = await provider.chat({
    messages: [{ role: "user", content: "مرحبا" }],
    context: { locale: "ar" },
    providerName: "mock",
  });
  assert.match(response.content, /مرحبا/);
});

test("MockProvider — streamChat yields chunks that concatenate to chat content", async () => {
  const provider = new MockProvider();
  let buf = "";
  const response = await provider.streamChat(
    {
      messages: [{ role: "user", content: "Salut" }],
      context: { locale: "fr" },
      providerName: "mock",
    },
    (chunk) => {
      buf += chunk;
    }
  );
  assert.equal(response.content, buf);
  assert.ok(response.tokensOut > 0);
});

test("providerRegistry — unknown provider throws", () => {
  const { getProvider } = require("../../../src/service/ai/providerRegistry");
  assert.throws(() => getProvider("does-not-exist"), /Unknown AI provider/);
});

test("providerRegistry — known providers instantiate", () => {
  const { getProvider, listProviderNames } = require("../../../src/service/ai/providerRegistry");
  const names = listProviderNames();
  assert.ok(names.includes("openai"));
  assert.ok(names.includes("groq"));
  assert.ok(names.includes("mock"));
  const p = getProvider("openai");
  assert.equal(typeof p.chat, "function");
  assert.equal(typeof p.streamChat, "function");
});