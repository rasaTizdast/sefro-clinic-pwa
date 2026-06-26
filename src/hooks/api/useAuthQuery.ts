import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { useToast } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { queryKeys } from "../../lib/query-keys";
import * as authService from "../../services/auth";

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authService.getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEmployees() {
  return useQuery({
    queryKey: queryKeys.auth.employees,
    queryFn: authService.listEmployees,
    retry: false,
  });
}

export function useLogin() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      login(username, password),
    onSuccess: () => {
      toast.success("ورود موفق", "به پنل مدیریت خوش آمدید.");
      navigate("/");
    },
    onError: () => {
      toast.error("خطا در ورود", "نام کاربری یا رمز عبور نادرست است.");
    },
  });
}

export function useLogout() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      navigate("/auth");
    },
    onError: () => {
      toast.error("خطا", "مشکلی در خروج پیش آمد.");
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: { username: string; password: string }) =>
      authService.createEmployee(data as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.employees });
      toast.success("کاربر جدید با موفقیت افزوده شد.");
    },
    onError: () => {
      toast.error("خطا در افزودن کاربر");
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      authService.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.employees });
      toast.success("اطلاعات کاربر به‌روزرسانی شد.");
    },
    onError: () => {
      toast.error("خطا در به‌روزرسانی کاربر");
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => authService.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.employees });
      toast.success("کاربر حذف شد.");
    },
    onError: () => {
      toast.error("خطا در حذف کاربر");
    },
  });
}
