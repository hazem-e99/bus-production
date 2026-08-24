export interface PreferredAreaViewModel {
  id: number;
  name: string | null;
  isActive: boolean;
}

export interface CreatePreferredAreaDTO {
  name: string;
  isActive?: boolean;
}

export interface UpdatePreferredAreaDTO {
  name?: string | null;
  isActive?: boolean | null;
}

export interface PreferredAreaViewModelApiResponse {
  data: PreferredAreaViewModel;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}

export interface PreferredAreaViewModelIEnumerableApiResponse {
  data: PreferredAreaViewModel[] | null;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}
