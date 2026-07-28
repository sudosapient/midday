import { redirect } from "next/navigation";
import { getInvoiceCreatePath } from "@/utils/invoice-ui";

export default function NewInvoicePage() {
  redirect(getInvoiceCreatePath());
}
