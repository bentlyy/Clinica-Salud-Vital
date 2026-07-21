export interface TwoFAStatus {
  enabled: boolean;
}

export interface TwoFAGenerateResponse {
  qr_code: string;
  secret: string;
}
