/**
 * E-contract / eKYC — khớp validator pub-be `POST /api/v1/ekyc/create/contract`
 */

export interface ContractInfoPayload {
    email: string;
    name: string;
    phone: string;
    permanent_address: string;
    /** định dạng dd/mm/yyyy */
    date_of_birth: string;
    identity_card: string;
    issue_place: string;
    /** định dạng dd/mm/yyyy */
    issue_date: string;
    /** Mã quốc gia / mã backend chấp nhận (vd: VN) */
    country: string;
    account_name: string;
    account_number: string;
    bank_name: string;
    bank_branch: string;
    tax_code?: string | null;
    front_image?: string;
    back_image?: string;
    swift_code?: string;
    bank_id?: string | number | null;
}

export interface CreateEkycContractRequest {
    resource_id: string;
    is_ekyc: 0 | 1;
    contract_info: ContractInfoPayload;
}

export interface SaveEkycContractStepRequest {
    step: number;
    resource_id?: string;
    is_ekyc?: 0 | 1 | boolean;
    contract_info: Record<string, unknown>;
}

export interface EkycContractListMeta {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
}

export interface EkycContractProfile {
    id?: number | string;
    publisher_id?: number | string;
    step?: number;
    bank_name?: string;
    bank_name_vi?: string;
    account_name?: string;
    account_number?: string;
    bank_branch?: string;
    full_name?: string;
    id_number?: string;
    dob?: string;
    id_issue_place?: string;
    id_issue_date?: string;
    phone?: string;
    email?: string;
    address?: string;
    tax_code?: string | null;
    front_image?: string;
    back_image?: string;
    swift_code?: string;
    bank_id?: string | number | null;
    [key: string]: unknown;
}

export interface EkycContractSession {
    resource_id?: string;
    [key: string]: unknown;
}

/** Bản ghi list — backend có thể bổ sung field; giữ index signature qua normalize */
export interface EkycContractRecord {
    id?: number;
    step?: number;
    status?: number | string;
    status_name?: string;
    contract_status_name?: string;
    status_label?: string;
    contract_status?: string;
    sign_url?: string;
    contract_url?: string;
    contract_code?: string;
    contract_number?: string;
    contract_id?: string | number;
    publisher_contract_id?: string | number;
    code?: string;
    document_name?: string;
    document_code?: string;
    contract_document?: string;
    file_name?: string;
    signed_at?: string;
    contract_signed_at?: string;
    sign_date?: string;
    note?: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    name?: string;
    url?: string;
    link?: string | null;
    error_code?: string | null;
    error_message?: string | null;
    sign_expire_date?: string;
    profile?: EkycContractProfile;
    session?: EkycContractSession;
    [key: string]: unknown;
}

export interface BankCoreOption {
    id: string | number;
    bank_code: string;
    bank_name_vi: string;
    bank_name?: string;
    swift_code?: string;
    display_name?: string;
}

export interface ApiMutationResult {
    ok: boolean;
    message: string;
    code?: string;
    data?: unknown;
    validation?: Record<string, string[]>;
}

export interface EkycSidebarStatus {
    linked: boolean;
    ekyc?: Record<string, unknown> | null;
}

export type CreateEkycContractResult =
    | { ok: true; data: unknown }
    | {
          ok: false;
          message: string;
          code?: string;
          validation?: Record<string, string[]>;
      };
