import { OccupationStatus } from "@prisma/client";

export class Occupation {
  numeroOccupation?: string;
  dateEntree!: Date;
  dateSortiePrevue?: Date;
  dateSortieReelle?: Date;
  bienNumero!: string;
  demandeurId!: number;
  etatDesLieuxEntree?: any;
  etatDesLieuxSortie?: any;
  statut!: OccupationStatus;
  motifLiberation?: string;
  clesRestituees!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}