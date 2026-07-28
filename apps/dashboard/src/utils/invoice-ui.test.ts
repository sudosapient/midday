import { describe, expect, test } from "bun:test";
import en from "../locales/en";
import { normalizeSelectValue } from "./form-ui";
import { getInvoiceCreatePath } from "./invoice-ui";

describe("invoice UI", () => {
  test("describes an empty payment history without calling it unknown", () => {
    expect(en.payment_status.none).toBe("No payment history");
  });

  test("uses the canonical invoice creation URL", () => {
    expect(getInvoiceCreatePath()).toBe("/invoices?invoiceType=create");
  });

  test("keeps optional selects controlled before a choice is made", () => {
    expect(normalizeSelectValue(undefined)).toBe("");
    expect(normalizeSelectValue("freelancer")).toBe("freelancer");
  });
});
