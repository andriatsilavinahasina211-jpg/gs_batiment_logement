export type Role = "AGENT" | "CHEF_SRB" | "ADMINISTRATEUR";
export type AuthProvider = "EMAIL" | "GOOGLE";

export interface User {
  id: number;
  matricule?: string | null;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  isActive: boolean;
  provider: AuthProvider;
  avatar?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserFormData {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  isActive: boolean;
  provider: AuthProvider;
  password: string;
}