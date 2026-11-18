import type { ApiDoc, DocEndpoint } from "./types";

export const json = (value: unknown) => JSON.stringify(value, null, 2);

function url(doc: ApiDoc, endpoint: DocEndpoint) {
  return `${doc.baseUrl}${endpoint.path}${endpoint.queryExample ?? ""}`;
}

export function curlSample(doc: ApiDoc, endpoint: DocEndpoint) {
  const lines = [`curl -X ${endpoint.method} "${url(doc, endpoint)}"`, `  -H "${doc.auth.header}: $WORKFORCE_API_KEY"`];
  if (endpoint.requestExample !== undefined) {
    lines.push(`  -H "Content-Type: application/json"`, `  -d '${json(endpoint.requestExample)}'`);
  }
  return lines.join(" \\\n");
}

export function fetchSample(doc: ApiDoc, endpoint: DocEndpoint) {
  const options = [
    `  method: "${endpoint.method}",`,
    `  headers: {`,
    `    "${doc.auth.header}": process.env.WORKFORCE_API_KEY,`,
    ...(endpoint.requestExample !== undefined ? [`    "Content-Type": "application/json"`] : []),
    `  },`,
    ...(endpoint.requestExample !== undefined
      ? [`  body: JSON.stringify(${json(endpoint.requestExample).replace(/\n/g, "\n  ")})`]
      : [])
  ];
  return [`const res = await fetch("${url(doc, endpoint)}", {`, ...options, `});`, `const { data, error } = await res.json();`].join("\n");
}

/** Builds a Postman v2.1 collection from the doc so developers can try every call. */
export function postmanCollection(doc: ApiDoc) {
  const pathVars = new Set<string>();
  const items = doc.endpoints.map((endpoint) => {
    const path = endpoint.path.replace(/\{(\w+)\}/g, (_, name: string) => {
      pathVars.add(name);
      return `{{${name}}}`;
    });
    const raw = `{{baseUrl}}${path}${endpoint.queryExample ?? ""}`;
    const query = (endpoint.queryExample ?? "")
      .replace(/^\?/, "")
      .split("&")
      .filter(Boolean)
      .map((pair) => {
        const [key, value = ""] = pair.split("=");
        return { key, value };
      });
    return {
      name: endpoint.title,
      request: {
        method: endpoint.method,
        description: endpoint.summary,
        header: [
          { key: doc.auth.header, value: "{{apiKey}}" },
          ...(endpoint.requestExample !== undefined ? [{ key: "Content-Type", value: "application/json" }] : [])
        ],
        url: { raw, host: ["{{baseUrl}}"], path: path.split("/").filter(Boolean), ...(query.length ? { query } : {}) },
        ...(endpoint.requestExample !== undefined
          ? { body: { mode: "raw", raw: json(endpoint.requestExample), options: { raw: { language: "json" } } } }
          : {})
      }
    };
  });
  return {
    info: {
      name: `Workforce ${doc.title}`,
      description: doc.summary,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    variable: [
      { key: "baseUrl", value: doc.baseUrl },
      { key: "apiKey", value: "paste-your-api-key" },
      ...[...pathVars].map((key) => ({ key, value: "" }))
    ],
    item: items
  };
}

export function downloadPostman(doc: ApiDoc) {
  const blob = new Blob([json(postmanCollection(doc))], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `workforce-${doc.slug}.postman_collection.json`;
  a.click();
  URL.revokeObjectURL(href);
}
