export interface YearOfStudyViewModel {
  id: number;
  name: string | null;
  isActive: boolean;
}

export interface CreateYearOfStudyDTO {
  name: string;
  isActive?: boolean;
}

export interface UpdateYearOfStudyDTO {
  name?: string | null;
  isActive?: boolean | null;
}

export interface YearOfStudyViewModelApiResponse {
  data: YearOfStudyViewModel;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}

export interface YearOfStudyViewModelIEnumerableApiResponse {
  data: YearOfStudyViewModel[] | null;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}
