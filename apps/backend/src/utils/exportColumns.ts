import { ITransaction } from "../models/transaction.model";

type ColumnKey =
  | "id"
  | "user_id"
  | "date"
  | "amount"
  | "category"
  | "status"
  | "createdAt";

interface ColumnDef {
  key: ColumnKey;
  label: string;          // CSV header
  field: keyof ITransaction | "createdAt";
  format?: (value: any) => string;
}

export const EXPORT_COLUMNS: Record<ColumnKey, ColumnDef> = {
  id:         { key: "id",         label: "Transaction ID", field: "id" },
  user_id:    { key: "user_id",    label: "User ID",        field: "user_id" },
  date:       { key: "date",       label: "Date",           field: "date",
                format: (v) => new Date(v).toISOString() },
  amount:     { key: "amount",     label: "Amount",         field: "amount",
                format: (v) => Number(v).toFixed(2) },
  category:   { key: "category",   label: "Category",       field: "category" },
  status:     { key: "status",     label: "Status",         field: "status" },
  createdAt:  { key: "createdAt",  label: "Created At",     field: "createdAt",
                format: (v) => new Date(v).toISOString() },
};

export const DEFAULT_COLUMNS: ColumnKey[] = [
  "id", "user_id", "date", "amount", "category", "status",
];

export const validColumns = (input: string[]):ColumnDef[] => {
  const valid = input.filter((c) => c in EXPORT_COLUMNS) as ColumnKey[];
  const keys = valid.length > 0 ? valid : DEFAULT_COLUMNS;
  return keys.map((k) => EXPORT_COLUMNS[k]);
}
