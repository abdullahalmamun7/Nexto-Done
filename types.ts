
export interface Message {
  role: 'user' | 'model';
  content: string;
  image?: string;
}
