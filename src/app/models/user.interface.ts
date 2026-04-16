export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
}

export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER'
}