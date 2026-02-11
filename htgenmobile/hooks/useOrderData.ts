import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { barcodeService, BarcodeResponse } from '@/services/barcodeService';
import { customerService, CustomerResponse } from '@/services/customerService';
import { doctorService, DoctorResponse } from '@/services/doctorService';
import {
  hospitalStaffService,
  HospitalStaffResponse,
} from '@/services/hospitalStaffService';
import { orderService, OrderResponse } from '@/services/orderService';

interface UseOrderDataResult {
  customers: CustomerResponse[];
  doctors: DoctorResponse[];
  staffs: HospitalStaffResponse[];
  barcodes: BarcodeResponse[];
  barcodeOptions: { value: string; label: string; raw: BarcodeResponse }[];
  isLoading: boolean;
}

/**
 * Hook for fetching all data needed for order forms
 * Returns customers, doctors, staffs, barcodes, and computed barcode options
 */
export function useOrderData(): UseOrderDataResult {
  const { data: customersResponse } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getAll(),
    retry: false,
  });

  const { data: doctorsResponse } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorService.getAll(),
    retry: false,
  });

  const { data: staffResponse } = useQuery({
    queryKey: ['hospital-staffs'],
    queryFn: () => hospitalStaffService.getAll(),
    retry: false,
  });

  const { data: barcodesResponse } = useQuery({
    queryKey: ['barcodes'],
    queryFn: () => barcodeService.getAll(),
    retry: false,
  });

  const { data: ordersResponse } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getAll(),
    retry: false,
  });

  const customers = (customersResponse as any)?.success
    ? ((customersResponse as any).data as CustomerResponse[]) ?? []
    : [];

  const doctors = (doctorsResponse as any)?.success
    ? ((doctorsResponse as any).data as DoctorResponse[]) ?? []
    : [];

  const staffs = (staffResponse as any)?.success
    ? ((staffResponse as any).data as HospitalStaffResponse[]) ?? []
    : [];

  const barcodes = (barcodesResponse as any)?.success
    ? ((barcodesResponse as any).data as BarcodeResponse[]) ?? []
    : [];

  // Compute barcode options (excluding already used ones)
  const barcodeOptions = useMemo(() => {
    const used = new Set<string>();

    if ((ordersResponse as any)?.success && (ordersResponse as any).data) {
      const orders = (ordersResponse as any).data as OrderResponse[];
      orders.forEach((o) => {
        if (o.barcodeId != null && o.barcodeId.trim()) {
          used.add(String(o.barcodeId).trim());
        }
      });
    }

    const normalized = (barcodes as BarcodeResponse[])
      .map((b) => {
        const barcodeString = b?.barcode?.trim() || '';
        if (!barcodeString) return null;

        return {
          value: barcodeString,
          label: barcodeString,
          raw: b,
        };
      })
      .filter(
        (x): x is { value: string; label: string; raw: BarcodeResponse } => x !== null,
      )
      .filter((x) => !used.has(x.value));

    return normalized;
  }, [barcodes, ordersResponse]);

  const isLoading =
    !customersResponse || !doctorsResponse || !staffResponse || !barcodesResponse;

  return {
    customers,
    doctors,
    staffs,
    barcodes,
    barcodeOptions,
    isLoading,
  };
}
