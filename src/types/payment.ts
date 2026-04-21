export interface InvoiceItem {
    id: number;
    invoice_code: string;
    amount?: number;
    total_commission?: string | number;
    /** Mã trạng thái — số hoặc chuỗi số; một số API trả kèm label */
    status: number | string;
    /** Tên trạng thái từ API (ưu tiên khi map config không khớp) */
    status_name?: string;
    status_label?: string;
    date_from: string;
    date_to: string;
    date_paid: string;
}

export interface PaymentInvoicesResponse {
    invoices: InvoiceItem[];
    meta: {
        total: number;
        current_page: number;
    };
}
