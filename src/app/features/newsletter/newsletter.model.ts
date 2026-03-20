export interface NewsletterResult {
  status: 'success' | 'duplicate' | 'error';
  message: string;
}
