export interface DepartmentViewModel {
  id: number;
  name: string | null;
  isActive: boolean;
}

export interface CreateDepartmentDTO {
  name: string;
  isActive?: boolean;
}

export interface UpdateDepartmentDTO {
  name?: string | null;
  isActive?: boolean | null;
}

export interface DepartmentViewModelApiResponse {
  data: DepartmentViewModel;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}

export interface DepartmentViewModelIEnumerableApiResponse {
  data: DepartmentViewModel[] | null;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}
