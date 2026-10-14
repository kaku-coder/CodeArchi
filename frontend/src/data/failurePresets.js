export const FAILURE_PRESETS = [
  {
    n: "TypeError",
    re: /format\.ts|reading ['"]total/i,
    log: "TypeError: Cannot read properties of undefined (reading 'total')\n    at formatAmount (src/utils/format.ts:12)\n    at createInvoice (src/billing/invoice.ts:41)",
    files: [
      ["src/utils/format.ts", 12, "Stack frame where the error is thrown"],
      ["src/billing/invoice.ts", 41, "Caller passes a value that can be undefined"],
      ["src/db/client.ts", null, "Source of the query result used by the caller"]
    ],
    causes: [
      "The invoice query returned no rows, so rows[0] is undefined.",
      "formatAmount does not guard against a missing invoice."
    ],
    steps: [
      "Log row.rows.length before formatAmount is called.",
      "Check whether the order id from the request exists in the invoices table.",
      "Add a guard or a clear not-found error, then rerun."
    ],
    why: "The error is thrown inside formatAmount, but the value comes from createInvoice. That function reads the first query row without checking that one exists.",
    conf: 7,
    ev: [
      ["src/utils/format.ts", 12, "return sym + inv.total.toFixed(2);"],
      ["src/billing/invoice.ts", 40, "const invoice = row.rows[0];"]
    ],
    unk: "The log does not show the order id or the query result, so an empty result is likely but not confirmed.",
    tests: [
      "createInvoice with an unknown order id returns a not-found error.",
      "formatAmount with undefined input fails with a clear message.",
      "Checkout shows an error state when the invoice request fails."
    ]
  },
  {
    n: "JWT expired",
    re: /jwt|token\.ts/i,
    log: "JsonWebTokenError: jwt expired\n    at verifyToken (src/auth/token.ts:23)\n    at requireSession (src/auth/session.ts:15)",
    files: [
      ["src/auth/token.ts", 23, "Stack frame where verification fails"],
      ["src/auth/session.ts", 15, "Passes the cookie value to verifyToken"],
      ["src/api/routes.ts", 4, "Route that requires a session"]
    ],
    causes: [
      "The session cookie holds a token past its expiry time.",
      "Server and client clocks differ, so a fresh token looks expired."
    ],
    steps: [
      "Decode the token and compare exp with the current server time.",
      "Check how long tokens live and whether they are refreshed.",
      "Handle the expiry error with a 401 and a re-login prompt."
    ],
    why: "verifyToken calls jwt.verify, which throws when the exp claim has passed. requireSession does not catch it, so the request fails.",
    conf: 8,
    ev: [
      ["src/auth/token.ts", 23, "return jwt.verify(token, secret);"],
      ["src/auth/session.ts", 15, "return verifyToken(token);"]
    ],
    unk: "The token payload and server time are not in the log, so clock drift cannot be ruled out.",
    tests: [
      "verifyToken with an expired token throws the expiry error.",
      "requireSession returns 401 instead of a server error on expiry.",
      "A token near its expiry still passes."
    ]
  },
  {
    n: "DB refused",
    re: /ECONNREFUSED|db\/client/i,
    log: "Error: connect ECONNREFUSED 127.0.0.1:5432\n    at connect (src/db/client.ts:9)",
    files: [
      ["src/db/client.ts", 9, "Stack frame where the connection fails"],
      ["src/billing/invoice.ts", null, "Imports the client and runs queries"],
      ["src/auth/session.ts", null, "Imports the client for session lookups"]
    ],
    causes: [
      "The database is not running on that host and port.",
      "DB_HOST is unset, so the default 127.0.0.1 is used."
    ],
    steps: [
      "Confirm the database process is running and listening on 5432.",
      "Print DB_HOST in the environment where the app starts.",
      "Try connecting with a database client from the same machine."
    ],
    why: "The pool connects to the default local host when DB_HOST is missing. A refused connection means nothing is listening at that address.",
    conf: 9,
    ev: [
      ["src/db/client.ts", 6, "host: process.env.DB_HOST ?? '127.0.0.1',"],
      ["src/db/client.ts", 9, "export const connect = () => pool.connect();"]
    ],
    unk: "Deployment settings are outside the uploaded code, so the real DB_HOST value is unknown.",
    tests: [
      "connect fails with a clear message when the database is down.",
      "Config loads DB_HOST from the environment.",
      "Invoice and session code surface a database error, not a crash."
    ]
  }
];

export function analyzeErrorLog(text) {
  if (!text) return null;
  for (let i = 0; i < FAILURE_PRESETS.length; i++) {
    if (FAILURE_PRESETS[i].re.test(text)) {
      return FAILURE_PRESETS[i];
    }
  }
  return null;
}
