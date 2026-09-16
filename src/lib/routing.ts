export const DEPARTMENTS = ["IT", "HR", "Operations", "Finance"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ["needs_review", "new", "in_progress", "resolved", "closed"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  needs_review: "Needs review",
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const DEPARTMENT_BLURB: Record<Department, string> = {
  IT: "Devices, accounts, access, network and software",
  HR: "People, policy, payroll records, conduct and onboarding",
  Operations: "Facilities, logistics, equipment and site services",
  Finance: "Invoices, expenses, purchase orders and budgets",
};

export const DEPARTMENT_SLUGS: Record<string, Department> = {
  it: "IT",
  hr: "HR",
  operations: "Operations",
  finance: "Finance",
};

export function departmentSlug(department: Department): string {
  return department.toLowerCase();
}

export const DEPARTMENT_KEYWORDS: Record<Department, string[]> = {
  IT: [
    "vpn",
    "laptop",
    "password",
    "login",
    "wifi",
    "network",
    "printer",
    "software",
    "email",
    "access",
    "server",
    "2fa",
    "two-factor",
    "computer",
    "monitor",
    "install",
    "account locked",
    "phishing",
    "backup",
  ],
  HR: [
    "leave",
    "holiday",
    "parental",
    "maternity",
    "contract",
    "onboarding",
    "resign",
    "grievance",
    "harassment",
    "conduct",
    "handbook",
    "benefits",
    "pension",
    "sick",
    "appraisal",
    "emergency contact",
    "policy",
    "training",
  ],
  Operations: [
    "facility",
    "facilities",
    "office",
    "cleaning",
    "air conditioning",
    "delivery",
    "courier",
    "warehouse",
    "shipment",
    "pallet",
    "badge",
    "desk",
    "supplies",
    "maintenance",
    "meeting room",
    "shift",
    "logistics",
    "keys",
  ],
  Finance: [
    "invoice",
    "payment",
    "expense",
    "reimburse",
    "purchase order",
    " po ",
    "budget",
    "cost centre",
    "cost center",
    "payroll",
    "payslip",
    "salary",
    "tax",
    "vat",
    "refund",
    "corporate card",
    "vendor",
    "billing",
  ],
};

export type RoutingDecision = {
  department: Department | null;
  priority: Priority;
  confidence: number;
  reasoning: string;
  summary: string;
  source: "ai" | "rules";
};

/**
 * Deterministic keyword fallback so a ticket is never lost if the smart
 * routing call fails.
 */
export function routeByKeywords(title: string, description: string): RoutingDecision {
  const text = ` ${`${title} ${description}`.toLowerCase()} `;
  let best: Department | null = null;
  let bestScore = 0;
  const hits: string[] = [];

  for (const department of DEPARTMENTS) {
    let score = 0;
    for (const keyword of DEPARTMENT_KEYWORDS[department]) {
      if (text.includes(keyword)) {
        score += 1;
        hits.push(keyword.trim());
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = department;
    }
  }

  const urgent = /urgent|asap|immediately|blocked|cannot work|locked out|down/.test(text);
  const priority: Priority = urgent ? "high" : "medium";

  if (!best) {
    return {
      department: null,
      priority,
      confidence: 0.25,
      reasoning: "No clear signals in the request text, so it was flagged for a human to triage.",
      summary: title.slice(0, 120),
      source: "rules",
    };
  }

  return {
    department: best,
    priority,
    confidence: Math.min(0.45 + bestScore * 0.12, 0.85),
    reasoning: `Matched ${best} keywords: ${[...new Set(hits)].slice(0, 4).join(", ")}.`,
    summary: title.slice(0, 120),
    source: "rules",
  };
}

export const CONFIDENCE_FLOOR = 0.45;
