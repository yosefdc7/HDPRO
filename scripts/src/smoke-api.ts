type SmokeCase = {
  name: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  expectedStatus: number;
};

const baseUrl = process.env.SMOKE_API_BASE_URL ?? "http://127.0.0.1:3000";

const cases: SmokeCase[] = [
  {
    name: "healthz responds",
    path: "/api/healthz",
    method: "GET",
    expectedStatus: 200,
  },
  {
    name: "products rejects empty payload",
    path: "/api/products",
    method: "POST",
    body: {},
    expectedStatus: 400,
  },
  {
    name: "movements rejects invalid payload",
    path: "/api/movements",
    method: "POST",
    body: {},
    expectedStatus: 400,
  },
  {
    name: "sync rejects invalid payload shape",
    path: "/api/sync/push",
    method: "POST",
    body: {},
    expectedStatus: 400,
  },
  {
    name: "receiving PO rejects empty payload",
    path: "/api/receiving/purchase-orders",
    method: "POST",
    body: {},
    expectedStatus: 400,
  },
];

async function run(): Promise<void> {
  let failed = 0;
  console.log(`Running API smoke against ${baseUrl}`);

  for (const testCase of cases) {
    const method = testCase.method ?? "GET";
    const response = await fetch(`${baseUrl}${testCase.path}`, {
      method,
      headers:
        method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(testCase.body ?? {}) : undefined,
    });

    const pass = response.status === testCase.expectedStatus;
    if (!pass) {
      failed += 1;
    }
    console.log(
      `${pass ? "PASS" : "FAIL"} ${testCase.name}: expected ${testCase.expectedStatus}, got ${response.status}`,
    );
  }

  if (failed > 0) {
    throw new Error(`API smoke failed (${failed} case(s))`);
  }

  console.log("API smoke passed.");
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
