export type { PageState, Trend, Maybe } from "./common";
export type { ApiResponse, PaginatedResponse, PaginatedRequest, ApiError } from "./api";
export type { Patient, PatientFormData, PatientStatus } from "./patient";
export type {
  Appointment,
  NewAppointmentFormData,
  AppointmentStatus,
  DayCell,
} from "./appointment";
export type { Service, ServiceFormData, ServiceCategory } from "./service";
export type { WarehouseItem } from "./warehouse";
export type { Transaction, DailyRevenue, AccountingStat, TransactionStatus } from "./accounting";
export type {
  KpiStat,
  MonthlyRevenue,
  AppointmentStat,
  PatientVisit,
  ServiceCategoryStat,
} from "./analytics";
export type { ClinicUser, DayHours, UserRole } from "./settings";
export type {
  DashboardStat,
  AppointmentStatusConfig,
  PatientStatusConfig,
  AppointmentStatusVariant,
  PatientStatusVariant,
} from "./dashboard";
export type { LoginState } from "./auth";
export type { SidebarItem, SidebarSection, SidebarItemGroup } from "./sidebar";
export type { ToastInput, ToastType, ToastContextValue } from "./toast";
