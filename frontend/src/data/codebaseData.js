export const FILES_CONTENT = {
  "src/api/routes.ts": [
    1,
    [
      "import { requireSession } from '../auth/session';",
      "import { createInvoice } from '../billing/invoice';",
      "router.get('/invoice/:id', async (req, res) => {",
      "  requireSession(req);",
      "  res.json(await createInvoice(req.params.id));",
      "});"
    ]
  ],
  "src/auth/session.ts": [
    12,
    [
      "export function requireSession(req) {",
      "  const token = req.cookies.sid;",
      "  if (!token) throw new AuthError();",
      "  return verifyToken(token);",
      "}"
    ]
  ],
  "src/auth/token.ts": [
    20,
    [
      "export function verifyToken(token) {",
      "  const secret = process.env.JWT_SECRET;",
      "  // throws when exp has passed",
      "  return jwt.verify(token, secret);",
      "}"
    ]
  ],
  "src/billing/invoice.ts": [
    38,
    [
      "export async function createInvoice(orderId) {",
      "  const row = await db.query('SELECT * FROM invoices WHERE order_id=$1', [orderId]);",
      "  const invoice = row.rows[0];",
      "  return formatAmount(invoice);",
      "}"
    ]
  ],
  "src/db/client.ts": [
    5,
    [
      "const pool = new Pool({",
      "  host: process.env.DB_HOST ?? '127.0.0.1',",
      "  port: 5432,",
      "});",
      "export const connect = () => pool.connect();"
    ]
  ],
  "src/ui/Checkout.tsx": [
    1,
    [
      "import { formatAmount } from '../utils/format';",
      "const total = formatAmount(invoice);",
      "fetch('/invoice/' + id);"
    ]
  ],
  "src/utils/format.ts": [
    10,
    [
      "export function formatAmount(inv) {",
      "  const sym = SYMBOLS.INR;",
      "  return sym + inv.total.toFixed(2);",
      "}"
    ]
  ]
};

export const OFF_FILES = {
  "assets/logo.png": "Image",
  "package.json": "JSON config"
};

export const GRAPH_POSITIONS = {
  "src/ui/Checkout.tsx": [420, 60],
  "src/api/routes.ts": [210, 60],
  "src/auth/session.ts": [110, 185],
  "src/billing/invoice.ts": [330, 185],
  "src/auth/token.ts": [60, 315],
  "src/db/client.ts": [220, 315],
  "src/utils/format.ts": [420, 315]
};

export const EDGES = [
  ["src/auth/session.ts", "src/auth/token.ts"],
  ["src/auth/session.ts", "src/db/client.ts"],
  ["src/api/routes.ts", "src/auth/session.ts"],
  ["src/api/routes.ts", "src/billing/invoice.ts"],
  ["src/billing/invoice.ts", "src/db/client.ts"],
  ["src/billing/invoice.ts", "src/utils/format.ts"],
  ["src/ui/Checkout.tsx", "src/api/routes.ts"],
  ["src/ui/Checkout.tsx", "src/utils/format.ts"]
];

export const PCB_COORDS = {
  "src/auth/token.ts": [55, 50],
  "src/db/client.ts": [55, 140],
  "src/utils/format.ts": [55, 245],
  "src/auth/session.ts": [175, 70],
  "src/billing/invoice.ts": [175, 195],
  "src/api/routes.ts": [295, 130],
  "src/ui/Checkout.tsx": [415, 190]
};

export const EX_COORDS = [115, 105, 235, 227, 120, 115, 355, 260];
export const MX_TRANSFORM = 'matrix(.62 .36 -.62 .36 0 0)';

export const ALL_FILES = [...Object.keys(FILES_CONTENT), ...Object.keys(OFF_FILES)].sort();

export function getImports(f) {
  return EDGES.filter((e) => e[0] === f).map((e) => e[1]);
}

export function getImportedBy(f) {
  return EDGES.filter((e) => e[1] === f).map((e) => e[0]);
}

export function shortPath(p) {
  return p.replace("src/", "");
}

export function calculateBfsImpact(activeFiles) {
  const ks = Object.keys(activeFiles).filter((k) => activeFiles[k]);
  const dp = {};
  const par = {};
  const cls = {};

  const q = ks.slice();
  ks.forEach((k) => {
    dp[k] = 0;
  });

  while (q.length) {
    const c = q.shift();
    getImportedBy(c).forEach((x) => {
      if (dp[x] === undefined) {
        dp[x] = dp[c] + 1;
        par[x] = c;
        cls[x] = 'hit';
        q.push(x);
      }
    });
  }

  const affectedList = Object.keys(dp)
    .filter((k) => dp[k] > 0)
    .sort((a, b) => dp[a] - dp[b])
    .map((k) => ({
      path: k,
      depth: dp[k],
      via: par[k]
    }));

  return { dp, par, cls, affectedList, activeKeys: ks };
}
