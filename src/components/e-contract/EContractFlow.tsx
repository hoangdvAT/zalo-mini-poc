import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, Input, Button, Icon, Modal, Select, useSnackbar, useNavigate } from "zmp-ui";
import {
    checkEkycSidebarStatus,
    confirmLinkScalefPhone,
    fetchBankCoreList,
    fetchEkycContracts,
    fetchPublisherProfile,
    linkScalefAccount,
    saveEkycContractStep,
    verifyBankAccount,
} from "@/services/api";
import type {
    BankCoreOption,
    EkycContractProfile,
    EkycContractRecord,
} from "@/types/eContract";
import { openExternalUrl } from "@/utils/openExternalUrl";

type FlowView = "payment" | "ekyc" | "tax" | "contract" | "link-account" | "complete";
type ResignStep = 1 | 2 | 3 | 4;
type LinkModalStep = "review-phonenumber" | "confirm-not-change" | "not-match";

interface FlowFormState {
    email: string;
    name: string;
    phone: string;
    permanent_address: string;
    date_of_birth: string;
    identity_card: string;
    issue_place: string;
    issue_date: string;
    country: string;
    account_name: string;
    account_number: string;
    bank_name: string;
    bank_branch: string;
    front_image: string;
    back_image: string;
}

interface PaymentDraftState {
    bank_code: string;
    bank_name: string;
    account_name: string;
    account_number: string;
    bank_branch: string;
    swift_code: string;
    bank_id: string;
}

interface LinkModalState {
    visible: boolean;
    step: LinkModalStep;
    currentCorePhone: string;
    newScalefPhone: string;
    loading: boolean;
}

type PaymentUiState = "idle" | "failed";

interface ResignConfig {
    restartStep: ResignStep;
    description: string;
    restartFromBeginning: boolean;
}

const LINK_ACCOUNT_RELEASE_DATE = new Date("2025-12-26T00:00:00+07:00");
const ALLOWED_COMPLETE_STATUSES = new Set(["SUBMIT", "WAITING_TO_SIGN", "PROCESSING", "SIGNED"]);
const RESIGN_STATUSES = new Set(["REJECT", "VOIDED", "SUBMIT_FAIL", "OVERDUE", "FAIL"]);

const DEFAULT_FORM: FlowFormState = {
    email: "",
    name: "",
    phone: "",
    permanent_address: "",
    date_of_birth: "",
    identity_card: "",
    issue_place: "",
    issue_date: "",
    country: "VN",
    account_name: "",
    account_number: "",
    bank_name: "",
    bank_branch: "",
    front_image: "",
    back_image: "",
};

const DEFAULT_PAYMENT_DRAFT: PaymentDraftState = {
    bank_code: "",
    bank_name: "",
    account_name: "",
    account_number: "",
    bank_branch: "",
    swift_code: "",
    bank_id: "",
};

const STEP_LABELS_BASE = [
    { key: "payment", label: "Phương thức thanh toán", number: 1 },
    { key: "ekyc", label: "EKYC", number: 2 },
    { key: "tax", label: "Mã số thuế", number: 3 },
    { key: "contract", label: "Ký hợp đồng", number: 4 },
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return null;
}

function textOf(value: unknown): string {
    return value === undefined || value === null ? "" : String(value).trim();
}

function digitsPhone(raw: string): string {
    return (raw || "").replace(/\D/g, "").replace(/^84/, "0");
}

function countryToApiCode(country: string): string {
    const t = (country || "").trim().toLowerCase();
    if (!t) return "VN";
    if (t.includes("việt") || t.includes("vietnam") || t === "vn") return "VN";
    if (t.length <= 3) return t.toUpperCase();
    return "VN";
}

function getProfile(contract: EkycContractRecord | null): EkycContractProfile {
    return contract?.profile || {};
}

function getStepFromContract(contract: EkycContractRecord | null): number {
    if (!contract) return 0;
    const profileStep = typeof contract.profile?.step === "number" ? contract.profile.step : Number(contract.profile?.step || 0);
    const rootStep = typeof contract.step === "number" ? contract.step : Number(contract.step || 0);
    return Number.isFinite(rootStep) && rootStep > 0 ? rootStep : Number.isFinite(profileStep) ? profileStep : 0;
}

function needsResign(status?: string | null): boolean {
    return RESIGN_STATUSES.has(String(status || "").trim());
}

function isAllowedCompleteStatus(status?: string | null): boolean {
    return ALLOWED_COMPLETE_STATUSES.has(String(status || "").trim());
}

function hasPaymentInfo(contract: EkycContractRecord | null): boolean {
    const profile = getProfile(contract);
    return Boolean(textOf(profile.account_name) && textOf(profile.account_number) && textOf(profile.bank_name || profile.bank_name_vi));
}

function hasCompletedEkyc(contract: EkycContractRecord | null): boolean {
    const profile = getProfile(contract);
    return Boolean(
        textOf(profile.full_name) &&
        textOf(profile.id_number) &&
        textOf(profile.dob) &&
        textOf(profile.id_issue_date) &&
        textOf(profile.id_issue_place) &&
        textOf(profile.phone) &&
        textOf(profile.email) &&
        textOf(profile.address) &&
        textOf(profile.account_name)
    );
}

function shouldShowOverview(contract: EkycContractRecord | null): boolean {
    if (!contract) return false;
    const step = getStepFromContract(contract);
    return step >= 4 && Boolean(textOf(contract.link)) && isAllowedCompleteStatus(contract.contract_status);
}

function shouldShowLinkAccountStep(contract: EkycContractRecord | null): boolean {
    if (!contract) return false;
    const signDate = textOf(contract.sign_date);
    if (!signDate) return true;
    if (needsResign(contract.contract_status)) return true;
    if (getStepFromContract(contract) < 4) return true;
    const parsed = new Date(signDate);
    return !Number.isNaN(parsed.getTime()) && parsed > LINK_ACCOUNT_RELEASE_DATE;
}

function getResourceId(contract: EkycContractRecord | null, fallbackResourceId: string): string {
    const sessionId = textOf(contract?.session?.resource_id);
    const rootId = textOf(contract?.resource_id);
    const ekycProfileId = textOf(contract?.ekyc_profile_id);
    return sessionId || rootId || ekycProfileId || fallbackResourceId;
}

function mapContractStatus(status?: string | null): string {
    const key = String(status || "").trim().toUpperCase();
    const map: Record<string, string> = {
        WAITING_TO_SIGN: "Chờ ký",
        SUBMIT: "Đã gửi",
        PROCESSING: "Đang xử lý",
        SIGNED: "Đã ký",
        SIGNED_SUCCESS: "Đã ký",
        COMPLETED: "Hoàn thành",
        REJECT: "Từ chối",
        VOIDED: "Vô hiệu",
        SUBMIT_FAIL: "Gửi thất bại",
        OVERDUE: "Quá hạn",
        FAIL: "Thất bại",
        CANCELLED: "Đã hủy",
    };
    return map[key] || textOf(status) || "—";
}

function getStatusClass(status?: string | null): string {
    const key = String(status || "").trim().toUpperCase();
    if (key === "WAITING_TO_SIGN") return "ec-status-badge--waiting";
    if (key === "SIGNED" || key === "COMPLETED" || key === "PROCESSING" || key === "SUBMIT") {
        return "ec-status-badge--success";
    }
    if (key === "REJECT" || key === "VOIDED" || key === "SUBMIT_FAIL" || key === "OVERDUE" || key === "FAIL" || key === "CANCELLED") {
        return "ec-status-badge--danger";
    }
    return "ec-status-badge--default";
}

function parseDateToDisplay(value: string): string {
    const input = textOf(value);
    if (!input) return "";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) return input;
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        const [y, m, d] = input.split("-");
        return `${d}/${m}/${y}`;
    }
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return input;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function formatDateTime(value: string): string {
    const input = textOf(value);
    if (!input) return "—";
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return input;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    const sec = String(date.getSeconds()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${sec}`;
}

function formatContractDate(value: string): string {
    const input = textOf(value);
    if (!input) return "";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) return input;
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        const [y, m, d] = input.split("-");
        return `${d}/${m}/${y}`;
    }
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return input;
    return parseDateToDisplay(date.toISOString().slice(0, 10));
}

function contractNo(contract: EkycContractRecord | null): string {
    if (!contract) return "—";
    const value =
        contract.contract_code ??
        contract.contract_number ??
        contract.contract_id ??
        contract.publisher_contract_id ??
        contract.code ??
        contract.id;
    return value !== undefined && value !== null && String(value) !== "" ? String(value) : "—";
}

function getResignConfig(contract: EkycContractRecord | null): ResignConfig | null {
    if (!contract) return null;
    const status = String(contract.contract_status || "").trim().toUpperCase();
    const step = getStepFromContract(contract);
    const errorCode = textOf(contract.error_code).toUpperCase() || null;

    const flows: Array<{
        status: string;
        currentStep: number;
        errorCode: string | null;
        config: ResignConfig;
    }> = [
            {
                status: "REJECT",
                currentStep: 1,
                errorCode: "ER01",
                config: { restartStep: 2, description: "Làm lại EKYC → Kí hợp đồng", restartFromBeginning: false },
            },
            {
                status: "REJECT",
                currentStep: 1,
                errorCode: "ER02",
                config: { restartStep: 2, description: "Sửa thông tin cá nhân → Kí hợp đồng", restartFromBeginning: false },
            },
            {
                status: "VOIDED",
                currentStep: 1,
                errorCode: "ER01",
                config: { restartStep: 2, description: "Làm lại EKYC → Kí hợp đồng", restartFromBeginning: false },
            },
            {
                status: "VOIDED",
                currentStep: 1,
                errorCode: "ER02",
                config: { restartStep: 2, description: "Sửa thông tin cá nhân → Kí hợp đồng", restartFromBeginning: false },
            },
            {
                status: "REJECT",
                currentStep: 3,
                errorCode: "ER03",
                config: { restartStep: 4, description: "Kí hợp đồng", restartFromBeginning: false },
            },
            {
                status: "VOIDED",
                currentStep: 3,
                errorCode: "ER03",
                config: { restartStep: 4, description: "Kí hợp đồng", restartFromBeginning: false },
            },
            {
                status: "REJECT",
                currentStep: 2,
                errorCode: "ER04",
                config: { restartStep: 3, description: "Làm lại Tax Code → Kí hợp đồng", restartFromBeginning: false },
            },
            {
                status: "VOIDED",
                currentStep: 2,
                errorCode: "ER04",
                config: { restartStep: 3, description: "Làm lại Tax Code → Kí hợp đồng", restartFromBeginning: false },
            },
            {
                status: "REJECT",
                currentStep: 0,
                errorCode: "ER05",
                config: { restartStep: 1, description: "Làm lại Payment Method → Kí hợp đồng", restartFromBeginning: false },
            },
            {
                status: "VOIDED",
                currentStep: 0,
                errorCode: "ER05",
                config: { restartStep: 1, description: "Làm lại Payment Method → Kí hợp đồng", restartFromBeginning: false },
            },
            {
                status: "SUBMIT_FAIL",
                currentStep: 3,
                errorCode: null,
                config: { restartStep: 4, description: "Kí hợp đồng", restartFromBeginning: false },
            },
            {
                status: "OVERDUE",
                currentStep: 3,
                errorCode: null,
                config: { restartStep: 4, description: "Kí hợp đồng", restartFromBeginning: false },
            },
            {
                status: "REJECT",
                currentStep: 0,
                errorCode: null,
                config: { restartStep: 1, description: "Làm lại từ đầu từ bước 1 đến hết các bước", restartFromBeginning: true },
            },
            {
                status: "VOIDED",
                currentStep: 0,
                errorCode: null,
                config: { restartStep: 1, description: "Làm lại từ đầu từ bước 1 đến hết các bước", restartFromBeginning: true },
            },
            {
                status: "FAIL",
                currentStep: 0,
                errorCode: null,
                config: { restartStep: 1, description: "Làm lại từ đầu từ bước 1 đến hết các bước", restartFromBeginning: true },
            },
        ];

    const exact = flows.find((flow) => flow.status === status && flow.currentStep === step && flow.errorCode === errorCode);
    if (exact) return exact.config;

    if ((status === "REJECT" || status === "VOIDED") && errorCode && !["ER01", "ER02", "ER03", "ER04", "ER05"].includes(errorCode)) {
        return { restartStep: 1, description: "Làm lại từ đầu từ bước 1 đến hết các bước", restartFromBeginning: true };
    }

    return flows.find((flow) => flow.status === status && flow.currentStep === step && flow.errorCode === null)?.config || null;
}

function getRestartView(restartStep: ResignStep): FlowView {
    switch (restartStep) {
        case 1:
            return "payment";
        case 2:
            return "ekyc";
        case 3:
            return "tax";
        case 4:
        default:
            return "contract";
    }
}

function buildStepItems(showLinkAccountStep: boolean) {
    const items = [...STEP_LABELS_BASE];
    if (showLinkAccountStep) {
        items.push({ key: "link-account", label: "Liên kết tài khoản", number: 5 } as const);
        items.push({ key: "complete", label: "Hoàn thành", number: 6 } as const);
        return items;
    }
    items.push({ key: "complete", label: "Hoàn thành", number: 5 } as const);
    return items;
}

function deriveServerView(
    contract: EkycContractRecord | null,
    linked: boolean,
    resignFlowStarted: boolean
): FlowView {
    if (!contract) return "payment";

    const step = getStepFromContract(contract);
    const status = contract.contract_status;
    const resignConfig = getResignConfig(contract);

    if (needsResign(status) && resignConfig && !resignFlowStarted) {
        return "contract";
    }

    if (shouldShowOverview(contract)) {
        if (shouldShowLinkAccountStep(contract) && !linked) {
            return "link-account";
        }
        return "complete";
    }

    if (isAllowedCompleteStatus(status)) {
        return "complete";
    }

    if (step >= 4) return "contract";
    if (step === 3) return "contract";
    if (step === 2) return "tax";
    if (step === 1) return "ekyc";
    return "payment";
}

export const EContractFlow: React.FC = () => {
    const navigate = useNavigate();
    const { openSnackbar } = useSnackbar();
    const firstLoadRef = useRef(true);
    const snackbarRef = useRef(openSnackbar);
    const resignFlowStartedRef = useRef(false);

    const [loading, setLoading] = useState(true);
    const [listLoading, setListLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [contractInfo, setContractInfo] = useState<EkycContractRecord | null>(null);
    const [resourceId, setResourceId] = useState("");
    const [bankOptions, setBankOptions] = useState<BankCoreOption[]>([]);
    const [form, setForm] = useState<FlowFormState>(DEFAULT_FORM);
    const [taxCode, setTaxCode] = useState("");
    const [isLinkedAccount, setIsLinkedAccount] = useState(false);
    const [view, setView] = useState<FlowView>("payment");
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [paymentDraft, setPaymentDraft] = useState<PaymentDraftState>(DEFAULT_PAYMENT_DRAFT);
    const [paymentEditing, setPaymentEditing] = useState(false);
    const [paymentSaving, setPaymentSaving] = useState(false);
    const [paymentUiState, setPaymentUiState] = useState<PaymentUiState>("idle");
    const [linkStepSuccess, setLinkStepSuccess] = useState(false);
    const [resignFlowStarted, setResignFlowStarted] = useState(false);
    const [linkModal, setLinkModal] = useState<LinkModalState>({
        visible: false,
        step: "review-phonenumber",
        currentCorePhone: "",
        newScalefPhone: "",
        loading: false,
    });

    useEffect(() => {
        snackbarRef.current = openSnackbar;
    }, [openSnackbar]);

    useEffect(() => {
        resignFlowStartedRef.current = resignFlowStarted;
    }, [resignFlowStarted]);

    const loadData = useCallback(
        async (forceDeriveView = false) => {
            setLoading(true);
            setListLoading(true);
            try {
                const [publisher, ekycList, sidebarStatus, banks] = await Promise.all([
                    fetchPublisherProfile(),
                    fetchEkycContracts(1),
                    checkEkycSidebarStatus(),
                    fetchBankCoreList(),
                ]);

                setBankOptions(banks);
                setIsLinkedAccount(sidebarStatus.linked);

                const currentContract = ekycList.items[0] ?? null;
                setContractInfo(currentContract);

                const raw = asRecord(publisher?.raw) || {};
                const rawUser = asRecord(raw.user) || raw;
                const rawProfile = asRecord(rawUser.profile) || {};

                const internalId = textOf(rawUser.id);
                if (internalId) {
                    setResourceId(internalId);
                }

                const contractProfile = getProfile(currentContract);
                const firstName = textOf(rawProfile.first_name || rawUser.first_name);
                const lastName = textOf(rawProfile.last_name || rawUser.last_name);
                const fullNameFromPublisher = [firstName, lastName].filter(Boolean).join(" ").trim();

                const nextForm: FlowFormState = {
                    email: textOf(contractProfile.email) || textOf(rawUser.email) || textOf(publisher?.user?.email),
                    name: textOf(contractProfile.full_name) || fullNameFromPublisher || textOf(publisher?.user?.name),
                    phone:
                        textOf(contractProfile.phone) ||
                        digitsPhone(textOf(rawProfile.phone_number || rawUser.phone_number || publisher?.user?.phone)),
                    permanent_address: textOf(contractProfile.address) || textOf(rawProfile.address || rawUser.address),
                    date_of_birth: textOf(contractProfile.dob) || textOf(rawProfile.date_of_birth || rawUser.date_of_birth),
                    identity_card: textOf(contractProfile.id_number) || textOf(rawProfile.card_number || rawUser.card_number),
                    issue_place: textOf(contractProfile.id_issue_place),
                    issue_date: textOf(contractProfile.id_issue_date),
                    country:
                        countryToApiCode(textOf((contractProfile as Record<string, unknown>).country) || textOf(rawProfile.country || rawUser.country || "VN")) ||
                        "VN",
                    account_name: textOf(contractProfile.account_name) || fullNameFromPublisher || textOf(publisher?.user?.name),
                    account_number: textOf(contractProfile.account_number),
                    bank_name: textOf(contractProfile.bank_name_vi || contractProfile.bank_name),
                    bank_branch: textOf(contractProfile.bank_branch),
                    front_image: textOf(contractProfile.front_image) || textOf(rawProfile.image_before_card || rawUser.image_before_card),
                    back_image: textOf(contractProfile.back_image) || textOf(rawProfile.image_after_card || rawUser.image_after_card),
                };

                setForm(nextForm);
                setTaxCode(textOf(contractProfile.id_number) || textOf(contractProfile.tax_code));

                if (!needsResign(currentContract?.contract_status)) {
                    setResignFlowStarted(false);
                }

                setLinkStepSuccess(Boolean(sidebarStatus.linked && shouldShowLinkAccountStep(currentContract)));

                const nextView = deriveServerView(currentContract, sidebarStatus.linked, resignFlowStartedRef.current);
                setView((prev) => {
                    if (firstLoadRef.current || forceDeriveView) {
                        return nextView;
                    }
                    if (prev === "complete" && !isAllowedCompleteStatus(currentContract?.contract_status)) {
                        return "contract";
                    }
                    return prev;
                });

                if (firstLoadRef.current) {
                    firstLoadRef.current = false;
                }
            } catch (error) {
                console.error("[EContract] loadData:", error);
                snackbarRef.current({
                    type: "error",
                    text: "Không tải được thông tin hợp đồng điện tử.",
                    duration: 3000,
                });
            } finally {
                setLoading(false);
                setListLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        void loadData(true);
    }, [loadData]);

    const showLinkAccountStep = useMemo(() => shouldShowLinkAccountStep(contractInfo), [contractInfo]);
    const showOverview = useMemo(() => shouldShowOverview(contractInfo), [contractInfo]);
    const currentStepOnServer = useMemo(() => getStepFromContract(contractInfo), [contractInfo]);
    const resignConfig = useMemo(() => getResignConfig(contractInfo), [contractInfo]);
    const stepItems = useMemo(() => buildStepItems(showLinkAccountStep), [showLinkAccountStep]);

    const currentPayment = useMemo(() => {
        const profile = getProfile(contractInfo);
        const bankCode =
            bankOptions.find(
                (bank) =>
                    bank.bank_name_vi === textOf(profile.bank_name_vi || profile.bank_name) ||
                    bank.bank_code === textOf(profile.bank_name)
            )?.bank_code || "";
        return {
            bank_code: bankCode,
            bank_name: textOf(profile.bank_name_vi || profile.bank_name) || form.bank_name,
            account_name: textOf(profile.account_name) || form.account_name,
            account_number: textOf(profile.account_number) || form.account_number,
            bank_branch: textOf(profile.bank_branch) || form.bank_branch,
            swift_code: textOf(profile.swift_code),
            bank_id: textOf(profile.bank_id),
        };
    }, [bankOptions, contractInfo, form.account_name, form.account_number, form.bank_branch, form.bank_name]);

    const stepStatus = useMemo(() => {
        const allowed = isAllowedCompleteStatus(contractInfo?.contract_status);
        return {
            payment: currentStepOnServer >= 1 || allowed,
            ekyc: currentStepOnServer >= 2 || allowed,
            tax: currentStepOnServer >= 3 || allowed,
            contract: currentStepOnServer >= 4 || allowed,
            link: isLinkedAccount,
            complete: allowed && (!showLinkAccountStep || isLinkedAccount),
        };
    }, [contractInfo?.contract_status, currentStepOnServer, isLinkedAccount, showLinkAccountStep]);

    const activeStepKey = useMemo(() => {
        if (view === "link-account") return "link-account";
        return view;
    }, [view]);

    const visualStep = useMemo(() => {
        switch (view) {
            case "payment":
                return 1;
            case "ekyc":
                return 2;
            case "tax":
            case "contract":
                return 3;
            case "link-account":
                return 4;
            case "complete":
            default:
                return 5;
        }
    }, [view]);

    const bankVerificationStatus = useMemo(() => {
        if (stepStatus.payment) {
            return { label: "Đã xác thực", tone: "success" as const, retry: false };
        }
        if (paymentUiState === "failed") {
            return { label: "Xác thực thất bại", tone: "danger" as const, retry: true };
        }
        if (currentPayment.account_number) {
            return { label: "Chờ xác thực", tone: "warning" as const, retry: false };
        }
        return null;
    }, [currentPayment.account_number, paymentUiState, stepStatus.payment]);

    const canNavigateTo = useCallback(
        (target: FlowView) => {
            if (!contractInfo && target !== "payment") return false;

            if (needsResign(contractInfo?.contract_status) && resignConfig && !resignFlowStarted && !resignConfig.restartFromBeginning) {
                const restartView = getRestartView(resignConfig.restartStep);
                return target === restartView || target === "contract";
            }

            switch (target) {
                case "payment":
                    return true;
                case "ekyc":
                    return currentStepOnServer >= 1 || view === "ekyc";
                case "tax":
                    return currentStepOnServer >= 2 || view === "tax";
                case "contract":
                    return currentStepOnServer >= 3 || currentStepOnServer >= 4 || view === "contract";
                case "link-account":
                    return showLinkAccountStep && currentStepOnServer >= 4;
                case "complete":
                    return showOverview && (!showLinkAccountStep || isLinkedAccount);
                default:
                    return false;
            }
        },
        [contractInfo, currentStepOnServer, isLinkedAccount, resignConfig, resignFlowStarted, showLinkAccountStep, showOverview, view]
    );

    const navigateToStep = useCallback(
        (target: FlowView) => {
            if (!canNavigateTo(target)) return;
            if (target === "complete") {
                setLinkStepSuccess(Boolean(isLinkedAccount));
            }
            setView(target);
        },
        [canNavigateTo, isLinkedAccount]
    );

    const openPaymentEditor = useCallback(() => {
        const existingBank =
            bankOptions.find(
                (bank) =>
                    bank.bank_code === currentPayment.bank_code ||
                    bank.bank_name_vi === currentPayment.bank_name
            ) || null;
        setPaymentDraft({
            bank_code: existingBank?.bank_code || currentPayment.bank_code || "",
            bank_name: existingBank?.bank_name_vi || currentPayment.bank_name || "",
            account_name: currentPayment.account_name || "",
            account_number: currentPayment.account_number || "",
            bank_branch: currentPayment.bank_branch || "",
            swift_code: existingBank?.swift_code || currentPayment.swift_code || "",
            bank_id: textOf(existingBank?.id) || currentPayment.bank_id || "",
        });
        setPaymentModalVisible(true);
    }, [bankOptions, currentPayment]);

    const validatePaymentDraft = useCallback(() => {
        if (!paymentDraft.bank_code) return "Vui lòng chọn ngân hàng.";
        if (!paymentDraft.account_name.trim()) return "Vui lòng nhập tên chủ tài khoản.";
        if (!/^[A-Za-zÀ-ỹ\s]+$/.test(paymentDraft.account_name.trim())) {
            return "Tên chủ tài khoản chỉ được chứa chữ cái.";
        }
        if (!paymentDraft.account_number.trim()) return "Vui lòng nhập số tài khoản.";
        if (!/^\d+$/.test(paymentDraft.account_number.trim())) return "Số tài khoản chỉ được chứa chữ số.";
        if (!paymentDraft.bank_branch.trim()) return "Vui lòng nhập chi nhánh ngân hàng.";
        return "";
    }, [paymentDraft]);

    const handleVerifyPayment = useCallback(async () => {
        const error = validatePaymentDraft();
        if (error) {
            openSnackbar({ type: "error", text: error, duration: 3000 });
            return;
        }

        const selectedBank = bankOptions.find((bank) => bank.bank_code === paymentDraft.bank_code);
        if (!selectedBank) {
            openSnackbar({ type: "error", text: "Không tìm thấy ngân hàng đã chọn.", duration: 3000 });
            return;
        }

        setPaymentEditing(true);
        try {
            const result = await verifyBankAccount({
                bank_account: paymentDraft.account_number.trim(),
                swift_code: selectedBank.swift_code || undefined,
            });
            if (!result.ok) {
                setPaymentUiState("failed");
                openSnackbar({
                    type: "error",
                    text: result.code === "PX00002" ? "Số tài khoản ngân hàng không hợp lệ." : result.message,
                    duration: 4000,
                });
                return;
            }

            const nextPayment: PaymentDraftState = {
                bank_code: selectedBank.bank_code,
                bank_name: selectedBank.bank_name_vi,
                account_name: paymentDraft.account_name.trim(),
                account_number: paymentDraft.account_number.trim(),
                bank_branch: paymentDraft.bank_branch.trim(),
                swift_code: selectedBank.swift_code || "",
                bank_id: textOf(selectedBank.id),
            };

            setForm((prev) => ({
                ...prev,
                bank_name: nextPayment.bank_name,
                account_name: nextPayment.account_name,
                account_number: nextPayment.account_number,
                bank_branch: nextPayment.bank_branch,
            }));
            setPaymentUiState("idle");
            setPaymentDraft(nextPayment);
            setPaymentModalVisible(false);
        } finally {
            setPaymentEditing(false);
        }
    }, [bankOptions, openSnackbar, paymentDraft, validatePaymentDraft]);

    const handleSavePaymentStep = useCallback(async () => {
        if (stepStatus.payment) {
            setView("ekyc");
            return;
        }

        const selectedBank = bankOptions.find((bank) => bank.bank_name_vi === form.bank_name || bank.bank_code === paymentDraft.bank_code);
        const payload = {
            step: 1,
            contract_info: {
                bank_name: form.bank_name,
                account_name: form.account_name,
                account_number: form.account_number,
                bank_branch: form.bank_branch,
                swift_code: paymentDraft.swift_code || selectedBank?.swift_code || "",
                bank_id: paymentDraft.bank_id || textOf(selectedBank?.id),
            },
        };

        if (!payload.contract_info.bank_name || !payload.contract_info.account_name || !payload.contract_info.account_number || !payload.contract_info.bank_branch) {
            openSnackbar({ type: "error", text: "Vui lòng bổ sung đủ thông tin thanh toán.", duration: 3000 });
            return;
        }

        setPaymentSaving(true);
        try {
            const result = await saveEkycContractStep(payload);
            if (!result.ok) {
                openSnackbar({ type: "error", text: result.message, duration: 4000 });
                return;
            }
            setPaymentUiState("idle");
            openSnackbar({ type: "success", text: "Đã lưu phương thức thanh toán.", duration: 3000 });
            await loadData(true);
        } finally {
            setPaymentSaving(false);
        }
    }, [bankOptions, form.account_name, form.account_number, form.bank_branch, form.bank_name, loadData, openSnackbar, paymentDraft.bank_code, paymentDraft.bank_id, paymentDraft.swift_code, stepStatus.payment]);

    const effectiveTaxCode = useMemo(() => textOf(taxCode) || textOf(getProfile(contractInfo).tax_code) || textOf(getProfile(contractInfo).id_number), [contractInfo, taxCode]);
    const taxReadonly = Boolean(textOf(getProfile(contractInfo).id_number));
    const taxValid = useMemo(() => {
        const digits = effectiveTaxCode.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15;
    }, [effectiveTaxCode]);

    const buildContractInfoPayload = useCallback(
        (overrides?: Partial<Record<string, unknown>>) => ({
            email: textOf(overrides?.email) || form.email.trim(),
            name: textOf(overrides?.name) || form.name.trim(),
            phone: textOf(overrides?.phone) || form.phone.trim(),
            permanent_address: textOf(overrides?.permanent_address) || form.permanent_address.trim(),
            date_of_birth: formatContractDate(textOf(overrides?.date_of_birth) || form.date_of_birth),
            identity_card: textOf(overrides?.identity_card) || form.identity_card.trim(),
            front_image: textOf(overrides?.front_image) || form.front_image,
            back_image: textOf(overrides?.back_image) || form.back_image,
            issue_place: textOf(overrides?.issue_place) || form.issue_place.trim(),
            issue_date: formatContractDate(textOf(overrides?.issue_date) || form.issue_date),
            tax_code: textOf(overrides?.tax_code) || effectiveTaxCode,
            account_name: textOf(overrides?.account_name) || form.account_name.trim(),
            account_number: textOf(overrides?.account_number) || form.account_number.trim(),
            bank_name: textOf(overrides?.bank_name) || form.bank_name.trim(),
            bank_branch: textOf(overrides?.bank_branch) || form.bank_branch.trim(),
            country: textOf(overrides?.country) || form.country.trim() || "VN",
        }),
        [effectiveTaxCode, form]
    );

    const handleSaveTaxStep = useCallback(async () => {
        if (stepStatus.tax) {
            setView("contract");
            return;
        }

        if (!taxValid) {
            openSnackbar({ type: "error", text: "Mã số thuế cá nhân thường có 10-15 chữ số.", duration: 3000 });
            return;
        }

        const payload = {
            step: 3,
            resource_id: getResourceId(contractInfo, resourceId),
            contract_info: buildContractInfoPayload({ tax_code: effectiveTaxCode }),
        };

        setSubmitting(true);
        try {
            const result = await saveEkycContractStep(payload);
            if (!result.ok) {
                openSnackbar({ type: "error", text: result.message, duration: 4000 });
                return;
            }
            openSnackbar({ type: "success", text: "Đã lưu mã số thuế.", duration: 3000 });
            await loadData(true);
        } finally {
            setSubmitting(false);
        }
    }, [buildContractInfoPayload, contractInfo, effectiveTaxCode, loadData, openSnackbar, resourceId, stepStatus.tax, taxValid]);

    const handleSignContract = useCallback(async () => {
        if (stepStatus.contract || currentStepOnServer >= 4 || isAllowedCompleteStatus(contractInfo?.contract_status)) {
            if (showLinkAccountStep && !isLinkedAccount) {
                setView("link-account");
                setLinkStepSuccess(false);
            } else {
                setView("complete");
            }
            return;
        }

        const resource = getResourceId(contractInfo, resourceId);
        if (!resource) {
            openSnackbar({ type: "error", text: "Thiếu resource_id của hợp đồng.", duration: 3000 });
            return;
        }

        const payload = {
            step: 4,
            is_ekyc: true,
            resource_id: resource,
            contract_info: buildContractInfoPayload(),
        };

        setSubmitting(true);
        try {
            const result = await saveEkycContractStep(payload);
            if (!result.ok) {
                openSnackbar({ type: "error", text: result.message, duration: 4000 });
                return;
            }
            openSnackbar({ type: "success", text: "Đã gửi ký hợp đồng điện tử.", duration: 3000 });
            await loadData(true);
            if (showLinkAccountStep && !isLinkedAccount) {
                setView("link-account");
                setLinkStepSuccess(false);
            }
        } finally {
            setSubmitting(false);
        }
    }, [buildContractInfoPayload, contractInfo, currentStepOnServer, isLinkedAccount, loadData, openSnackbar, resourceId, showLinkAccountStep, stepStatus.contract]);

    const handleStartResign = useCallback(() => {
        if (!resignConfig) return;
        setResignFlowStarted(true);
        setView(getRestartView(resignConfig.restartStep));
    }, [resignConfig]);

    const closeLinkModal = useCallback(() => {
        setLinkModal((prev) => ({ ...prev, visible: false, loading: false }));
    }, []);

    const handleConfirmLinkPhone = useCallback(
        async (syncPhone: boolean) => {
            setLinkModal((prev) => ({ ...prev, loading: true }));
            try {
                const result = await confirmLinkScalefPhone({
                    new_phone: linkModal.newScalefPhone,
                    sync_phone: syncPhone,
                });
                if (!result.ok) {
                    openSnackbar({ type: "error", text: result.message, duration: 4000 });
                    return;
                }
                openSnackbar({ type: "success", text: result.message || "Liên kết tài khoản thành công.", duration: 3000 });
                closeLinkModal();
                setIsLinkedAccount(true);
                setLinkStepSuccess(true);
                await loadData(false);
            } finally {
                setLinkModal((prev) => ({ ...prev, loading: false }));
            }
        },
        [closeLinkModal, linkModal.newScalefPhone, loadData, openSnackbar]
    );

    const handleLinkAccount = useCallback(async () => {
        setSubmitting(true);
        try {
            const result = await linkScalefAccount();
            if (result.ok) {
                openSnackbar({ type: "success", text: result.message || "Liên kết tài khoản thành công.", duration: 3000 });
                setIsLinkedAccount(true);
                setLinkStepSuccess(true);
                await loadData(false);
                return;
            }

            if (result.code === "CONFIRM_REQUIRED") {
                const data = asRecord(result.data);
                setLinkModal({
                    visible: true,
                    step: "review-phonenumber",
                    currentCorePhone: textOf(data?.current_core_phone),
                    newScalefPhone: textOf(data?.new_scalef_phone),
                    loading: false,
                });
                return;
            }

            if (result.code === "ACCOUNT_CONFLICT" || result.code === "PHONE_DUPLICATE_KYC_DIFFERENT_EMAIL") {
                setLinkModal({
                    visible: true,
                    step: "not-match",
                    currentCorePhone: "",
                    newScalefPhone: "",
                    loading: false,
                });
                return;
            }

            openSnackbar({ type: "error", text: result.message, duration: 4000 });
        } finally {
            setSubmitting(false);
        }
    }, [loadData, openSnackbar]);

    const handleBack = useCallback(() => {
        switch (view) {
            case "ekyc":
                setView("payment");
                break;
            case "tax":
                setView("ekyc");
                break;
            case "contract":
                if (needsResign(contractInfo?.contract_status) && !resignFlowStarted) return;
                setView("tax");
                break;
            case "link-account":
                if (linkStepSuccess || isLinkedAccount) {
                    setLinkStepSuccess(false);
                    setView("contract");
                }
                break;
            case "complete":
                if (showLinkAccountStep) {
                    setView("link-account");
                    setLinkStepSuccess(true);
                } else {
                    setView("contract");
                }
                break;
            default:
                break;
        }
    }, [contractInfo?.contract_status, isLinkedAccount, linkStepSuccess, resignFlowStarted, showLinkAccountStep, view]);

    const renderProgress = () => {
        const dots = [1, 2, 3, 4, 5];
        return (
            <div className="ec-progress-card">
                <div className="ec-progress-track ec-progress-track--row" aria-label="Tiến trình hợp đồng">
                    {dots.map((dot) => {
                        const isActive = visualStep === dot;
                        const isDone = visualStep > dot;
                        return (
                            <React.Fragment key={dot}>
                                <div
                                    className={[
                                        "ec-progress-dot",
                                        isDone ? "is-done" : "",
                                        isActive ? "is-active" : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                >
                                    {isDone ? <Icon icon="zi-check" size={14} style={{ color: "#fff" }} /> : <span>{dot}</span>}
                                </div>
                                {dot < dots.length ? <span className="ec-progress-line" aria-hidden /> : null}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderPageIntro = () => (
        <div className="ec-page-intro">
            <Text.Title className="ec-page-intro__title">Ký hợp đồng điện tử</Text.Title>
            <Text size="small" className="ec-page-intro__desc">
                Bạn cần ký hợp đồng điện tử để thỏa mãn yêu cầu thanh toán.
            </Text>
            {renderProgress()}
        </div>
    );

    const renderPaymentStep = () => {
        if (loading) {
            return (
                <div className="ec-card ec-card--state">
                    <div className="shimmer" style={{ height: 180, borderRadius: 12 }} />
                </div>
            );
        }
        return (
            <div className="ec-card ec-contract-card">
                <div className="ec-payment-section">
                    <div className="ec-field-stack">
                        <Text size="small" bold className="ec-form-label">Số điện thoại nhập OTP</Text>
                        <Text size="small" className="ec-form-note ec-form-note--danger">
                            *Dùng để xác nhận thông tin và ký hợp đồng điện tử. Vui lòng kiểm tra thật chính xác.
                        </Text>
                        <Input value={form.phone || ""} placeholder="Nhập số điện thoại" readOnly disabled />
                    </div>

                    <div className="ec-field-stack">
                        <Text size="small" bold className="ec-form-label">Email</Text>
                        <Text size="small" className="ec-form-note ec-form-note--danger">
                            *Dùng để xác nhận thông tin và ký hợp đồng điện tử. Vui lòng kiểm tra thật chính xác.
                        </Text>
                        <Input value={form.email || ""} placeholder="Nhập email của bạn" readOnly disabled />
                    </div>

                    <div className="ec-field-stack">
                        <Text size="small" bold className="ec-form-label">Thẻ ngân hàng</Text>
                        <div className="ec-bank-mini-card">
                            <div className="ec-bank-mini-card__head">
                                <span className="ec-bank-mini-card__bank">{form.bank_name || "—"}</span>
                                <span className="ec-bank-mini-card__owner">{form.account_name || "—"}</span>
                            </div>
                            <div className="ec-bank-mini-card__number">
                                Số tài khoản: {form.account_number ? `******${form.account_number.slice(-4)}` : "—"}
                            </div>
                            <div className="ec-bank-mini-card__status-row">
                                {bankVerificationStatus ? (
                                    <>
                                        <span className={`ec-mini-status ec-mini-status--${bankVerificationStatus.tone}`}>
                                            {bankVerificationStatus.label}
                                        </span>
                                        {bankVerificationStatus.retry ? (
                                            <Button size="small" className="ec-mini-status__retry" onClick={openPaymentEditor}>
                                                Thử lại
                                            </Button>
                                        ) : null}
                                    </>
                                ) : (
                                    <Button className="ec-bank-add-btn" onClick={openPaymentEditor}>
                                        + Thêm tài khoản ngân hàng
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="ec-security-note">
                        <Icon icon="zi-shield-solid" size={18} />
                        <span>Thông tin của bạn được hoàn toàn bảo mật, chúng tôi không chia sẻ với bên thứ 3.</span>
                    </div>
                </div>

                <div className="ec-actions-bottom">
                    <Button
                        className="ec-btn-primary"
                        disabled={!bankVerificationStatus}
                        loading={paymentSaving}
                        onClick={() => void handleSavePaymentStep()}
                    >
                        Tiếp tục
                    </Button>
                </div>
            </div>
        );
    };

    const renderEkycStep = () => {
        return (
            <div className="ec-card ec-contract-card">
                <div className="ec-iframe-placeholder">
                    <div className="ec-iframe-placeholder__inner">FPT E-Contract</div>
                </div>
                <div className="ec-actions-row">
                    <Button variant="secondary" className="ec-btn-gray" onClick={handleBack}>
                        Quay lại
                    </Button>
                    <Button className="ec-btn-primary" onClick={() => setView("tax")}>
                        Tiếp tục
                    </Button>
                </div>
            </div>
        );
    };

    const renderTaxStep = () => (
        <div className="ec-card ec-contract-card">
            <div className="ec-tax-panel">
                <Text bold className="ec-section-title">Mã số thuế cá nhân</Text>
                <Text size="small" className="ec-muted">
                    Xác nhận thông tin mã số thuế để hoàn tất quy trình.
                </Text>
                <div className="ec-field-stack">
                    <Text size="small" bold className="ec-form-label">
                        Mã số thuế <span className="ec-required">*</span>
                    </Text>
                    <Input
                        value={effectiveTaxCode}
                        disabled={taxReadonly}
                        readOnly={taxReadonly}
                        onChange={(event) => setTaxCode(event.target.value)}
                    />
                    <Text size="xSmall" className="ec-form-note">
                        Mã số thuế cá nhân thường có 10-15 chữ số
                    </Text>
                </div>
            </div>

            <div className="ec-actions-row">
                <Button variant="secondary" className="ec-btn-gray" onClick={handleBack}>
                    Quay lại
                </Button>
                <Button className="ec-btn-primary" loading={submitting} disabled={!taxValid} onClick={() => void handleSaveTaxStep()}>
                    Xác nhận
                </Button>
            </div>
        </div>
    );

    const renderContractStep = () => (
        <div className="ec-card ec-contract-card">
            {needsResign(contractInfo?.contract_status) && resignConfig ? (
                <div className="ec-warning-banner">
                    <div className="ec-warning-banner__title">Cần kí lại hợp đồng</div>
                    <div className="ec-warning-banner__text">{resignConfig.description}</div>
                    {contractInfo?.error_message ? (
                        <div className="ec-warning-banner__text">{textOf(contractInfo.error_message)}</div>
                    ) : null}
                </div>
            ) : null}

            <div className="ec-block ec-block--accent">
                <div className="ec-block-title">
                    <Text bold style={{ color: "#111827" }}>
                        Thông tin hợp đồng
                    </Text>
                </div>
                <div className="ec-grid ec-grid--2">
                    <FieldRo label="Số hợp đồng" value={contractNo(contractInfo)} />
                    <FieldRo label="Trạng thái hợp đồng" value={mapContractStatus(contractInfo?.contract_status) || "Chờ ký"} />
                </div>
            </div>

            <div className="ec-block ec-block--accent">
                <div className="ec-block-title">
                    <Text bold style={{ color: "#111827" }}>
                        Thông tin cá nhân
                    </Text>
                </div>
                <div className="ec-grid ec-grid--3">
                    <FieldRo label="Họ và tên" value={textOf(getProfile(contractInfo).full_name) || form.name} />
                    <FieldRo label="Mã số thuế" value={effectiveTaxCode || "—"} />
                    <FieldRo label="Ngày sinh" value={formatContractDate(textOf(getProfile(contractInfo).dob) || form.date_of_birth) || "—"} />
                    <FieldRo label="Số CCCD" value={textOf(getProfile(contractInfo).id_number) || form.identity_card || "—"} />
                    <FieldRo label="Nơi cấp CCCD" value={textOf(getProfile(contractInfo).id_issue_place) || form.issue_place || "—"} />
                    <FieldRo label="Ngày cấp CCCD" value={formatContractDate(textOf(getProfile(contractInfo).id_issue_date) || form.issue_date) || "—"} />
                    <FieldRo label="Tài khoản nhận thanh toán" value={form.account_name || "—"} />
                    <FieldRo label="Số tài khoản" value={form.account_number || "—"} />
                    <FieldRo label="Ngân hàng" value={form.bank_name || "—"} />
                    <FieldRo label="Chi nhánh ngân hàng" value={form.bank_branch || "—"} />
                    <FieldRo label="Số điện thoại" value={textOf(getProfile(contractInfo).phone) || form.phone || "—"} />
                    <FieldRo label="Email" value={textOf(getProfile(contractInfo).email) || form.email || "—"} />
                    <FieldRo label="Địa chỉ thường trú" value={textOf(getProfile(contractInfo).address) || form.permanent_address || "—"} />
                </div>
            </div>

            <div className="ec-actions-row">
                <Button variant="secondary" className="ec-btn-gray" onClick={handleBack}>
                    Quay lại
                </Button>
                {needsResign(contractInfo?.contract_status) && resignConfig && !resignFlowStarted ? (
                    <Button className="ec-btn-primary" onClick={handleStartResign}>
                        Kí lại hợp đồng
                    </Button>
                ) : contractInfo?.contract_status !== "WAITING_TO_SIGN" ? (
                    <Button className="ec-btn-primary" loading={submitting} onClick={() => void handleSignContract()}>
                        Xác nhận
                    </Button>
                ) : null}
            </div>
        </div>
    );

    const renderLinkAccountStep = () => {
        if (linkStepSuccess || isLinkedAccount) {
            return (
                <div className="ec-card ec-contract-card ec-card--center">
                    <div className="ec-success-panel">
                        <div className="ec-success-panel__icon">
                            <Icon icon="zi-check" size={20} style={{ color: "#52c26d" }} />
                        </div>
                        <div className="ec-success-panel__title">Liên kết tài khoản thành công</div>
                        <div className="ec-success-panel__desc">Bạn sẽ nhận được thanh toán ngay sau khi hợp đồng được duyệt</div>
                        <Button
                            className="ec-btn-primary"
                            onClick={() => {
                                setView("complete");
                                setLinkStepSuccess(true);
                            }}
                        >
                            Hoàn tất
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <div className="ec-card ec-contract-card ec-card--center">
                <div className="ec-link-request">
                    <div className="ec-link-request__icon">
                        <Icon icon="zi-link" size={20} style={{ color: "#f59e0b" }} />
                    </div>
                    <div className="ec-link-request__title">Yêu cầu liên kết tài khoản</div>
                    <div className="ec-link-request__desc">Hợp đồng của bạn đã được chuyển sang trạng thái</div>
                    <span className="ec-link-request__badge">CHỜ DUYỆT</span>
                    <div className="ec-link-request__alert">
                        <div className="ec-link-request__alert-text">
                            Để nhận thanh toán, bạn "bắt buộc" phải liên kết với hệ thống đối tác
                        </div>
                        <Button className="ec-btn-primary" loading={submitting} onClick={() => void handleLinkAccount()}>
                            Liên kết ngay
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderOverviewTable = () => (
        <div className="ec-overview-card">
            <Text.Title className="ec-table-title">Danh sách hợp đồng đã ký</Text.Title>
            {listLoading ? (
                <div className="shimmer" style={{ height: 88, borderRadius: 12 }} />
            ) : contractInfo ? (
                <div className="ec-table-shell">
                    <table className="ec-table">
                        <thead>
                            <tr>
                                <th>Tài liệu</th>
                                <th>Ngày kí hợp đồng</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                                <th>Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>{contractInfo.contract_code || contractNo(contractInfo)}</td>
                                <td>{formatDateTime(textOf(contractInfo.sign_date))}</td>
                                <td>
                                    <span className={`ec-status-badge ${getStatusClass(contractInfo.contract_status)}`}>
                                        {mapContractStatus(contractInfo.contract_status)}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        className="ec-doc-btn"
                                        disabled={!textOf(contractInfo.link)}
                                        onClick={() => textOf(contractInfo.link) && openExternalUrl(textOf(contractInfo.link))}
                                        aria-label="Mở hợp đồng"
                                    >
                                        <Icon icon="zi-file" size={18} />
                                    </button>
                                </td>
                                <td>
                                    {String(
                                        contractInfo.contract_status === "CANCELLED" || contractInfo.contract_status === "cancelled"
                                            ? "Số điện thoại liên kết không hợp lệ."
                                            : "—"
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : (
                <Text size="small" className="ec-muted">
                    Chưa có dữ liệu hợp đồng từ máy chủ.
                </Text>
            )}
            <div className="ec-actions-center">
                <Button variant="secondary" className="ec-btn-gray" onClick={handleBack}>
                    Quay lại
                </Button>
            </div>
        </div>
    );

    const renderCompleteStep = () => {
        if (showOverview) {
            return (
                <div className="ec-card ec-card--wide">
                    {showLinkAccountStep && isLinkedAccount ? (
                        <>
                            <div className="ec-ready-hero">
                                <div className="ec-icon-circle ec-icon-circle--success-outline">
                                    <Icon icon="zi-check-circle" size={28} style={{ color: "#4caf50" }} />
                                </div>
                                <Text.Title className="ec-title-center">Tất cả đã sẵn sàng</Text.Title>
                                <Text size="small" className="ec-sub-center">
                                    Bạn sẽ nhận được thanh toán <strong>sau khi hợp đồng được duyệt</strong>
                                </Text>
                                <Button className="ec-btn-primary" onClick={() => navigate("/")}>
                                    Quay về trang chủ
                                </Button>
                            </div>
                            <div className="ec-divider" />
                        </>
                    ) : null}
                    {renderOverviewTable()}
                </div>
            );
        }

        return (
            <div className="ec-card ec-contract-card ec-card--center">
                <div className="ec-success-panel">
                    <div className="ec-success-panel__icon">
                        <Icon icon="zi-check" size={20} style={{ color: "#52c26d" }} />
                    </div>
                    <div className="ec-success-panel__title">Liên kết tài khoản thành công</div>
                    <div className="ec-success-panel__desc">Bạn sẽ nhận được thanh toán ngay sau khi hợp đồng được duyệt</div>
                    <Button className="ec-btn-primary" onClick={() => navigate("/")}>
                        Hoàn tất
                    </Button>
                </div>
            </div>
        );
    };

    const renderBody = () => {
        switch (view) {
            case "payment":
                return renderPaymentStep();
            case "ekyc":
                return renderEkycStep();
            case "tax":
                return renderTaxStep();
            case "contract":
                return renderContractStep();
            case "link-account":
                return renderLinkAccountStep();
            case "complete":
            default:
                return renderCompleteStep();
        }
    };

    return (
        <div>
            <div className="ec-page-header">
                <button type="button" className="ec-page-header__back" onClick={() => navigate(-1)} aria-label="Quay lại">
                    <Icon icon="zi-arrow-left" size={22} />
                </button>
                <Text.Title size="normal" className="ec-page-header__title">
                    Hợp đồng điện tử
                </Text.Title>
                <div className="ec-page-header__spacer" aria-hidden />
            </div>
            <Box className="ec-flow-root">
                {renderPageIntro()}
                {renderBody()}
            </Box>

            <Modal
                visible={paymentModalVisible}
                title="Thông tin tài khoản"
                onClose={() => setPaymentModalVisible(false)}
                width="92%"
                maskClosable={!paymentEditing}
                className="ec-modal"
            >
                <div className="ec-modal-body">
                    <div className="ec-field-stack">
                        <Select
                            label="Ngân hàng"
                            placeholder="Chọn ngân hàng"
                            value={paymentDraft.bank_code}
                            closeOnSelect
                            onChange={(value) => {
                                const bankCode = String(Array.isArray(value) ? value[0] : value || "");
                                const bank = bankOptions.find((item) => item.bank_code === bankCode);
                                setPaymentDraft((prev) => ({
                                    ...prev,
                                    bank_code: bankCode,
                                    bank_name: bank?.bank_name_vi || "",
                                    swift_code: bank?.swift_code || "",
                                    bank_id: textOf(bank?.id),
                                }));
                            }}
                        >
                            {bankOptions.map((bank) => (
                                <Select.Option key={bank.bank_code} value={bank.bank_code} title={bank.display_name || bank.bank_name_vi}>
                                    {bank.display_name || bank.bank_name_vi}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>
                    <div className="ec-field-stack">
                        <Text size="small" bold>
                            Tên chủ tài khoản
                        </Text>
                        <Input
                            value={paymentDraft.account_name}
                            onChange={(event) => setPaymentDraft((prev) => ({ ...prev, account_name: event.target.value }))}
                        />
                    </div>
                    <div className="ec-field-stack">
                        <Text size="small" bold>
                            Số tài khoản
                        </Text>
                        <Input
                            value={paymentDraft.account_number}
                            onChange={(event) => setPaymentDraft((prev) => ({ ...prev, account_number: event.target.value }))}
                        />
                    </div>
                    <div className="ec-field-stack">
                        <Text size="small" bold>
                            Chi nhánh ngân hàng
                        </Text>
                        <Input
                            value={paymentDraft.bank_branch}
                            onChange={(event) => setPaymentDraft((prev) => ({ ...prev, bank_branch: event.target.value }))}
                        />
                    </div>
                    <div className="ec-modal-actions">
                        <Button variant="secondary" fullWidth onClick={() => setPaymentModalVisible(false)}>
                            Hủy
                        </Button>
                        <Button fullWidth className="ec-btn-primary" loading={paymentEditing} onClick={() => void handleVerifyPayment()}>
                            Lưu thông tin
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                visible={linkModal.visible}
                title=""
                onClose={closeLinkModal}
                width="92%"
                maskClosable={!linkModal.loading}
                className="ec-modal"
            >
                {linkModal.step === "review-phonenumber" ? (
                    <div className="ec-link-modal">
                        <div className="ec-link-modal__hero ec-link-modal__hero--primary">
                            <Icon icon="zi-refresh" size={26} style={{ color: "#fff" }} />
                            <Text.Title size="small" style={{ color: "#fff" }}>
                                Đồng bộ số điện thoại
                            </Text.Title>
                        </div>
                        <Text size="small" className="ec-link-modal__text">
                            Số điện thoại đối tác hiện tại:
                        </Text>
                        <div className="ec-link-modal__info">
                            <div>
                                <span>Tài khoản đối tác:</span>
                                <strong>{linkModal.currentCorePhone || "—"}</strong>
                            </div>
                            <div>
                                <span>Số điện thoại hiện tại:</span>
                                <strong className="ec-link-modal__highlight">{linkModal.newScalefPhone || "—"}</strong>
                            </div>
                        </div>
                        <Text size="small" className="ec-link-modal__text">
                            Bạn có muốn cập nhật số điện thoại sang <strong>{linkModal.newScalefPhone || "—"}</strong> trước khi liên kết không?
                        </Text>
                        <div className="ec-modal-actions">
                            <Button
                                variant="secondary"
                                fullWidth
                                onClick={() => setLinkModal((prev) => ({ ...prev, step: "confirm-not-change" }))}
                            >
                                Bỏ qua
                            </Button>
                            <Button fullWidth className="ec-btn-primary" loading={linkModal.loading} onClick={() => void handleConfirmLinkPhone(true)}>
                                Cập nhật
                            </Button>
                        </div>
                    </div>
                ) : null}

                {linkModal.step === "confirm-not-change" ? (
                    <div className="ec-link-modal">
                        <div className="ec-link-modal__hero ec-link-modal__hero--warning">
                            <Icon icon="zi-warning" size={26} style={{ color: "#f59e0b" }} />
                            <Text.Title size="small">Xác nhận không thay đổi</Text.Title>
                        </div>
                        <Text size="small" className="ec-link-modal__text">
                            Hệ thống sẽ giữ số điện thoại đối tác hiện tại là <strong>{linkModal.currentCorePhone || "—"}</strong>.
                        </Text>
                        <div className="ec-link-modal__danger">
                            Việc không đồng bộ số điện thoại có thể khiến quá trình liên kết thất bại về sau.
                        </div>
                        <div className="ec-actions-col">
                            <Button className="ec-btn-primary" loading={linkModal.loading} onClick={() => void handleConfirmLinkPhone(false)}>
                                Xác nhận liên kết
                            </Button>
                            <Button variant="secondary" onClick={() => setLinkModal((prev) => ({ ...prev, step: "review-phonenumber" }))}>
                                Quay lại
                            </Button>
                        </div>
                    </div>
                ) : null}

                {linkModal.step === "not-match" ? (
                    <div className="ec-mismatch-modal">
                        <button type="button" className="ec-mismatch-modal__close" onClick={closeLinkModal} aria-label="Đóng">
                            <Icon icon="zi-close" size={18} />
                        </button>
                        <div className="ec-mismatch-modal__icon">
                            <Icon icon="zi-warning" size={20} style={{ color: "#f59e0b" }} />
                        </div>
                        <div className="ec-mismatch-modal__title">Tài khoản không trùng khớp</div>
                        <div className="ec-mismatch-modal__desc">
                            Thông tin tài khoản của bạn không trùng khớp với hệ thống đối tác.
                        </div>
                        <div className="ec-actions-col">
                            <Button className="ec-btn-primary" onClick={() => navigate("/login?redirect=/e-contract")}>
                                Đăng nhập ACCESSTRADE
                            </Button>
                            <Button variant="secondary" className="ec-mismatch-modal__help" onClick={closeLinkModal}>
                                Trợ giúp
                            </Button>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
};

interface FieldRoProps {
    label: string;
    value: string;
}

const FieldRo: React.FC<FieldRoProps> = ({ label, value }) => (
    <div className="ec-field-ro">
        <Text size="xSmall" className="ec-muted">
            {label}
        </Text>
        <Input disabled readOnly value={value} />
    </div>
);
