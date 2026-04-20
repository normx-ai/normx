import React from 'react';
import { BalanceLigne } from '../types';
import {
  ISVerifLigne, TVACollecteeLigne, TVADeductibleLigne,
  AutresImpotsLigne, DettesFiscalesLigne, RedressementLigne,
} from './revisionTypes';
import { Controle1IS } from './etat/Controle1IS';
import { Controle2TvaCollectee } from './etat/Controle2TvaCollectee';
import { Controle3TvaDeductible } from './etat/Controle3TvaDeductible';
import { Controle4SoldeTva } from './etat/Controle4SoldeTva';
import { Controle5AutresImpots } from './etat/Controle5AutresImpots';
import { Controle6Dettes } from './etat/Controle6Dettes';
import { Controle7Redressements } from './etat/Controle7Redressements';

interface RevisionEtatTableProps {
  isLignes: ISVerifLigne[];
  tauxIS: number;
  onAddIsLigne: () => void;
  onUpdateIsLigne: (id: number, field: keyof ISVerifLigne, value: string | number) => void;
  onRemoveIsLigne: (id: number) => void;
  onSetTauxIS: (v: number) => void;
  resultatFiscal: number;
  isTheorique: number;
  isComptabilise: number;
  ecartIS: number;
  total891Balance: number;
  total441Balance: number;
  comptes89: BalanceLigne[];
  soldeDebit: (lignes: BalanceLigne[]) => number;
  tvaCollecteeLignes: TVACollecteeLigne[];
  onAddTvaCollectee: () => void;
  onUpdateTvaCollectee: (id: number, field: keyof TVACollecteeLigne, value: string | number) => void;
  onRemoveTvaCollectee: (id: number) => void;
  totalTvaCalculee: number;
  totalTvaDeclareeCollectee: number;
  ecartTvaCollectee: number;
  total4431Balance: number;
  tvaDeductibleLignes: TVADeductibleLigne[];
  onAddTvaDeductible: () => void;
  onUpdateTvaDeductible: (id: number, field: keyof TVADeductibleLigne, value: string | number) => void;
  onRemoveTvaDeductible: (id: number) => void;
  totalTvaDeclareeDeductible: number;
  totalTvaBalanceDeductible: number;
  ecartTvaDeductible: number;
  tvaDueTheorique: number;
  tvaDueBalance: number;
  creditTvaBalance: number;
  soldeTvaTheorique: number;
  creditTvaTheorique: number;
  ecartTvaDue: number;
  ecartCreditTva: number;
  total445Balance: number;
  autresImpotsLignes: AutresImpotsLigne[];
  onAddAutresImpots: () => void;
  onUpdateAutresImpots: (id: number, field: keyof AutresImpotsLigne, value: string | number) => void;
  onRemoveAutresImpots: (id: number) => void;
  dettesFiscalesLignes: DettesFiscalesLigne[];
  onAddDettesFiscales: () => void;
  onUpdateDettesFiscales: (id: number, field: keyof DettesFiscalesLigne, value: string | number) => void;
  onRemoveDettesFiscales: (id: number) => void;
  totalDettesDeclare: number;
  totalDettesBalance: number;
  totalDettesEcart: number;
  redressementLignes: RedressementLigne[];
  onAddRedressement: () => void;
  onUpdateRedressement: (id: number, field: keyof RedressementLigne, value: string | number) => void;
  onRemoveRedressement: (id: number) => void;
  onMarkUnsaved: () => void;
}

function RevisionEtatTable(p: RevisionEtatTableProps): React.ReactElement {
  return (
    <>
      <Controle1IS
        isLignes={p.isLignes}
        tauxIS={p.tauxIS}
        onAddIsLigne={p.onAddIsLigne}
        onUpdateIsLigne={p.onUpdateIsLigne}
        onRemoveIsLigne={p.onRemoveIsLigne}
        onSetTauxIS={p.onSetTauxIS}
        onMarkUnsaved={p.onMarkUnsaved}
        resultatFiscal={p.resultatFiscal}
        isTheorique={p.isTheorique}
        isComptabilise={p.isComptabilise}
        ecartIS={p.ecartIS}
        total891Balance={p.total891Balance}
        total441Balance={p.total441Balance}
        comptes89={p.comptes89}
        soldeDebit={p.soldeDebit}
      />
      <Controle2TvaCollectee
        tvaCollecteeLignes={p.tvaCollecteeLignes}
        onAddTvaCollectee={p.onAddTvaCollectee}
        onUpdateTvaCollectee={p.onUpdateTvaCollectee}
        onRemoveTvaCollectee={p.onRemoveTvaCollectee}
        totalTvaCalculee={p.totalTvaCalculee}
        totalTvaDeclareeCollectee={p.totalTvaDeclareeCollectee}
        ecartTvaCollectee={p.ecartTvaCollectee}
        total4431Balance={p.total4431Balance}
      />
      <Controle3TvaDeductible
        tvaDeductibleLignes={p.tvaDeductibleLignes}
        onAddTvaDeductible={p.onAddTvaDeductible}
        onUpdateTvaDeductible={p.onUpdateTvaDeductible}
        onRemoveTvaDeductible={p.onRemoveTvaDeductible}
        totalTvaDeclareeDeductible={p.totalTvaDeclareeDeductible}
        totalTvaBalanceDeductible={p.totalTvaBalanceDeductible}
        ecartTvaDeductible={p.ecartTvaDeductible}
      />
      <Controle4SoldeTva
        tvaCollecteeLignes={p.tvaCollecteeLignes}
        tvaDeductibleLignes={p.tvaDeductibleLignes}
        totalTvaDeclareeCollectee={p.totalTvaDeclareeCollectee}
        totalTvaDeclareeDeductible={p.totalTvaDeclareeDeductible}
        total4431Balance={p.total4431Balance}
        total445Balance={p.total445Balance}
        tvaDueTheorique={p.tvaDueTheorique}
        tvaDueBalance={p.tvaDueBalance}
        creditTvaBalance={p.creditTvaBalance}
        soldeTvaTheorique={p.soldeTvaTheorique}
        creditTvaTheorique={p.creditTvaTheorique}
        ecartTvaDue={p.ecartTvaDue}
        ecartCreditTva={p.ecartCreditTva}
      />
      <Controle5AutresImpots
        autresImpotsLignes={p.autresImpotsLignes}
        onAddAutresImpots={p.onAddAutresImpots}
        onUpdateAutresImpots={p.onUpdateAutresImpots}
        onRemoveAutresImpots={p.onRemoveAutresImpots}
      />
      <Controle6Dettes
        dettesFiscalesLignes={p.dettesFiscalesLignes}
        onAddDettesFiscales={p.onAddDettesFiscales}
        onUpdateDettesFiscales={p.onUpdateDettesFiscales}
        onRemoveDettesFiscales={p.onRemoveDettesFiscales}
        totalDettesDeclare={p.totalDettesDeclare}
        totalDettesBalance={p.totalDettesBalance}
        totalDettesEcart={p.totalDettesEcart}
      />
      <Controle7Redressements
        redressementLignes={p.redressementLignes}
        onAddRedressement={p.onAddRedressement}
        onUpdateRedressement={p.onUpdateRedressement}
        onRemoveRedressement={p.onRemoveRedressement}
      />
    </>
  );
}

export default RevisionEtatTable;
